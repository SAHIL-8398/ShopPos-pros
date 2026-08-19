/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  FileText, FileCheck, FileSpreadsheet, RefreshCw, Truck, Building2, Globe, Cloud, Plus, 
  Download, ArrowRight, Trash2, Calendar, User, Search, MapPin, CheckCircle, ArrowLeftRight,
  Printer, Share2, FileDown, MessageCircle, Edit2, Copy, X, Check, Phone, Mail, AlertCircle
} from 'lucide-react';
import { Customer, Product } from '../types';
import { 
  formatCurrency, 
  formatDate, 
  generateQuotationPDF, 
  generateDeliveryChallanPDF, 
  generateEWayBillPDF, 
  generatePurchaseOrderPDF, 
  generateCreditDebitNotePDF, 
  copyToClipboard 
} from '../utils';
import { printPdfDocument, sharePdfDocument } from '../services/printService';
import { useDialog } from '../context/DialogContext';

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

interface EWayBillRecord {
  id: string;
  billNo: string;
  date: string;
  vehicleNo: string;
  transporterId: string;
  fromLocation: string;
  toLocation: string;
  status: string;
}

interface BranchItem {
  id: string;
  name: string;
  legalName?: string;
  gstin: string;
  address: string;
  phone?: string;
  email?: string;
  state?: string;
  active: boolean;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  customers,
  products,
  settings,
  onSetCart,
  onChangeTab,
  onSaveSettings
}) => {
  const { showAlert, showConfirm } = useDialog();
  const [activeSubTab, setActiveSubTab] = useState<'estimates' | 'purchase_orders' | 'challans' | 'notes' | 'eway_bills' | 'branches' | 'catalog' | 'sync'>('estimates');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Estimates
  const [estimates, setEstimates] = useState<Estimate[]>(() => {
    const saved = localStorage.getItem('shoppos_estimates');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
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

  // 2. Purchase Orders
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    const saved = localStorage.getItem('shoppos_purchase_orders');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
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

  // 3. Delivery Challans
  const [deliveryChallans, setDeliveryChallans] = useState<DeliveryChallan[]>(() => {
    const saved = localStorage.getItem('shoppos_delivery_challans');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
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

  // 4. Credit / Debit Notes
  const [notes, setNotes] = useState<CreditDebitNote[]>(() => {
    const saved = localStorage.getItem('shoppos_notes');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [
      {
        id: 'note_1',
        noteNo: 'CN-2026-004',
        date: '2026-07-02',
        type: 'Credit Note',
        partyName: 'Rahul Sharma',
        amount: 320,
        reason: 'Expired batch return refund'
      }
    ];
  });

  // 5. E-Way Bills & History
  const [ewayBills, setEwayBills] = useState<EWayBillRecord[]>(() => {
    const saved = localStorage.getItem('shoppos_eway_bills');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [
      {
        id: 'eway_1',
        billNo: 'EWAY-884920194812',
        date: '2026-07-04 14:30',
        vehicleNo: 'DL-3C-AQ-4491',
        transporterId: 'GST-TRANS-88219',
        fromLocation: 'Delhi Main Office',
        toLocation: 'Dwarka Central Logistics',
        status: 'ACTIVE'
      }
    ];
  });

  const [ewayVehicleNo, setEwayVehicleNo] = useState<string>('');
  const [ewayTransporterId, setEwayTransporterId] = useState<string>('');
  const [ewayFromOffice, setEwayFromOffice] = useState<string>('Delhi Main Head Office');
  const [ewayToLocation, setEwayToLocation] = useState<string>('');
  const [ewayBillGenerated, setEwayBillGenerated] = useState<EWayBillRecord | null>(null);

  // 6. Multi-Firm / Multi-Branch
  const [branches, setBranches] = useState<BranchItem[]>(() => {
    const saved = localStorage.getItem('shoppos_branches');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [
      { 
        id: 'b_1', 
        name: 'Delhi Head Office', 
        legalName: settings.shopName || 'ShopPOS Retail Enterprises Ltd',
        gstin: settings.gstin || '07AAAAA1111A1Z1', 
        address: settings.address || 'Hauz Khas, New Delhi',
        phone: settings.phone || '9876543210',
        email: 'delhi@shoppos.in',
        state: 'Delhi (07)',
        active: true 
      },
      { 
        id: 'b_2', 
        name: 'Mumbai Retail Branch', 
        legalName: 'ShopPOS Western Logistics LLP',
        gstin: '27BBBBB2222B2Z2', 
        address: 'Andheri West, Mumbai, Maharashtra', 
        phone: '9822334455',
        email: 'mumbai@shoppos.in',
        state: 'Maharashtra (27)',
        active: false 
      }
    ];
  });

  const [editingBranch, setEditingBranch] = useState<BranchItem | null>(null);
  const [isAddingBranch, setIsAddingBranch] = useState<boolean>(false);
  const [branchForm, setBranchForm] = useState<Partial<BranchItem>>({
    name: '',
    legalName: '',
    gstin: '',
    address: '',
    phone: '',
    email: '',
    state: ''
  });

  // Creation State for Documents
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [docItems, setDocItems] = useState<{ productId: string; qty: number; price: number }[]>([{ productId: '', qty: 1, price: 0 }]);
  const [customPartyName, setCustomPartyName] = useState<string>('');
  const [customVehicleNo, setCustomVehicleNo] = useState<string>('');
  
  // Creation state for Credit / Debit Note
  const [noteType, setNoteType] = useState<'Credit Note' | 'Debit Note'>('Credit Note');
  const [noteAmount, setNoteAmount] = useState<number | ''>('');
  const [noteReason, setNoteReason] = useState<string>('');

  // Persist storage
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

  useEffect(() => {
    localStorage.setItem('shoppos_eway_bills', JSON.stringify(ewayBills));
  }, [ewayBills]);

  useEffect(() => {
    localStorage.setItem('shoppos_branches', JSON.stringify(branches));
  }, [branches]);

  // Convert Estimate to POS Cart
  const handleConvertToPOSCart = (est: Estimate) => {
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
    showAlert(`Converted Estimate "${est.estimateNo}" into active checkout basket!`, 'Estimate Loaded');
  };

  // 1. Estimate PDF Actions
  const handlePrintEstimate = async (est: Estimate) => {
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

  // 2. Purchase Order PDF Actions
  const handlePrintPO = async (po: PurchaseOrder) => {
    const res = generatePurchaseOrderPDF(po, {
      shopName: settings.shopName,
      address: settings.address,
      phone: settings.phone,
      gstin: settings.gstin,
      currency: settings.currency
    });
    await printPdfDocument(res.base64, res.filename);
  };

  const handleSharePO = async (po: PurchaseOrder) => {
    const res = generatePurchaseOrderPDF(po, {
      shopName: settings.shopName,
      address: settings.address,
      phone: settings.phone,
      gstin: settings.gstin,
      currency: settings.currency
    });
    await sharePdfDocument({
      pdfBase64: res.base64,
      filename: res.filename,
      title: `Purchase Order #${po.poNo}`,
      text: `Attached is Purchase Order #${po.poNo} for ${po.supplierName}. Total: Rs.${formatCurrency(po.total)}.`,
      subfolder: 'Invoices'
    });
  };

  // 3. Delivery Challan PDF Actions
  const handlePrintChallan = async (dc: DeliveryChallan) => {
    generateDeliveryChallanPDF(
      dc.items,
      { name: dc.customerName, phone: '', address: '' },
      {
        shopName: settings.shopName,
        address: settings.address,
        phone: settings.phone,
        currency: settings.currency
      }
    );
  };

  // 4. Note PDF Actions
  const handlePrintNote = async (n: CreditDebitNote) => {
    const res = generateCreditDebitNotePDF(n, {
      shopName: settings.shopName,
      address: settings.address,
      phone: settings.phone,
      gstin: settings.gstin,
      currency: settings.currency
    });
    await printPdfDocument(res.base64, res.filename);
  };

  const handleShareNote = async (n: CreditDebitNote) => {
    const res = generateCreditDebitNotePDF(n, {
      shopName: settings.shopName,
      address: settings.address,
      phone: settings.phone,
      gstin: settings.gstin,
      currency: settings.currency
    });
    await sharePdfDocument({
      pdfBase64: res.base64,
      filename: res.filename,
      title: `${n.type} #${n.noteNo}`,
      text: `Attached is ${n.type} #${n.noteNo} for ${n.partyName}. Adjusted Amount: Rs.${formatCurrency(n.amount)}.`,
      subfolder: 'Invoices'
    });
  };

  // Handle Document Creation Submit
  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();

    if (activeSubTab === 'notes') {
      if (!customPartyName.trim()) {
        showAlert('Party / Customer Name is required for Credit/Debit Note!', 'Missing Party');
        return;
      }
      if (!noteAmount || noteAmount <= 0) {
        showAlert('Please enter a valid adjustment amount!', 'Invalid Amount');
        return;
      }

      const prefix = noteType === 'Credit Note' ? 'CN' : 'DN';
      const newNote: CreditDebitNote = {
        id: `note_${Date.now()}`,
        noteNo: `${prefix}-2026-${String(notes.length + 1).padStart(3, '0')}`,
        date: new Date().toISOString().split('T')[0],
        type: noteType,
        partyName: customPartyName.trim(),
        amount: Number(noteAmount),
        reason: noteReason || 'Account adjustment / Goods return'
      };

      setNotes([newNote, ...notes]);
      setIsCreating(false);
      setCustomPartyName('');
      setNoteAmount('');
      setNoteReason('');
      showAlert(`Created ${newNote.type} #${newNote.noteNo} successfully!`, 'Note Saved');
      return;
    }

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

    if (finalItems.length === 0) {
      showAlert('Please add at least one line item with a product selected!', 'Empty Items');
      return;
    }

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
      showAlert(`Created Estimate #${newEst.estimateNo} successfully!`, 'Estimate Saved');
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
      showAlert(`Created Purchase Order #${newPO.poNo} successfully!`, 'PO Saved');
    } else if (activeSubTab === 'challans') {
      const newChallan: DeliveryChallan = {
        id: `dc_${Date.now()}`,
        challanNo: `CH-2026-${String(deliveryChallans.length + 1).padStart(3, '0')}`,
        date: new Date().toISOString().split('T')[0],
        customerName: clientName,
        vehicleNo: customVehicleNo || 'DL-2C-AA-0001',
        items: finalItems.map(i => ({ name: i.name, qty: i.qty })),
        status: 'Pending'
      };
      setDeliveryChallans([newChallan, ...deliveryChallans]);
      showAlert(`Created Delivery Challan #${newChallan.challanNo} successfully!`, 'Challan Saved');
    }

    setIsCreating(false);
    setSelectedCustomerId('');
    setCustomPartyName('');
    setCustomVehicleNo('');
    setDocItems([{ productId: '', qty: 1, price: 0 }]);
  };

  // Generate GST E-Way Bill
  const handleGenerateEWayBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ewayVehicleNo.trim() || !ewayToLocation.trim()) {
      showAlert('Vehicle Number and Destination Location are required!', 'Missing Field');
      return;
    }
    
    const newBill: EWayBillRecord = {
      id: `eway_${Date.now()}`,
      billNo: `EWAY-${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      date: new Date().toISOString().replace('T', ' ').slice(0, 16),
      vehicleNo: ewayVehicleNo.trim().toUpperCase(),
      transporterId: ewayTransporterId.trim() || 'GST-TRANS-88219',
      fromLocation: ewayFromOffice.trim() || settings.shopName || 'Retail Head Office',
      toLocation: ewayToLocation.trim(),
      status: 'ACTIVE'
    };

    setEwayBillGenerated(newBill);
    setEwayBills([newBill, ...ewayBills]);
    showAlert(`Generated E-Way Bill Pass #${newBill.billNo} successfully!`, 'Pass Generated');
  };

  // Multi-Firm & Branch Actions
  const handleSwitchBranch = (branchId: string) => {
    const updated = branches.map(b => ({ ...b, active: b.id === branchId }));
    setBranches(updated);
    const activeB = updated.find(b => b.active);
    if (activeB) {
      onSaveSettings({
        ...settings,
        shopName: activeB.legalName || activeB.name,
        address: activeB.address,
        gstin: activeB.gstin,
        phone: activeB.phone || settings.phone
      });
      showAlert(`Switched active firm/branch to "${activeB.name}". Billing headers updated.`, 'Branch Switched');
    }
  };

  const handleOpenEditBranch = (branch: BranchItem) => {
    setEditingBranch(branch);
    setBranchForm({
      name: branch.name,
      legalName: branch.legalName || branch.name,
      gstin: branch.gstin,
      address: branch.address,
      phone: branch.phone || '',
      email: branch.email || '',
      state: branch.state || ''
    });
    setIsAddingBranch(false);
  };

  const handleOpenAddBranch = () => {
    setEditingBranch(null);
    setBranchForm({
      name: '',
      legalName: '',
      gstin: '',
      address: '',
      phone: '',
      email: '',
      state: ''
    });
    setIsAddingBranch(true);
  };

  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.name?.trim()) {
      showAlert('Branch / Firm Name is required!', 'Missing Field');
      return;
    }
    if (!branchForm.gstin?.trim()) {
      showAlert('GSTIN ID is required for firm compliance!', 'Missing Field');
      return;
    }

    if (editingBranch) {
      // Edit existing
      const updated = branches.map(b => {
        if (b.id === editingBranch.id) {
          return {
            ...b,
            name: branchForm.name!.trim(),
            legalName: branchForm.legalName?.trim() || branchForm.name!.trim(),
            gstin: branchForm.gstin!.trim().toUpperCase(),
            address: branchForm.address?.trim() || b.address,
            phone: branchForm.phone?.trim() || b.phone,
            email: branchForm.email?.trim() || b.email,
            state: branchForm.state?.trim() || b.state
          };
        }
        return b;
      });

      setBranches(updated);
      const activeB = updated.find(b => b.active);
      if (activeB && activeB.id === editingBranch.id) {
        onSaveSettings({
          ...settings,
          shopName: activeB.legalName || activeB.name,
          address: activeB.address,
          gstin: activeB.gstin,
          phone: activeB.phone || settings.phone
        });
      }
      setEditingBranch(null);
      showAlert(`Updated firm/branch "${branchForm.name}" successfully!`, 'Branch Updated');
    } else if (isAddingBranch) {
      // Add new
      const newBranch: BranchItem = {
        id: `branch_${Date.now()}`,
        name: branchForm.name!.trim(),
        legalName: branchForm.legalName?.trim() || branchForm.name!.trim(),
        gstin: branchForm.gstin!.trim().toUpperCase(),
        address: branchForm.address?.trim() || 'New Store Address',
        phone: branchForm.phone?.trim() || '',
        email: branchForm.email?.trim() || '',
        state: branchForm.state?.trim() || '',
        active: branches.length === 0
      };

      setBranches([...branches, newBranch]);
      setIsAddingBranch(false);
      showAlert(`Added new firm/branch "${newBranch.name}" successfully!`, 'Branch Added');
    }
  };

  const handleDeleteBranch = async (branchId: string) => {
    const target = branches.find(b => b.id === branchId);
    if (!target) return;

    if (target.active && branches.length > 1) {
      showAlert('Cannot delete the currently active branch. Please switch to another branch first.', 'Active Branch');
      return;
    }
    if (branches.length <= 1) {
      showAlert('At least one firm/branch must remain configured.', 'Action Prohibited');
      return;
    }

    const confirmed = await showConfirm(`Are you sure you want to delete branch "${target.name}"?`, 'Confirm Delete');
    if (confirmed) {
      setBranches(branches.filter(b => b.id !== branchId));
      showAlert(`Deleted branch "${target.name}".`, 'Branch Removed');
    }
  };

  return (
    <div className="flex flex-col gap-4 text-slate-800 dark:text-slate-100">
      
      {/* Sub-Tab Selectors Header */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 select-none flex-nowrap scrollbar-thin">
        {[
          { id: 'estimates', label: 'Estimates / Quotes', icon: FileText, count: estimates.length },
          { id: 'purchase_orders', label: 'Purchase Orders', icon: FileSpreadsheet, count: purchaseOrders.length },
          { id: 'challans', label: 'Delivery Challans', icon: FileCheck, count: deliveryChallans.length },
          { id: 'notes', label: 'Credit/Debit Notes', icon: RefreshCw, count: notes.length },
          { id: 'eway_bills', label: 'GST E-Way Bills', icon: Truck, count: ewayBills.length },
          { id: 'branches', label: 'Multi-Branch (Firms)', icon: Building2, count: branches.length },
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
                setEditingBranch(null);
                setIsAddingBranch(false);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-[10px] font-extrabold uppercase tracking-wider transition-all whitespace-nowrap cursor-pointer shrink-0 border shadow-xs ${
                activeSubTab === st.id 
                  ? 'bg-indigo-600 border-indigo-700 text-white shadow-md' 
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{st.label}</span>
              {st.count !== undefined && (
                <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-mono ${
                  activeSubTab === st.id ? 'bg-indigo-800 text-indigo-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}>
                  {st.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SEARCH AND DOCUMENT TRIGGER ACTION BAR */}
      {activeSubTab !== 'eway_bills' && activeSubTab !== 'branches' && activeSubTab !== 'catalog' && activeSubTab !== 'sync' && (
        <div className="flex gap-2 items-center">
          <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 flex items-center gap-2 shadow-xs focus-within:border-indigo-500">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search documents by customer, vendor, or doc reference number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 text-xs bg-transparent border-none outline-none focus:ring-0 text-slate-800 dark:text-white"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 text-xs">
                ✕
              </button>
            )}
          </div>
          <button
            onClick={() => {
              setIsCreating(true);
              setDocItems([{ productId: '', qty: 1, price: 0 }]);
            }}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer active:scale-95 transition-transform shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Create {activeSubTab === 'estimates' ? 'Estimate' : activeSubTab === 'purchase_orders' ? 'PO' : activeSubTab === 'challans' ? 'Challan' : 'Note'}</span>
          </button>
        </div>
      )}

      {/* DOCUMENT CREATOR FORM VIEW */}
      {isCreating ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm animate-fade-in">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New {activeSubTab === 'estimates' ? 'Estimate / Quotation' : activeSubTab === 'purchase_orders' ? 'Purchase Order' : activeSubTab === 'challans' ? 'Delivery Challan' : 'Credit / Debit Note'}
            </h3>
            <button 
              onClick={() => setIsCreating(false)} 
              className="text-slate-400 hover:text-slate-600 text-xs font-extrabold uppercase bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg"
            >
              Cancel
            </button>
          </div>

          <form onSubmit={handleCreateDocument} className="space-y-4 text-xs">
            {/* Form Fields For Credit/Debit Notes */}
            {activeSubTab === 'notes' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Note Nature *</label>
                    <select
                      value={noteType}
                      onChange={(e) => setNoteType(e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                    >
                      <option value="Credit Note">Credit Note (Customer Return / Refund)</option>
                      <option value="Debit Note">Debit Note (Supplier Return / Rate Adjustment)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Party / Customer / Vendor Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Rahul Sharma"
                      value={customPartyName}
                      onChange={(e) => setCustomPartyName(e.target.value)}
                      required
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Adjustment Amount (Rs.) *</label>
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      value={noteAmount}
                      onChange={(e) => setNoteAmount(e.target.value ? parseFloat(e.target.value) : '')}
                      required
                      min="1"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Reason for Adjustment</label>
                  <input
                    type="text"
                    placeholder="e.g. Expired batch item refund, damaged carton return, rate discrepancy"
                    value={noteReason}
                    onChange={(e) => setNoteReason(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                  />
                </div>
              </div>
            ) : (
              /* Form Fields For Estimates, POs, and Challans */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      {activeSubTab === 'purchase_orders' ? 'Select Supplier / Vendor' : 'Select Customer (CRM)'}
                    </label>
                    <select
                      value={selectedCustomerId}
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                    >
                      <option value="">-- Choose from saved records --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.phone || 'No phone'})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Or Enter Custom Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Ram Wholesale Traders"
                      value={customPartyName}
                      onChange={(e) => setCustomPartyName(e.target.value)}
                      disabled={!!selectedCustomerId}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>
                </div>

                {activeSubTab === 'challans' && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Vehicle Dispatch Registration Number *</label>
                    <input
                      type="text"
                      placeholder="e.g. DL-2C-AA-0001"
                      value={customVehicleNo}
                      onChange={(e) => setCustomVehicleNo(e.target.value)}
                      required
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                    />
                  </div>
                )}

                {/* Line Items List */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Document Line Items</span>
                    <button
                      type="button"
                      onClick={() => setDocItems([...docItems, { productId: '', qty: 1, price: 0 }])}
                      className="text-[10px] font-extrabold uppercase text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                    >
                      + Add Item Row
                    </button>
                  </div>

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
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
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
                        className="w-18 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2 text-xs text-center text-slate-800 dark:text-slate-200 outline-none font-bold"
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
                        className="w-24 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2 py-2 text-xs text-center text-slate-800 dark:text-slate-200 outline-none font-bold"
                      />

                      {docItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setDocItems(docItems.filter((_, i) => i !== idx))}
                          className="p-2 bg-slate-50 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-xs"
            >
              Save & Generate Document
            </button>
          </form>
        </div>
      ) : (
        /* MAIN SUB-SECTION DISPLAY */
        <div className="space-y-4">
          
          {/* 1. ESTIMATES AND QUOTATIONS */}
          {activeSubTab === 'estimates' && (
            <div className="space-y-2">
              {estimates.filter(e => e.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || e.estimateNo.toLowerCase().includes(searchQuery.toLowerCase())).map(est => (
                <div key={est.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs animate-fade-in">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">{est.estimateNo}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{formatDate(est.date)}</span>
                    </div>
                    <span className="text-sm font-extrabold text-slate-800 dark:text-white block">{est.customerName}</span>
                    <span className="text-[10px] font-semibold text-slate-500 block">{est.items.length} items • Estimated Rs.{formatCurrency(est.total)}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
                    <button
                      onClick={() => handlePrintEstimate(est)}
                      className="px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </button>
                    <button
                      onClick={() => handleConvertToPOSCart(est)}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      Convert to POS <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={async () => {
                        const confirmed = await showConfirm(`Delete estimate ${est.estimateNo}?`, 'Delete Estimate');
                        if (confirmed) setEstimates(estimates.filter(e => e.id !== est.id));
                      }}
                      className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {estimates.length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
                  No Estimates or Quotations Drafted
                </div>
              )}
            </div>
          )}

          {/* 2. PURCHASE ORDERS */}
          {activeSubTab === 'purchase_orders' && (
            <div className="space-y-2">
              {purchaseOrders.filter(po => po.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) || po.poNo.toLowerCase().includes(searchQuery.toLowerCase())).map(po => (
                <div key={po.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs animate-fade-in">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-600 dark:text-slate-300">{po.poNo}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{formatDate(po.date)}</span>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                        po.status === 'Sent' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                        po.status === 'Received' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                        'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}>{po.status}</span>
                    </div>
                    <span className="text-sm font-extrabold text-slate-800 dark:text-white block">{po.supplierName}</span>
                    <span className="text-[10px] font-semibold text-slate-500 block">{po.items.length} items • Valuation Rs.{formatCurrency(po.total)}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
                    {po.status === 'Sent' && (
                      <button
                        onClick={() => {
                          const updated = purchaseOrders.map(p => p.id === po.id ? { ...p, status: 'Received' as const } : p);
                          setPurchaseOrders(updated);
                          showAlert(`Purchase Order ${po.poNo} marked as Received!`, 'PO Updated');
                        }}
                        className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-xl text-[10px] font-extrabold uppercase transition-all"
                      >
                        Mark Received
                      </button>
                    )}

                    <button
                      onClick={() => handlePrintPO(po)}
                      className="px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print
                    </button>

                    <button
                      onClick={() => handleSharePO(po)}
                      className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" /> Share
                    </button>

                    <button
                      onClick={async () => {
                        const confirmed = await showConfirm(`Delete purchase order ${po.poNo}?`, 'Delete PO');
                        if (confirmed) setPurchaseOrders(purchaseOrders.filter(p => p.id !== po.id));
                      }}
                      className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {purchaseOrders.length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
                  No Purchase Orders Drafted
                </div>
              )}
            </div>
          )}

          {/* 3. DELIVERY CHALLANS */}
          {activeSubTab === 'challans' && (
            <div className="space-y-2">
              {deliveryChallans.filter(ch => ch.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || ch.challanNo.toLowerCase().includes(searchQuery.toLowerCase())).map(dc => (
                <div key={dc.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs animate-fade-in">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-600 dark:text-slate-300">{dc.challanNo}</span>
                      <span className="text-[10px] text-slate-400 font-semibold">{formatDate(dc.date)}</span>
                      <span className="text-[9px] font-black uppercase text-indigo-700 bg-indigo-50 dark:bg-indigo-950 dark:text-indigo-300 px-1.5 py-0.5 rounded">{dc.status}</span>
                    </div>
                    <span className="text-sm font-extrabold text-slate-800 dark:text-white block">{dc.customerName}</span>
                    <span className="text-[10px] font-semibold text-slate-500 block">Vehicle: {dc.vehicleNo} • {dc.items.length} goods items</span>
                  </div>

                  <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
                    {dc.status === 'Dispatched' && (
                      <button
                        onClick={() => {
                          const updated = deliveryChallans.map(d => d.id === dc.id ? { ...d, status: 'Delivered' as const } : d);
                          setDeliveryChallans(updated);
                          showAlert(`Challan ${dc.challanNo} marked as Delivered!`, 'Delivery Completed');
                        }}
                        className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 rounded-xl text-[10px] font-extrabold uppercase transition-all"
                      >
                        Confirm Delivery
                      </button>
                    )}

                    <button
                      onClick={() => handlePrintChallan(dc)}
                      className="px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF
                    </button>

                    <button
                      onClick={async () => {
                        const confirmed = await showConfirm(`Delete challan ${dc.challanNo}?`, 'Delete Challan');
                        if (confirmed) setDeliveryChallans(deliveryChallans.filter(d => d.id !== dc.id));
                      }}
                      className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {deliveryChallans.length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
                  No Delivery Challans Drafted
                </div>
              )}
            </div>
          )}

          {/* 4. CREDIT AND DEBIT NOTES */}
          {activeSubTab === 'notes' && (
            <div className="space-y-2">
              {notes.filter(n => n.partyName.toLowerCase().includes(searchQuery.toLowerCase()) || n.noteNo.toLowerCase().includes(searchQuery.toLowerCase())).map(note => (
                <div key={note.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-xs animate-fade-in">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black ${note.type === 'Credit Note' ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                        {note.noteNo}
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold">{formatDate(note.date)}</span>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${
                        note.type === 'Credit Note' 
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' 
                          : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                      }`}>
                        {note.type}
                      </span>
                    </div>
                    <span className="text-sm font-extrabold text-slate-800 dark:text-white block">{note.partyName}</span>
                    <span className="text-[10px] font-semibold text-slate-500 block">Reason: "{note.reason}" • Adjustment Rs.{formatCurrency(note.amount)}</span>
                  </div>

                  <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
                    <button
                      onClick={() => handlePrintNote(note)}
                      className="px-3 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200 dark:border-slate-700"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print
                    </button>

                    <button
                      onClick={() => handleShareNote(note)}
                      className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" /> Share
                    </button>

                    <button
                      onClick={async () => {
                        const confirmed = await showConfirm(`Delete note ${note.noteNo}?`, 'Delete Note');
                        if (confirmed) setNotes(notes.filter(n => n.id !== note.id));
                      }}
                      className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {notes.length === 0 && (
                <div className="text-center py-12 bg-white dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs">
                  No Credit/Debit Notes Drafted
                </div>
              )}
            </div>
          )}

          {/* 5. GST E-WAY BILL GENERATOR & FULL HISTORY */}
          {activeSubTab === 'eway_bills' && (
            <div className="space-y-5">
              {/* Generator Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
                  <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest block flex items-center gap-1.5">
                    <Truck className="w-4 h-4" /> GST E-Way Bill Transit Registration
                  </span>
                  <p className="text-[10px] text-slate-500">
                    Generate an official GST E-Way bill with transporter vehicle credentials for consignments exceeding Rs. 50,000 threshold or road permit transit.
                  </p>
                  
                  <form onSubmit={handleGenerateEWayBill} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Transit Vehicle Number *</label>
                      <input
                        type="text"
                        placeholder="e.g. DL-3C-AQ-4491"
                        value={ewayVehicleNo}
                        onChange={(e) => setEwayVehicleNo(e.target.value)}
                        required
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none uppercase font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Transporter GSTIN ID</label>
                      <input
                        type="text"
                        placeholder="e.g. 07AAAAA1111A1Z1"
                        value={ewayTransporterId}
                        onChange={(e) => setEwayTransporterId(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none uppercase"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">From Origin Office</label>
                        <input
                          type="text"
                          value={ewayFromOffice}
                          onChange={(e) => setEwayFromOffice(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Destination Location *</label>
                        <input
                          type="text"
                          placeholder="e.g. Dwarka Central Warehouse"
                          value={ewayToLocation}
                          onChange={(e) => setEwayToLocation(e.target.value)}
                          required
                          className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm cursor-pointer"
                    >
                      Generate & Save E-Way Bill Code
                    </button>
                  </form>
                </div>

                {/* Generated Card Preview */}
                <div className="bg-slate-950 text-slate-300 border border-slate-800 rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs">
                  <div>
                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest block">🎫 Active Generated Transit Pass</span>
                    
                    {ewayBillGenerated ? (
                      <div className="space-y-3 mt-3 text-xs animate-fade-in font-mono">
                        <div className="bg-indigo-950/50 p-3 rounded-xl border border-indigo-900 flex items-center gap-2 text-emerald-400">
                          <CheckCircle className="w-5 h-5 flex-shrink-0" />
                          <div>
                            <div className="font-bold uppercase text-[10px]">GST COMPLIANT PASS APPROVED</div>
                            <div className="text-[9px] text-slate-400">Valid for 72 hours from issue date</div>
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
                      <div className="text-center py-10 text-slate-600 text-xs flex flex-col items-center justify-center gap-2">
                        <Truck className="w-8 h-8 text-slate-700" />
                        <span>Fill the form on the left to generate and save an active compliance E-Way Bill pass.</span>
                      </div>
                    )}
                  </div>

                  {ewayBillGenerated && (
                    <div className="space-y-2 pt-3 border-t border-slate-800 mt-3">
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await generateEWayBillPDF(ewayBillGenerated, {
                              shopName: settings.shopName,
                              address: settings.address,
                              phone: settings.phone,
                              gstin: settings.gstin,
                            });
                            await printPdfDocument(res.base64, res.filename);
                          }}
                          className="py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                        >
                          <Printer className="w-3.5 h-3.5" /> Print Pass
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            const res = await generateEWayBillPDF(ewayBillGenerated, {
                              shopName: settings.shopName,
                              address: settings.address,
                              phone: settings.phone,
                              gstin: settings.gstin,
                            });
                            await sharePdfDocument({
                              pdfBase64: res.base64,
                              filename: res.filename,
                              title: `GST E-Way Bill Pass #${ewayBillGenerated.billNo}`,
                              text: `Official GST E-Way Transit Pass for vehicle ${ewayBillGenerated.vehicleNo}.`,
                              subfolder: 'Invoices',
                            });
                          }}
                          className="py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer shadow-sm"
                        >
                          <MessageCircle className="w-3.5 h-3.5" /> Share Pass
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          const res = await generateEWayBillPDF(ewayBillGenerated, {
                            shopName: settings.shopName,
                            address: settings.address,
                            phone: settings.phone,
                            gstin: settings.gstin,
                          });
                          showAlert(`E-Way Bill PDF "${res.filename}" saved to storage!`, 'PDF Downloaded');
                        }}
                        className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <FileDown className="w-3.5 h-3.5" /> Download PDF to Documents Folder
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* E-Way Bill History List */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2.5">
                  <h4 className="text-xs font-black uppercase text-slate-800 dark:text-white tracking-wider flex items-center gap-2">
                    <Truck className="w-4 h-4 text-indigo-600" />
                    GST E-Way Bill History ({ewayBills.length})
                  </h4>
                  <span className="text-[10px] text-slate-400">All registered transit passes</span>
                </div>

                <div className="space-y-2">
                  {ewayBills.map(bill => (
                    <div 
                      key={bill.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 font-mono">{bill.billNo}</span>
                          <span className="text-[10px] text-slate-400 font-semibold">{bill.date}</span>
                          <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            {bill.status}
                          </span>
                        </div>
                        <div className="text-xs font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                          <span>Vehicle: {bill.vehicleNo}</span>
                          <span className="text-slate-400">•</span>
                          <span className="text-slate-500 font-normal">Transporter: {bill.transporterId}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Route: {bill.fromLocation} ➔ {bill.toLocation}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
                        <button
                          onClick={async () => {
                            const res = await generateEWayBillPDF(bill, {
                              shopName: settings.shopName,
                              address: settings.address,
                              phone: settings.phone,
                              gstin: settings.gstin,
                            });
                            await printPdfDocument(res.base64, res.filename);
                          }}
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Printer className="w-3 h-3" /> Print
                        </button>

                        <button
                          onClick={async () => {
                            const res = await generateEWayBillPDF(bill, {
                              shopName: settings.shopName,
                              address: settings.address,
                              phone: settings.phone,
                              gstin: settings.gstin,
                            });
                            showAlert(`E-Way Bill PDF "${res.filename}" downloaded to folder!`, 'Download Complete');
                          }}
                          className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3" /> PDF
                        </button>

                        <button
                          onClick={async () => {
                            await copyToClipboard(bill.billNo);
                            showAlert(`Copied E-Way Bill No "${bill.billNo}" to clipboard!`, 'Copied');
                          }}
                          className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" /> Copy
                        </button>

                        <button
                          onClick={async () => {
                            const confirmed = await showConfirm(`Delete E-Way Bill ${bill.billNo}?`, 'Delete Pass');
                            if (confirmed) setEwayBills(ewayBills.filter(b => b.id !== bill.id));
                          }}
                          className="p-1.5 bg-white dark:bg-slate-900 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200 dark:border-slate-800"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {ewayBills.length === 0 && (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No E-Way Bill history recorded yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 6. MULTI-FIRM & MULTI-BRANCH WITH FULL EDIT & ADD MODALS */}
          {activeSubTab === 'branches' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div>
                  <span className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest block flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" /> Multi-Firm & Branch Command Hub
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Manage multiple firms, GSTIN registrations, and retail branches. Switching branches updates billing headers, GSTIN tax compliance, and receipt details instantly.
                  </p>
                </div>

                <button
                  onClick={handleOpenAddBranch}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" /> Add New Firm / Branch
                </button>
              </div>

              {/* Branch Add / Edit Form Modal */}
              {(editingBranch || isAddingBranch) && (
                <div className="bg-slate-50 dark:bg-slate-950 border border-indigo-200 dark:border-indigo-900/60 rounded-2xl p-4 space-y-3 animate-fade-in">
                  <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-2">
                    <h4 className="text-xs font-black uppercase text-indigo-600 dark:text-indigo-400">
                      {editingBranch ? `✏️ Edit Firm / Branch: ${editingBranch.name}` : '➕ Add New Firm / Branch Profile'}
                    </h4>
                    <button
                      onClick={() => {
                        setEditingBranch(null);
                        setIsAddingBranch(false);
                      }}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  </div>

                  <form onSubmit={handleSaveBranch} className="space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Branch / Store Name *</label>
                        <input
                          type="text"
                          placeholder="e.g. South Delhi Branch"
                          value={branchForm.name}
                          onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                          required
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Legal Trade Entity Name</label>
                        <input
                          type="text"
                          placeholder="e.g. ShopPOS Retail Enterprises Pvt Ltd"
                          value={branchForm.legalName}
                          onChange={(e) => setBranchForm({ ...branchForm, legalName: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">GSTIN Registration ID *</label>
                        <input
                          type="text"
                          placeholder="e.g. 07AAAAA1111A1Z1"
                          value={branchForm.gstin}
                          onChange={(e) => setBranchForm({ ...branchForm, gstin: e.target.value })}
                          required
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none uppercase font-mono font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">State / Union Territory</label>
                        <input
                          type="text"
                          placeholder="e.g. Delhi (07) or Maharashtra (27)"
                          value={branchForm.state}
                          onChange={(e) => setBranchForm({ ...branchForm, state: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contact Phone</label>
                        <input
                          type="text"
                          placeholder="e.g. +91 9876543210"
                          value={branchForm.phone}
                          onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Contact Email</label>
                        <input
                          type="email"
                          placeholder="e.g. store@shoppos.in"
                          value={branchForm.email}
                          onChange={(e) => setBranchForm({ ...branchForm, email: e.target.value })}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Complete Physical Store Address</label>
                      <input
                        type="text"
                        placeholder="e.g. Shop 12, Ground Floor, Sector 15 Market, New Delhi"
                        value={branchForm.address}
                        onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBranch(null);
                          setIsAddingBranch(false);
                        }}
                        className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-xs cursor-pointer"
                      >
                        Save Branch Details
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Branches List */}
              <div className="space-y-3">
                {branches.map(b => (
                  <div 
                    key={b.id} 
                    className={`p-4 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 transition-all ${
                      b.active 
                        ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-300 dark:border-indigo-800 shadow-xs' 
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900 dark:text-white">{b.name}</span>
                        {b.active && (
                          <span className="text-[9px] font-black uppercase bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                            Active Terminal
                          </span>
                        )}
                        {b.state && (
                          <span className="text-[9px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                            {b.state}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                        {b.legalName && <span className="font-bold">{b.legalName} • </span>}
                        <span>📍 {b.address}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono flex flex-wrap gap-3 mt-1">
                        <span>GSTIN: <strong className="text-slate-700 dark:text-slate-200">{b.gstin}</strong></span>
                        {b.phone && <span>Phone: {b.phone}</span>}
                        {b.email && <span>Email: {b.email}</span>}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 w-full sm:w-auto items-center">
                      <button
                        onClick={() => handleOpenEditBranch(b)}
                        className="px-3 py-1.5 bg-white dark:bg-slate-900 hover:bg-slate-100 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Edit2 className="w-3 h-3 text-slate-500" /> Edit
                      </button>

                      {!b.active && (
                        <button
                          onClick={() => handleSwitchBranch(b.id)}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase flex items-center gap-1.5 cursor-pointer shadow-xs"
                        >
                          <ArrowLeftRight className="w-3 h-3" /> Switch
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteBranch(b.id)}
                        className="p-2 bg-white dark:bg-slate-900 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl border border-slate-200 dark:border-slate-800"
                        title="Delete Branch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7. ONLINE CATALOGUE / STOREFRONT */}
          {activeSubTab === 'catalog' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest block flex items-center gap-1.5">
                  <Globe className="w-4 h-4" /> Customer Online Catalogue & QR Ordering
                </span>
                <p className="text-[10px] text-slate-400 mt-1">
                  Share your live inventory and catalog with your customers. They can view stock prices, items, categories, and place reservation orders online.
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                <span className="font-mono text-slate-700 dark:text-slate-300 select-all truncate">
                  https://shoppos.in/store/{settings.shopName.toLowerCase().replace(/\s+/g, '-')}
                </span>
                <button
                  onClick={async () => {
                    const link = `https://shoppos.in/store/${settings.shopName.toLowerCase().replace(/\s+/g, '-')}`;
                    await copyToClipboard(link);
                    showAlert('Online Catalogue URL copied to clipboard!', 'Link Copied');
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase cursor-pointer shadow-xs shrink-0"
                >
                  Copy Storefront Link
                </button>
              </div>

              <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 p-4 sm:p-5 rounded-2xl space-y-3">
                <span className="text-xs font-black uppercase text-indigo-700 dark:text-indigo-300 block">
                  🛍️ Live QR Catalogue Poster
                </span>
                <p className="text-xs text-indigo-600 dark:text-indigo-400">
                  Display this QR code poster at your billing counter or storefront. Customers scan it with their phone camera to open your instant product menu.
                </p>
                <div className="flex justify-center py-2">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-md flex flex-col items-center">
                    <div className="w-36 h-36 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-indigo-950 to-indigo-900 rounded-xl flex items-center justify-center font-black text-white text-xs uppercase text-center p-3 shadow-inner">
                      SCAN TO BROWSE LIVE MENU
                    </div>
                    <span className="text-xs font-black text-slate-800 mt-2 uppercase">{settings.shopName}</span>
                    <span className="text-[9px] text-slate-400 font-mono mt-0.5">Instant Mobile POS Menu</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 8. CLOUD BACKUP & MULTI-DEVICE SYNC */}
          {activeSubTab === 'sync' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xs">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-widest block flex items-center gap-1.5">
                  <Cloud className="w-4 h-4" /> Cloud Backup & Multi-Device Sync Telemetry
                </span>
                <p className="text-[10px] text-slate-400 mt-1">
                  Synchronize your cash registers, billing transactions, customer ledgers (Khata), and products database securely with centralized Cloud sync.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Sync Parameters</span>
                  <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    <div><span className="font-semibold text-slate-400">Connection:</span> Secure SSL Tunnel (Active)</div>
                    <div><span className="font-semibold text-slate-400">Database Engine:</span> IndexedDB + SQLite Mirror</div>
                    <div><span className="font-semibold text-slate-400">Last Synced:</span> Just now (Real-time)</div>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Connected Terminals</span>
                  <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                    <div><span className="font-semibold text-slate-400">Counter 1 (Main Register):</span> Online • Active</div>
                    <div><span className="font-semibold text-slate-400">Mobile Handheld Scanner:</span> Paired • Ready</div>
                    <div><span className="font-semibold text-slate-400">Cloud Remote Dashboard:</span> Synced</div>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 p-4 rounded-xl flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-xs">
                <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-500" />
                <span>Multi-device synchronization is fully configured and operational. Offline backups are automatically cached to local encrypted storage.</span>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
