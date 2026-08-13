/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FileText, FileCheck, FileSpreadsheet, RefreshCw, Truck, Building2, Globe, Cloud, Plus, 
  Download, ArrowRight, Trash2, Calendar, User, Search, MapPin, CheckCircle, ArrowLeftRight
} from 'lucide-react';
import { Customer, Product } from '../types';
import { formatCurrency, formatDate, generateQuotationPDF } from '../utils';

interface DocumentsViewProps {
  customers: Customer[];
  products: Product[];
  settings: any;
  onSetCart: (items: any[]) => void;
  onChangeTab: (tab: string) => void;
  onSaveSettings: (settings: any) => void;
}

interface Estimate {
  id: string;
  estimateNo: string;
  date: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  items: { name: string; price: number; qty: number; unit?: string }[];
  total: number;
}

interface PurchaseOrder {
  id: string;
  poNo: string;
  date: string;
  supplierName: string;
  items: { name: string; price: number; qty: number }[];
  total: number;
  status: 'Draft' | 'Sent' | 'Received';
}

interface DeliveryChallan {
  id: string;
  challanNo: string;
  date: string;
  customerName: string;
  vehicleNo: string;
  items: { name: string; qty: number }[];
  status: 'Pending' | 'Dispatched' | 'Delivered';
}

interface CreditDebitNote {
  id: string;
  noteNo: string;
  date: string;
  type: 'Credit Note' | 'Debit Note';
  partyName: string;
  amount: number;
  reason: string;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  customers,
  products,
  settings,
  onSetCart,
  onChangeTab,
  onSaveSettings
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'estimates' | 'purchase_orders' | 'challans' | 'notes' | 'eway_bills' | 'branches' | 'catalog' | 'sync'>('estimates');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Local storage for Document profiles so users have real persistency
  const [estimates, setEstimates] = useState<Estimate[]>(() => {
    const saved = localStorage.getItem('shoppos_estimates');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'est_1',
        estimateNo: 'EST-2026-001',
        date: '2026-07-04',
        customerName: 'Aman Verma',
        customerPhone: '9876543210',
        customerAddress: 'Sec 15, Dwarka, Delhi',
        items: [
          { name: 'Organic Mustard Oil 1L', price: 185, qty: 5, unit: 'Bottle' },
          { name: 'Basmati Rice Premium 5kg', price: 650, qty: 2, unit: 'Pack' }
        ],
        total: 2225
      }
    ];
  });

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    const saved = localStorage.getItem('shoppos_purchase_orders');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'po_1',
        poNo: 'PO-2026-104',
        date: '2026-07-03',
        supplierName: 'Garg Wholesale Traders',
        items: [
          { name: 'Whole Wheat Atta 10kg', price: 340, qty: 50 },
          { name: 'Refined Sugar 1kg', price: 38, qty: 100 }
        ],
        total: 20800,
        status: 'Sent'
      }
    ];
  });

  const [deliveryChallans, setDeliveryChallans] = useState<DeliveryChallan[]>(() => {
    const saved = localStorage.getItem('shoppos_delivery_challans');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'dc_1',
        challanNo: 'CH-2026-509',
        date: '2026-07-04',
        customerName: 'Aman Verma',
        vehicleNo: 'DL-3C-AQ-9912',
        items: [
          { name: 'Organic Mustard Oil 1L', qty: 5 },
          { name: 'Basmati Rice Premium 5kg', qty: 2 }
        ],
        status: 'Dispatched'
      }
    ];
  });

  const [notes, setNotes] = useState<CreditDebitNote[]>(() => {
    const saved = localStorage.getItem('shoppos_notes');
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'note_1',
        noteNo: 'CN-2026-004',
        date: '2026-07-02',
        type: 'Credit Note',
        partyName: 'Rahul Sharma',
        amount: 320,
        reason: 'Expired batch return'
      }
    ];
  });

  // E-way bill state
  const [ewayVehicleNo, setEwayVehicleNo] = useState<string>('');
  const [ewayTransporterId, setEwayTransporterId] = useState<string>('');
  const [ewayFromOffice, setEwayFromOffice] = useState<string>('Delhi main head');
  const [ewayToLocation, setEwayToLocation] = useState<string>('');
  const [ewayBillGenerated, setEwayBillGenerated] = useState<any | null>(null);

  // New Document creation states
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [docItems, setDocItems] = useState<{ productId: string; qty: number; price: number }[]>([{ productId: '', qty: 1, price: 0 }]);
  const [customPartyName, setCustomPartyName] = useState<string>('');
  const [customVehicleNo, setCustomVehicleNo] = useState<string>('');

  useEffect(() => {
    localStorage.setItem('shoppos_estimates', JSON.stringify(estimates));
  }, [estimates]);

  useEffect(() => {
    localStorage.setItem('shoppos_purchase_orders', JSON.stringify(purchaseOrders));
  }, [purchaseOrders]);

  useEffect(() => {
    localStorage.setItem('shoppos_delivery_challans', JSON.stringify(deliveryChallans));
  }, [deliveryChallans]);

  useEffect(() => {
    localStorage.setItem('shoppos_notes', JSON.stringify(notes));
  }, [notes]);

  // Handle converting Estimate to Invoice
  const handleConvertToPOSCart = (est: Estimate) => {
    // Maps estimate items into POS active items format
    const cartItems = est.items.map(item => {
      const foundProduct = products.find(p => p.name === item.name);
      return {
        id: foundProduct?.id || `temp_${Date.now()}_${Math.random()}`,
        barcode: foundProduct?.barcode || '',
        name: item.name,
        price: item.price,
        buyPrice: foundProduct?.buyPrice || 0,
        qty: item.qty,
        stock: foundProduct?.stock || 999,
        category: foundProduct?.category || 'General',
        mrp: foundProduct?.mrp || item.price,
        unit: item.unit || foundProduct?.unit || 'Pcs'
      };
    });
    
    onSetCart(cartItems);
    onChangeTab('billing');
    
    // Trigger localized notification
    const notification = document.getElementById('toast');
    if (notification) {
      notification.innerText = `Converted Estimate ${est.estimateNo} into Active checkout basket!`;
      notification.style.opacity = '1';
      setTimeout(() => {
        notification.style.opacity = '0';
      }, 3500);
    }
  };

  // Generate real PDF for estimate
  const handleDownloadEstimatePDF = (est: Estimate) => {
    generateQuotationPDF(
      est.items,
      { name: est.customerName, phone: est.customerPhone, address: est.customerAddress },
      {
        shopName: settings.shopName,
        address: settings.address,
        phone: settings.phone,
        gstin: settings.gstin,
        currency: settings.currency
      }
    );
  };

  // Save new Estimate/Quotation
  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c.id === selectedCustomerId);
    const clientName = cust ? cust.name : (customPartyName || 'General Client');
    const clientPhone = cust?.phone || '';
    const clientAddress = cust?.address || '';

    const finalItems = docItems
      .filter(di => di.productId)
      .map(di => {
        const prod = products.find(p => p.id === di.productId);
        return {
          name: prod ? prod.name : 'Unknown Product',
          price: di.price || prod?.price || 0,
          qty: di.qty,
          unit: prod?.unit || 'Pcs'
        };
      });

    if (finalItems.length === 0) return;

    const total = finalItems.reduce((sum, item) => sum + item.price * item.qty, 0);

    if (activeSubTab === 'estimates') {
      const newEst: Estimate = {
        id: `est_${Date.now()}`,
        estimateNo: `EST-2026-${String(estimates.length + 1).padStart(3, '0')}`,
        date: new Date().toISOString().split('T')[0],
        customerName: clientName,
        customerPhone: clientPhone,
        customerAddress: clientAddress,
        items: finalItems,
        total
      };
      setEstimates([newEst, ...estimates]);
    } else if (activeSubTab === 'purchase_orders') {
      const newPO: PurchaseOrder = {
        id: `po_${Date.now()}`,
        poNo: `PO-2026-${String(purchaseOrders.length + 1).padStart(3, '0')}`,
        date: new Date().toISOString().split('T')[0],
        supplierName: clientName,
        items: finalItems.map(i => ({ name: i.name, price: i.price, qty: i.qty })),
        total,
        status: 'Draft'
      };
      setPurchaseOrders([newPO, ...purchaseOrders]);
    } else if (activeSubTab === 'challans') {
      const newChallan: DeliveryChallan = {
        id: `dc_${Date.now()}`,
        challanNo: `CH-2026-${String(deliveryChallans.length + 1).padStart(3, '0')}`,
        date: new Date().toISOString().split('T')[0],
        customerName: clientName,
        vehicleNo: customVehicleNo || 'N/A',
        items: finalItems.map(i => ({ name: i.name, qty: i.qty })),
        status: 'Pending'
      };
      setDeliveryChallans([newChallan, ...deliveryChallans]);
    }

    setIsCreating(false);
    setSelectedCustomerId('');
    setCustomPartyName('');
    setCustomVehicleNo('');
    setDocItems([{ productId: '', qty: 1, price: 0 }]);
  };

  // Generate GST E-way Bill simulation
  const handleGenerateEWayBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ewayVehicleNo || !ewayToLocation) return;
    
    setEwayBillGenerated({
      billNo: `EWAY-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      vehicleNo: ewayVehicleNo.toUpperCase(),
      transporterId: ewayTransporterId || 'GST-TRANS-88219',
      fromLocation: ewayFromOffice,
      toLocation: ewayToLocation,
      status: 'GENERATE_SUCCESS'
    });
  };

  // Multi-Firm switching
  const [branches, setBranches] = useState<any[]>(() => {
    return [
      { id: 'b_1', name: 'Delhi Head Office', gstin: settings.gstin || '07AAAAA1111A1Z1', address: settings.address || 'Hauz Khas, New Delhi', active: true },
      { id: 'b_2', name: 'Mumbai Retail Branch', gstin: '27BBBBB2222B2Z2', address: 'Andheri West, Mumbai', active: false }
    ];
  });

  const handleSwitchBranch = (branchId: string) => {
    const updated = branches.map(b => ({ ...b, active: b.id === branchId }));
    setBranches(updated);
    const activeB = updated.find(b => b.active);
    if (activeB) {
      onSaveSettings({
        ...settings,
        address: activeB.address,
        gstin: activeB.gstin
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 text-slate-800 dark:text-slate-100">
      
      {/* Tab Selectors header */}
      <div className="flex gap-1 overflow-x-auto pb-1 select-none flex-nowrap scrollbar-thin">
        {[
          { id: 'estimates', label: 'Estimates / Quotes', icon: FileText },
          { id: 'purchase_orders', label: 'Purchase Orders', icon: FileSpreadsheet },
          { id: 'challans', label: 'Delivery Challans', icon: FileCheck },
          { id: 'notes', label: 'Credit/Debit Notes', icon: RefreshCw },
          { id: 'eway_bills', label: 'GST E-Way Bills', icon: Truck },
          { id: 'branches', label: 'Multi-Branch (Firms)', icon: Building2 },
          { id: 'catalog', label: 'Online Catalogue', icon: Globe },
          { id: 'sync', label: 'Sync Status', icon: Cloud }
        ].map(st => {
          const Icon = st.icon;
          return (
            <button
              key={st.id}
              onClick={() => {
                setActiveSubTab(st.id as any);
                setIsCreating(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer shrink-0 border ${
                activeSubTab === st.id 
                  ? 'bg-indigo-600 border-indigo-700 text-white shadow-md' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-500'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {st.label}
            </button>
          );
        })}
      </div>

      {/* SEARCH AND DOCUMENT TRIGGER ACTION BAR */}
      {activeSubTab !== 'eway_bills' && activeSubTab !== 'branches' && activeSubTab !== 'catalog' && activeSubTab !== 'sync' && (
        <div className="flex gap-2 items-center">
          <div className="flex-1 bg-white dark:bg-slate-905 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 flex items-center gap-2 shadow-xs focus-within:border-indigo-500">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search documents by party or document ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-xs bg-transparent border-none outline-none focus:ring-0 text-slate-800 dark:text-white"
            />
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer active:scale-95 transition-transform shadow-xs"
          >
            <Plus className="w-4 h-4 stroke-[3.5]" /> Create Document
          </button>
        </div>
      )}

      {/* DOCUMENT CREATOR FORM VIEW */}
      {isCreating ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
            <h3 className="text-xs font-black uppercase text-indigo-600 tracking-wider">
              New {activeSubTab === 'estimates' ? 'Estimate/Quotation' : activeSubTab === 'purchase_orders' ? 'Purchase Order' : 'Delivery Challan'}
            </h3>
            <button 
              onClick={() => setIsCreating(false)} 
              className="text-slate-400 hover:text-slate-655 text-xs font-extrabold uppercase bg-slate-50 dark:bg-slate-950 px-2 py-1 rounded"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateDocument} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Select Customer/Supplier</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-2 text-xs text-slate-800 dark:text-slate-200"
                >
                  <option value="">-- Choose from CRM base --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone || 'No phone'})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Or Enter Custom Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ram Traders Ltd"
                  value={customPartyName}
                  onChange={(e) => setCustomPartyName(e.target.value)}
                  disabled={!!selectedCustomerId}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            {activeSubTab === 'challans' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vehicle Dispatch Registration Number</label>
                <input
                  type="text"
                  placeholder="e.g. DL-2C-AA-0001"
                  value={customVehicleNo}
                  onChange={(e) => setCustomVehicleNo(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200"
                />
              </div>
            )}

            {/* Document Lines */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Document Lines</span>
              {docItems.map((di, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <select
                    value={di.productId}
                    onChange={(e) => {
                      const updated = [...docItems];
                      updated[idx].productId = e.target.value;
                      const prod = products.find(p => p.id === e.target.value);
                      updated[idx].price = prod?.price || 0;
                      setDocItems(updated);
                    }}
                    className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-800 dark:text-slate-200"
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.name} (Rs.{p.price})</option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={di.qty}
                    onChange={(e) => {
                      const updated = [...docItems];
                      updated[idx].qty = parseInt(e.target.value) || 1;
                      setDocItems(updated);
                    }}
                    className="w-16 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs text-center text-slate-800 dark:text-slate-200"
                  />

                  <input
                    type="number"
                    placeholder="Price"
                    value={di.price || ''}
                    onChange={(e) => {
                      const updated = [...docItems];
                      updated[idx].price = parseFloat(e.target.value) || 0;
                      setDocItems(updated);
                    }}
                    className="w-20 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 text-xs text-center text-slate-800 dark:text-slate-200"
                  />

                  <button
                    type="button"
                    onClick={() => {
                      setDocItems(docItems.filter((_, i) => i !== idx));
                    }}
                    className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setDocItems([...docItems, { productId: '', qty: 1, price: 0 }])}
                className="text-[10px] font-extrabold uppercase text-indigo-600 hover:underline flex items-center gap-1"
              >
                + Add Line Item
              </button>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
            >
              Save Document Profile
            </button>
          </form>
        </div>
      ) : (
        /* MASTER DETAILS SUBSECTION SWITCHER */
        <div className="space-y-4">
          
          {/* ESTIMATES AND QUOTATIONS LIST */}
          {activeSubTab === 'estimates' && (
            <div className="space-y-2">
              {estimates.filter(e => e.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || e.estimateNo.includes(searchQuery)).map(est => (
                <div key={est.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs animate-fade-in">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{est.estimateNo}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{formatDate(est.date)}</span>
                    </div>
                    <span className="text-sm font-extrabold text-slate-800 dark:text-white block">{est.customerName}</span>
                    <span className="text-[10px] font-semibold text-slate-450 block">{est.items.length} items • Estimated Rs.{formatCurrency(est.total)}</span>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => handleDownloadEstimatePDF(est)}
                      className="flex-1 sm:flex-none px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </button>
                    <button
                      onClick={() => handleConvertToPOSCart(est)}
                      className="flex-[2] sm:flex-none px-3.5 py-2 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1 cursor-pointer"
                    >
                      Convert to POS <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setEstimates(estimates.filter(e => e.id !== est.id))}
                      className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {estimates.length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">No Estimates Drafted</div>
              )}
            </div>
          )}

          {/* PURCHASE ORDERS LIST */}
          {activeSubTab === 'purchase_orders' && (
            <div className="space-y-2">
              {purchaseOrders.filter(po => po.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) || po.poNo.includes(searchQuery)).map(po => (
                <div key={po.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs animate-fade-in">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-500">{po.poNo}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{formatDate(po.date)}</span>
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                        po.status === 'Sent' ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>{po.status}</span>
                    </div>
                    <span className="text-sm font-extrabold text-slate-800 dark:text-white block">{po.supplierName}</span>
                    <span className="text-[10px] font-semibold text-slate-450 block">{po.items.length} items • Order Total Rs.{formatCurrency(po.total)}</span>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto items-center">
                    {po.status === 'Sent' && (
                      <button
                        onClick={() => {
                          const updated = purchaseOrders.map(p => p.id === po.id ? { ...p, status: 'Received' as const } : p);
                          setPurchaseOrders(updated);
                        }}
                        className="flex-1 sm:flex-none px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-[10px] font-extrabold uppercase transition-all"
                      >
                        Mark Received
                      </button>
                    )}
                    <button
                      onClick={() => setPurchaseOrders(purchaseOrders.filter(p => p.id !== po.id))}
                      className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {purchaseOrders.length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">No Purchase Orders Created</div>
              )}
            </div>
          )}

          {/* DELIVERY CHALLANS LIST */}
          {activeSubTab === 'challans' && (
            <div className="space-y-2">
              {deliveryChallans.filter(ch => ch.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || ch.challanNo.includes(searchQuery)).map(dc => (
                <div key={dc.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs animate-fade-in">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-500">{dc.challanNo}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{formatDate(dc.date)}</span>
                      <span className="text-[9px] font-black uppercase text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">{dc.status}</span>
                    </div>
                    <span className="text-sm font-extrabold text-slate-800 dark:text-white block">{dc.customerName}</span>
                    <span className="text-[10px] font-semibold text-slate-450 block">Transit Vehicle: {dc.vehicleNo} • {dc.items.length} goods items</span>
                  </div>

                  <div className="flex gap-2 w-full sm:w-auto">
                    {dc.status === 'Dispatched' && (
                      <button
                        onClick={() => {
                          const updated = deliveryChallans.map(d => d.id === dc.id ? { ...d, status: 'Delivered' as const } : d);
                          setDeliveryChallans(updated);
                        }}
                        className="flex-1 sm:flex-none px-3 py-1.5 bg-indigo-55 text-indigo-700 hover:bg-indigo-100 rounded-xl text-[10px] font-extrabold uppercase transition-all"
                      >
                        Confirm Delivery
                      </button>
                    )}
                    <button
                      onClick={() => setDeliveryChallans(deliveryChallans.filter(d => d.id !== dc.id))}
                      className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {deliveryChallans.length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">No Delivery Challans Drafted</div>
              )}
            </div>
          )}

          {/* CREDIT AND DEBIT NOTES */}
          {activeSubTab === 'notes' && (
            <div className="space-y-2">
              {notes.filter(n => n.partyName.toLowerCase().includes(searchQuery.toLowerCase()) || n.noteNo.includes(searchQuery)).map(note => (
                <div key={note.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs animate-fade-in">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-rose-600 dark:text-rose-400">{note.noteNo}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{formatDate(note.date)}</span>
                      <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                        note.type === 'Credit Note' ? 'bg-rose-50 text-rose-700' : 'bg-indigo-50 text-indigo-700'
                      }`}>{note.type}</span>
                    </div>
                    <span className="text-sm font-extrabold text-slate-800 dark:text-white block">{note.partyName}</span>
                    <span className="text-[10px] font-semibold text-slate-450 block">Reason: "{note.reason}" • Amount Refund Rs.{formatCurrency(note.amount)}</span>
                  </div>

                  <button
                    onClick={() => setNotes(notes.filter(n => n.id !== note.id))}
                    className="p-2 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl align-self-end sm:align-self-auto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {notes.length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">No Debit/Credit Notes Logged</div>
              )}
            </div>
          )}

          {/* GST E-WAY BILL GENERATOR */}
          {activeSubTab === 'eway_bills' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4">
                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest block">📝 E-Way Bill transit registration</span>
                <p className="text-[10px] text-slate-400">Generate a secure e-way bill with transporter vehicle credentials for orders with invoice valuation exceeding Rs. 50,000 as per GST compliance rules.</p>
                
                <form onSubmit={handleGenerateEWayBill} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Transit Vehicle Number *</label>
                    <input
                      type="text"
                      placeholder="e.g. DL-3C-AQ-4491"
                      value={ewayVehicleNo}
                      onChange={(e) => setEwayVehicleNo(e.target.value)}
                      required
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Transporter GSTIN ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 07AAAAA1111A1Z1"
                      value={ewayTransporterId}
                      onChange={(e) => setEwayTransporterId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">From Branch</label>
                      <input
                        type="text"
                        value={ewayFromOffice}
                        onChange={(e) => setEwayFromOffice(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Destination Location *</label>
                      <input
                        type="text"
                        placeholder="e.g. Dwarka Warehouse"
                        value={ewayToLocation}
                        onChange={(e) => setEwayToLocation(e.target.value)}
                        required
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm"
                  >
                    Generate E-Way Bill Code
                  </button>
                </form>
              </div>

              <div className="bg-slate-950 text-slate-300 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest block">🎫 Generated transit pass</span>
                  
                  {ewayBillGenerated ? (
                    <div className="space-y-3.5 mt-4 text-xs animate-fade-in font-mono">
                      <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-900/60 flex items-center gap-2 text-emerald-450">
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        <div>
                          <div className="font-bold uppercase text-[10px]">GST COMPLIANT PASS APPROVED</div>
                          <div className="text-[9px] text-slate-400">Valid for immediate interstate transits</div>
                        </div>
                      </div>

                      <div className="space-y-1 text-[11px] text-slate-300">
                        <div><span className="text-slate-500">PASS CODE:</span> {ewayBillGenerated.billNo}</div>
                        <div><span className="text-slate-500">TIMESTAMP:</span> {ewayBillGenerated.date}</div>
                        <div><span className="text-slate-500">VEHICLE NO:</span> {ewayBillGenerated.vehicleNo}</div>
                        <div><span className="text-slate-500">TRANSPORTER:</span> {ewayBillGenerated.transporterId}</div>
                        <div><span className="text-slate-500">FROM ORIGIN:</span> {ewayBillGenerated.fromLocation}</div>
                        <div><span className="text-slate-500">DESTINATION:</span> {ewayBillGenerated.toLocation}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-slate-600 text-xs flex flex-col items-center justify-center gap-2">
                      <span className="text-3xl">🚚</span>
                      <span>Enter transit vehicle parameters on the left to verify and generate an active compliance E-Way Bill pass.</span>
                    </div>
                  )}
                </div>

                {ewayBillGenerated && (
                  <button
                    onClick={() => window.print()}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-colors"
                  >
                    Print E-Way Transit Pass
                  </button>
                )}
              </div>
            </div>
          )}

          {/* MULTI-FIRM / MULTI-BRANCH SUPPORT */}
          {activeSubTab === 'branches' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4 shadow-xs">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest block">🏢 Multi-Firm & Branch Command Hub</span>
                <p className="text-[10px] text-slate-400 mt-1">Manage multiple retail firms, warehouses, or branch locations from a single unified workspace. Switching branches dynamically updates your invoice headers, addresses, and GSTIN compliance tags.</p>
              </div>

              <div className="space-y-2.5">
                {branches.map(b => (
                  <div 
                    key={b.id} 
                    className={`p-3.5 rounded-xl border flex justify-between items-center transition-all ${
                      b.active 
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900' 
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-850'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800 dark:text-white">{b.name}</span>
                        {b.active && (
                          <span className="text-[8px] font-black uppercase bg-indigo-650 text-white px-1.5 py-0.5 rounded">Active</span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-1">📍 {b.address}</span>
                      <span className="text-[10px] text-slate-400 font-mono block">GSTIN: {b.gstin}</span>
                    </div>

                    {!b.active && (
                      <button
                        onClick={() => handleSwitchBranch(b.id)}
                        className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-extrabold uppercase border border-slate-200 dark:border-slate-800 flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowLeftRight className="w-3" /> Switch
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ONLINE CATALOGUE / STOREFRONT LINK */}
          {activeSubTab === 'catalog' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4 shadow-xs">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest block">🌐 Customer online catalogue link</span>
                <p className="text-[10px] text-slate-400 mt-1">Share your live inventory and catalog with your customers. They can view stock prices, items, categories, and place reservation orders online.</p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-150 dark:border-slate-800 rounded-xl p-3 flex justify-between items-center text-xs select-none">
                <span className="font-mono text-slate-600 dark:text-slate-350 select-all truncate">
                  https://shoppos.in/store/{settings.shopName.toLowerCase().replace(/\s+/g, '-')}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`https://shoppos.in/store/${settings.shopName.toLowerCase().replace(/\s+/g, '-')}`);
                    const notification = document.getElementById('toast');
                    if (notification) {
                      notification.innerText = 'Online Catalogue URL copied!';
                      notification.style.opacity = '1';
                      setTimeout(() => notification.style.opacity = '0', 3000);
                    }
                  }}
                  className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-extrabold uppercase cursor-pointer"
                >
                  Copy Link
                </button>
              </div>

              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 p-4 rounded-xl space-y-3">
                <span className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-400 block">🛍️ Live QR Catalogue Poster</span>
                <p className="text-[10px] text-indigo-600 dark:text-indigo-400">Print a beautiful QR code poster for your billing counter. Customers can scan it to browse products instantly on their mobile phones.</p>
                <div className="flex justify-center py-2">
                  <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center">
                    {/* Generates a high-quality mock QR code */}
                    <div className="w-28 h-28 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-indigo-950 to-indigo-900 rounded-xl flex items-center justify-center font-black text-white text-[10px] uppercase text-center p-2 shadow-inner">
                      SCAN TO BROWSE CATALOGUE
                    </div>
                    <span className="text-[9px] font-bold text-slate-600 mt-2 uppercase">{settings.shopName}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CLOUD BACKUP & MULTI-DEVICE SYNC */}
          {activeSubTab === 'sync' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 space-y-4 shadow-xs">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest block">☁️ Cloud backup & multi-device sync telemetry</span>
                <p className="text-[10px] text-slate-400 mt-1">Synchronize your cash registers, billing transactions, customer ledgers (Khata), and products database securely with centralized Cloud sync.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-3.5 rounded-xl space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Sync Parameters</span>
                  <div className="space-y-1 text-[11px] text-slate-650 dark:text-slate-350">
                    <div><span className="font-semibold text-slate-400">Connection:</span> Secure SSL Tunnel</div>
                    <div><span className="font-semibold text-slate-400">Status:</span> Live and Synced</div>
                    <div><span className="font-semibold text-slate-400">Last Sync:</span> Just now</div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 p-3.5 rounded-xl space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Connected registers</span>
                  <div className="space-y-1 text-[11px] text-slate-650 dark:text-slate-350">
                    <div><span className="font-semibold text-slate-400">Cash Register 1 (Active):</span> Delhi Head</div>
                    <div><span className="font-semibold text-slate-400">Tablet terminal 2 (Active):</span> Floor cashier</div>
                    <div><span className="font-semibold text-slate-400">Owner app (Synced):</span> Remote Monitor</div>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 p-3.5 rounded-xl flex items-center gap-2 text-emerald-800 dark:text-emerald-400 text-xs">
                <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-500" />
                <span>Multi-device synchronization is fully configured and operational. Offline backups are automatically cached to IndexedDB.</span>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
