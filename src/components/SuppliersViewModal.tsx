/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Factory,
  ShoppingBag,
  Trash2,
  Calendar,
  FileText,
  RotateCcw,
  Zap,
  Search,
  ArrowLeft,
  Check,
  Printer,
  ArrowUpDown,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  Package,
  ChevronRight,
  Edit3,
  SlidersHorizontal,
  DollarSign,
  AlertCircle,
  Copy,
  Receipt,
} from 'lucide-react';
import { Supplier, Product, PurchaseOrder, PurchaseItem } from '../types';
import { formatCurrency, formatDate, generateId, getTodayDateString, copyToClipboard } from '../utils';
import { useDialog } from '../context/DialogContext';

interface SuppliersViewModalProps {
  suppliers: Supplier[];
  products: Product[];
  purchases: PurchaseOrder[];
  onClose: () => void;
  onSaveSupplier: (data: Partial<Supplier>) => Promise<void> | void;
  onDeleteSupplier: (id: string) => Promise<void> | void;
  onSavePurchaseOrder: (poData: { supplierId: string; items: PurchaseItem[]; total: number }) => Promise<void> | void;
  currency?: string;
}

export const SuppliersViewModal: React.FC<SuppliersViewModalProps> = ({
  suppliers,
  products,
  purchases,
  onClose,
  onSaveSupplier,
  onDeleteSupplier,
  onSavePurchaseOrder,
  currency = 'Rs.',
}) => {
  const { showAlert, showConfirm } = useDialog();

  // Navigation tab state: 'list' (directory), 'supplier_detail' (specific supplier + PO history), 'po' (create PO), 'hist' (all PO history)
  const [activeTab, setActiveTab] = useState<'list' | 'supplier_detail' | 'po' | 'hist'>('list');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

  // Supplier Form state
  const [supFormId, setSupFormId] = useState<string | null>(null);
  const [supName, setSupFormName] = useState<string>('');
  const [supPhone, setSupFormPhone] = useState<string>('');
  const [supEmail, setSupFormEmail] = useState<string>('');
  const [supAddress, setSupFormAddress] = useState<string>('');
  const [isSupFormOpen, setIsSupFormOpen] = useState<boolean>(false);

  // Search & Filter state for suppliers list
  const [supplierSearch, setSupplierSearch] = useState<string>('');

  // Purchase Order Form state
  const [poSupplierId, setPoSupplierId] = useState<string>('');
  const [poSelectedProductId, setPoSelectedProductId] = useState<string>('');
  const [poQtyInput, setPoQtyInput] = useState<number>(1);
  const [poCustomBuyPrice, setPoCustomBuyPrice] = useState<number | ''>('');
  const [poItems, setPoItems] = useState<PurchaseItem[]>([]);
  const [reorderSourceNotice, setReorderSourceNotice] = useState<string | null>(null);

  // PO History filters & sorting
  const [historySupplierFilter, setHistorySupplierFilter] = useState<string>('all');
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historySortBy, setHistorySortBy] = useState<'newest' | 'oldest' | 'amount-desc' | 'amount-asc'>('newest');

  // Printable PO Receipt preview modal
  const [activePoReceipt, setActivePoReceipt] = useState<PurchaseOrder | null>(null);

  // Quick feedback toast
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => setFeedbackToast(null), 2500);
  };

  // Map of suppliers for O(1) lookup
  const suppliersMap = useMemo(() => {
    const map = new Map<string, Supplier>();
    suppliers.forEach((s) => map.set(s.id, s));
    return map;
  }, [suppliers]);

  // Aggregate statistics per supplier: total PO count, total spend, last PO date
  const supplierStatsMap = useMemo(() => {
    const map = new Map<string, { poCount: number; totalSpend: number; lastDate: string | null; totalUnits: number }>();
    suppliers.forEach((s) => {
      map.set(s.id, { poCount: 0, totalSpend: 0, lastDate: null, totalUnits: 0 });
    });

    purchases.forEach((po) => {
      const curr = map.get(po.supplierId) || { poCount: 0, totalSpend: 0, lastDate: null, totalUnits: 0 };
      const unitsInPo = po.items.reduce((sum, item) => sum + item.qty, 0);
      map.set(po.supplierId, {
        poCount: curr.poCount + 1,
        totalSpend: curr.totalSpend + (po.total || 0),
        lastDate: curr.lastDate ? (po.date > curr.lastDate ? po.date : curr.lastDate) : po.date,
        totalUnits: curr.totalUnits + unitsInPo,
      });
    });

    return map;
  }, [suppliers, purchases]);

  // Total logistics aggregate stats
  const overallStats = useMemo(() => {
    const totalOrders = purchases.length;
    const totalSpent = purchases.reduce((sum, p) => sum + (p.total || 0), 0);
    const totalUnits = purchases.reduce((sum, p) => sum + p.items.reduce((s, it) => s + it.qty, 0), 0);
    return { totalOrders, totalSpent, totalUnits };
  }, [purchases]);

  // Filtered suppliers list
  const filteredSuppliers = useMemo(() => {
    const q = supplierSearch.trim().toLowerCase();
    if (!q) return suppliers;
    return suppliers.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.phone && s.phone.includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.address && s.address.toLowerCase().includes(q))
    );
  }, [suppliers, supplierSearch]);

  // Filtered and sorted PO history
  const filteredHistory = useMemo(() => {
    let list = [...purchases];

    // Filter by supplier
    if (historySupplierFilter !== 'all') {
      list = list.filter((po) => po.supplierId === historySupplierFilter);
    }

    // Filter by search text (product name, supplier name, date)
    const q = historySearch.trim().toLowerCase();
    if (q) {
      list = list.filter((po) => {
        const sup = suppliersMap.get(po.supplierId);
        const supMatch = sup && sup.name.toLowerCase().includes(q);
        const dateMatch = po.date && po.date.includes(q);
        const itemMatch = po.items.some((it) => it.name.toLowerCase().includes(q));
        return supMatch || dateMatch || itemMatch;
      });
    }

    // Sort
    list.sort((a, b) => {
      if (historySortBy === 'newest') {
        const dateCompare = (b.date || '').localeCompare(a.date || '');
        if (dateCompare !== 0) return dateCompare;
        return (b.time || '').localeCompare(a.time || '');
      }
      if (historySortBy === 'oldest') {
        const dateCompare = (a.date || '').localeCompare(b.date || '');
        if (dateCompare !== 0) return dateCompare;
        return (a.time || '').localeCompare(b.time || '');
      }
      if (historySortBy === 'amount-desc') {
        return (b.total || 0) - (a.total || 0);
      }
      if (historySortBy === 'amount-asc') {
        return (a.total || 0) - (b.total || 0);
      }
      return 0;
    });

    return list;
  }, [purchases, historySupplierFilter, historySearch, historySortBy, suppliersMap]);

  // Selected supplier object & their purchases
  const currentSelectedSupplier = useMemo(() => {
    if (!selectedSupplierId) return null;
    return suppliersMap.get(selectedSupplierId) || null;
  }, [selectedSupplierId, suppliersMap]);

  const currentSupplierPurchases = useMemo(() => {
    if (!selectedSupplierId) return [];
    return purchases
      .filter((p) => p.supplierId === selectedSupplierId)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [selectedSupplierId, purchases]);

  // Open Supplier Edit / Create form
  const handleOpenSupplierForm = (s: Supplier | null) => {
    if (s) {
      setSupFormId(s.id);
      setSupFormName(s.name || '');
      setSupFormPhone(s.phone || '');
      setSupFormEmail(s.email || '');
      setSupFormAddress(s.address || '');
    } else {
      setSupFormId(null);
      setSupFormName('');
      setSupFormPhone('');
      setSupFormEmail('');
      setSupFormAddress('');
    }
    setIsSupFormOpen(true);
  };

  const handleSaveSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) {
      await showAlert('Supplier Name is required!', 'Required Field');
      return;
    }

    await onSaveSupplier({
      id: supFormId || undefined,
      name: supName.trim(),
      phone: supPhone.trim(),
      email: supEmail.trim(),
      address: supAddress.trim(),
    });
    setIsSupFormOpen(false);
    showToast(supFormId ? 'Supplier updated successfully' : 'New supplier added successfully');
  };

  // Add Item to active PO Draft
  const handleAddPOItem = () => {
    if (!poSelectedProductId) {
      showAlert('Select a product to restock!', 'Selection Required');
      return;
    }
    const targetProduct = products.find((p) => p.id === poSelectedProductId);
    if (!targetProduct) return;

    const unitBuyPrice =
      typeof poCustomBuyPrice === 'number' && poCustomBuyPrice >= 0
        ? poCustomBuyPrice
        : targetProduct.buyPrice || 0;

    const existingIndex = poItems.findIndex((i) => i.id === poSelectedProductId);
    if (existingIndex >= 0) {
      const updated = [...poItems];
      updated[existingIndex] = {
        ...updated[existingIndex],
        qty: updated[existingIndex].qty + poQtyInput,
        buyPrice: unitBuyPrice,
      };
      setPoItems(updated);
    } else {
      setPoItems([
        ...poItems,
        {
          id: targetProduct.id,
          name: targetProduct.name,
          qty: poQtyInput,
          buyPrice: unitBuyPrice,
          unit: targetProduct.unit || 'pcs',
        },
      ]);
    }

    setPoSelectedProductId('');
    setPoQtyInput(1);
    setPoCustomBuyPrice('');
  };

  const handleUpdatePOItemQty = (idx: number, delta: number) => {
    const updated = [...poItems];
    const newQty = Math.max(1, updated[idx].qty + delta);
    updated[idx] = { ...updated[idx], qty: newQty };
    setPoItems(updated);
  };

  const handleUpdatePOItemPrice = (idx: number, price: number) => {
    const updated = [...poItems];
    updated[idx] = { ...updated[idx], buyPrice: Math.max(0, price) };
    setPoItems(updated);
  };

  const handleRemovePOItem = (idx: number) => {
    setPoItems(poItems.filter((_, i) => i !== idx));
  };

  // Submit PO Draft
  const handleSavePOSubmit = async () => {
    if (!poSupplierId) {
      await showAlert('Please select a supplier distributor!', 'Supplier Required');
      return;
    }
    if (poItems.length === 0) {
      await showAlert('Add at least one item quantity to restock order!', 'Items Required');
      return;
    }

    const poTotal = poItems.reduce((sum, item) => sum + item.buyPrice * item.qty, 0);

    await onSavePurchaseOrder({
      supplierId: poSupplierId,
      items: poItems,
      total: poTotal,
    });

    const supplierName = suppliersMap.get(poSupplierId)?.name || 'Supplier';
    showToast(`Restock Intake Completed for ${supplierName}`);

    setPoItems([]);
    setPoSupplierId('');
    setReorderSourceNotice(null);
    setActiveTab('hist');
  };

  // RE-ORDER ACTIONS
  // 1. Load entire PO into Create PO Draft
  const handleLoadPOToDraft = (po: PurchaseOrder) => {
    setPoSupplierId(po.supplierId);

    // Map items, checking if current product prices or units exist
    const loadedItems: PurchaseItem[] = po.items.map((item) => {
      const liveProd = products.find((p) => p.id === item.id);
      return {
        id: item.id,
        name: liveProd ? liveProd.name : item.name,
        qty: item.qty,
        buyPrice: item.buyPrice ?? (liveProd ? liveProd.buyPrice : 0),
        unit: liveProd ? liveProd.unit : item.unit || 'pcs',
      };
    });

    setPoItems(loadedItems);
    const supName = suppliersMap.get(po.supplierId)?.name || 'Supplier';
    setReorderSourceNotice(`Items populated from previous Purchase Order (${formatDate(po.date)}) for ${supName}`);
    setActiveTab('po');
    setIsSupFormOpen(false);
    showToast(`Loaded ${loadedItems.length} items into Purchase Order Builder`);
  };

  // 2. Instant 1-Click Re-Order (direct save & stock increment)
  const handleInstantReOrderPO = async (po: PurchaseOrder) => {
    const supName = suppliersMap.get(po.supplierId)?.name || 'Supplier';
    const totalItems = po.items.reduce((sum, it) => sum + it.qty, 0);

    const confirmed = await showConfirm(
      `Instant Re-Order Purchase Order from ${supName}?\n\n• ${po.items.length} item types (${totalItems} units total)\n• Total Amount: ${currency}${formatCurrency(po.total)}\n\nThis will immediately record the purchase order and add stock to your inventory.`,
      'Instant Re-Order Restock'
    );

    if (confirmed) {
      await onSavePurchaseOrder({
        supplierId: po.supplierId,
        items: po.items,
        total: po.total,
      });

      showToast(`Instant restock successful! Stock levels updated for ${supName}.`);
      setActiveTab('hist');
    }
  };

  // 3. Re-order single item into active draft
  const handleReorderSingleItem = (supplierId: string, item: PurchaseItem) => {
    if (!poSupplierId) {
      setPoSupplierId(supplierId);
    }

    const liveProd = products.find((p) => p.id === item.id);
    const existingIndex = poItems.findIndex((i) => i.id === item.id);

    if (existingIndex >= 0) {
      const updated = [...poItems];
      updated[existingIndex] = {
        ...updated[existingIndex],
        qty: updated[existingIndex].qty + item.qty,
      };
      setPoItems(updated);
    } else {
      setPoItems([
        ...poItems,
        {
          id: item.id,
          name: liveProd ? liveProd.name : item.name,
          qty: item.qty,
          buyPrice: item.buyPrice ?? (liveProd ? liveProd.buyPrice : 0),
          unit: liveProd ? liveProd.unit : item.unit || 'pcs',
        },
      ]);
    }

    showToast(`Added ${item.name} (×${item.qty}) to PO Draft`);
    setActiveTab('po');
  };

  const poGrandTotal = poItems.reduce((sum, item) => sum + item.buyPrice * item.qty, 0);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1000] flex items-end sm:items-center justify-center p-2 sm:p-4 animate-fade-in select-none">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col">
        {/* MODAL HEADER */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
              <Factory className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span>Suppliers & Logistics Portal</span>
                <span className="text-[9px] font-bold px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-full">
                  {suppliers.length} Distributors
                </span>
              </h3>
              <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                Manage distributor directory, purchase orders & instant re-orders
              </p>
            </div>
          </div>

          <button
            id="close-suppliers-portal-btn"
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-300 flex items-center justify-center cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* NAVIGATION SUBTABS */}
        <div className="p-3 bg-slate-50/90 dark:bg-slate-950/80 border-b border-slate-100 dark:border-slate-800/60 shrink-0">
          <div className="flex bg-slate-200/80 dark:bg-slate-900 p-1 rounded-2xl gap-1">
            <button
              id="tab-suppliers-directory"
              type="button"
              onClick={() => {
                setActiveTab('list');
                setSelectedSupplierId(null);
                setIsSupFormOpen(false);
              }}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'list' && !isSupFormOpen
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <Factory className="w-3.5 h-3.5" />
              <span>Suppliers ({suppliers.length})</span>
            </button>

            <button
              id="tab-create-po"
              type="button"
              onClick={() => {
                setActiveTab('po');
                setIsSupFormOpen(false);
              }}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'po' && !isSupFormOpen
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Create PO {poItems.length > 0 && `(${poItems.length})`}</span>
            </button>

            <button
              id="tab-po-history"
              type="button"
              onClick={() => {
                setActiveTab('hist');
                setIsSupFormOpen(false);
              }}
              className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'hist' && !isSupFormOpen
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>PO History ({purchases.length})</span>
            </button>
          </div>
        </div>

        {/* FEEDBACK TOAST BANNER */}
        {feedbackToast && (
          <div className="bg-emerald-600 text-white text-xs font-black py-2 px-4 text-center shadow-md flex items-center justify-center gap-2 animate-in fade-in slide-in-from-top-2 duration-150 shrink-0">
            <Check className="w-4 h-4" />
            <span>{feedbackToast}</span>
          </div>
        )}

        {/* SCROLLABLE TAB BODY */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* ══════════════════════════════════════════════════════════
              TAB 1: SUPPLIERS DIRECTORY
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'list' && !isSupFormOpen && (
            <div className="space-y-4 animate-fade-in">
              {/* Directory Header & Search */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="supplier-search-input"
                    type="text"
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                    placeholder="Search by supplier name, phone, email..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500 font-semibold"
                  />
                  {supplierSearch && (
                    <button
                      type="button"
                      onClick={() => setSupplierSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <button
                  id="add-supplier-btn"
                  type="button"
                  onClick={() => handleOpenSupplierForm(null)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-95 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5px]" />
                  <span>Add Supplier</span>
                </button>
              </div>

              {/* Summary Stats Strip */}
              {suppliers.length > 0 && (
                <div className="grid grid-cols-3 gap-2 p-2.5 bg-slate-50/70 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                      Total Restock Spend
                    </span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                      {currency}
                      {formatCurrency(overallStats.totalSpent)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                      Total Orders
                    </span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                      {overallStats.totalOrders} POs Issued
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                      Restocked Volume
                    </span>
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                      {overallStats.totalUnits} Units
                    </span>
                  </div>
                </div>
              )}

              {/* Suppliers List */}
              <div className="space-y-3">
                {filteredSuppliers.length > 0 ? (
                  filteredSuppliers.map((s) => {
                    const stats = supplierStatsMap.get(s.id) || {
                      poCount: 0,
                      totalSpend: 0,
                      lastDate: null,
                      totalUnits: 0,
                    };
                    return (
                      <div
                        key={s.id}
                        className="bg-slate-50/80 dark:bg-slate-850/60 hover:bg-slate-100/80 dark:hover:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-750 transition-all space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-black text-slate-900 dark:text-slate-100 text-sm">
                                {s.name}
                              </h4>
                              {stats.poCount > 0 && (
                                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                                  {stats.poCount} {stats.poCount === 1 ? 'Order' : 'Orders'}
                                </span>
                              )}
                            </div>

                            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-x-3 gap-y-1 items-center font-medium">
                              {s.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-400" />
                                  {s.phone}
                                </span>
                              )}
                              {s.email && (
                                <span className="flex items-center gap-1 lowercase">
                                  <Mail className="w-3 h-3 text-slate-400" />
                                  {s.email}
                                </span>
                              )}
                              {s.address && (
                                <span className="flex items-center gap-1 text-[10px] w-full text-slate-400 dark:text-slate-500">
                                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span className="truncate">{s.address}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Spend details */}
                          <div className="text-left sm:text-right bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
                            <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider block">
                              Total Spend with Supplier
                            </span>
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                              {currency}
                              {formatCurrency(stats.totalSpend)}
                            </span>
                            {stats.lastDate && (
                              <span className="text-[9px] text-slate-400 block font-semibold">
                                Last: {formatDate(stats.lastDate)}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Supplier Card Action Buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-750/60">
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSupplierId(s.id);
                                setActiveTab('supplier_detail');
                              }}
                              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>View PO History ({stats.poCount})</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setPoSupplierId(s.id);
                                setActiveTab('po');
                              }}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              <span>New PO</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleOpenSupplierForm(s)}
                            className="px-2.5 py-1.5 text-[11px] font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit Profile</span>
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 px-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-2.5">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-500">
                      <Factory className="w-6 h-6" />
                    </div>
                    <p className="text-xs text-slate-800 dark:text-slate-200 font-bold">
                      {supplierSearch ? 'No matching suppliers found' : 'No suppliers registered yet'}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
                      {supplierSearch
                        ? 'Try modifying your search query or clear the filter.'
                        : 'Add distributor and wholesaler profiles to issue restock purchase orders.'}
                    </p>
                    {!supplierSearch && (
                      <button
                        type="button"
                        onClick={() => handleOpenSupplierForm(null)}
                        className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black cursor-pointer shadow-md"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add First Supplier
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 2: INDIVIDUAL SUPPLIER DETAIL & DEDICATED PO HISTORY
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'supplier_detail' && currentSelectedSupplier && (
            <div className="space-y-4 animate-fade-in">
              {/* Back to Directory Button */}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('list');
                  setSelectedSupplierId(null);
                }}
                className="flex items-center gap-1.5 text-xs font-black text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 uppercase tracking-wider cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to All Suppliers</span>
              </button>

              {/* Supplier Header Banner */}
              <div className="bg-slate-50 dark:bg-slate-850 p-4 sm:p-5 rounded-3xl border border-slate-200 dark:border-slate-750 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-slate-100">
                      {currentSelectedSupplier.name}
                    </h3>
                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex flex-wrap gap-x-3 gap-y-1 items-center font-medium">
                      {currentSelectedSupplier.phone && (
                        <span className="flex items-center gap-1">📞 {currentSelectedSupplier.phone}</span>
                      )}
                      {currentSelectedSupplier.email && (
                        <span className="flex items-center gap-1 lowercase">
                          ✉️ {currentSelectedSupplier.email}
                        </span>
                      )}
                      {currentSelectedSupplier.address && (
                        <span className="flex items-center gap-1 text-[11px] w-full text-slate-400">
                          📍 {currentSelectedSupplier.address}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPoSupplierId(currentSelectedSupplier.id);
                        setActiveTab('po');
                      }}
                      className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Issue New PO</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenSupplierForm(currentSelectedSupplier)}
                      className="p-2 bg-slate-200 dark:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-300 cursor-pointer"
                      title="Edit Supplier"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Metrics bar */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200 dark:border-slate-750/80">
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                      Lifetime Spend
                    </span>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      {currency}
                      {formatCurrency(
                        currentSupplierPurchases.reduce((sum, p) => sum + (p.total || 0), 0)
                      )}
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                      Total Orders
                    </span>
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                      {currentSupplierPurchases.length} Purchase Orders
                    </span>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
                      Total Restocked
                    </span>
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">
                      {currentSupplierPurchases.reduce(
                        (sum, p) => sum + p.items.reduce((s, it) => s + it.qty, 0),
                        0
                      )}{' '}
                      Units
                    </span>
                  </div>
                </div>
              </div>

              {/* Dedicated PO History for this supplier */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <span>Purchase Orders History</span>
                    <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded-full font-bold">
                      {currentSupplierPurchases.length}
                    </span>
                  </h4>
                </div>

                {currentSupplierPurchases.length > 0 ? (
                  currentSupplierPurchases.map((po, idx) => (
                    <div
                      key={po.id || idx}
                      className="bg-white dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-750 shadow-xs space-y-3"
                    >
                      {/* PO Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                              {formatDate(po.date)} {po.time || ''}
                            </span>
                            <span className="text-[8.5px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black uppercase px-2 py-0.5 rounded-full border border-emerald-500/20">
                              Received
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                            {po.items.length} product lines •{' '}
                            {po.items.reduce((sum, it) => sum + it.qty, 0)} total units
                          </span>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-3">
                          <div className="text-right">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">
                              Total Cost
                            </span>
                            <span className="text-sm font-black text-slate-900 dark:text-white">
                              {currency}
                              {formatCurrency(po.total)}
                            </span>
                          </div>

                          {/* Re-order buttons */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleLoadPOToDraft(po)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase rounded-xl flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs transition-transform"
                              title="Load these items into PO Draft to modify or re-order"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Re-Order PO</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleInstantReOrderPO(po)}
                              className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 rounded-xl cursor-pointer"
                              title="1-Click Instant Restock without editing"
                            >
                              <Zap className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setActivePoReceipt(po)}
                              className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-200 cursor-pointer"
                              title="View / Print PO Receipt"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Items List in this PO */}
                      <div className="bg-slate-50 dark:bg-slate-900/70 rounded-xl p-3 border border-slate-100 dark:border-slate-800 space-y-1.5">
                        <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex justify-between pb-1 border-b border-slate-200/60 dark:border-slate-800">
                          <span>Item Details</span>
                          <span>Unit Price / Subtotal</span>
                        </div>
                        {po.items.map((it, itemIdx) => (
                          <div
                            key={it.id || itemIdx}
                            className="flex justify-between items-center text-xs py-1 border-b border-dashed border-slate-200/50 dark:border-slate-800/60 last:border-none"
                          >
                            <div className="min-w-0 flex-1 pr-2">
                              <span className="font-extrabold text-slate-800 dark:text-slate-200 truncate block">
                                {it.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold">
                                Quantity: {it.qty} {it.unit || 'pcs'}
                              </span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-right">
                                <span className="font-extrabold text-slate-900 dark:text-slate-100 block">
                                  {currency}
                                  {formatCurrency(it.buyPrice * it.qty)}
                                </span>
                                <span className="text-[9px] text-slate-400 block font-medium">
                                  @{currency}
                                  {formatCurrency(it.buyPrice)}/ea
                                </span>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleReorderSingleItem(po.supplierId, it)}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[9px] font-black uppercase rounded-lg border border-indigo-200/80 dark:border-indigo-800/60 cursor-pointer"
                                title="Add only this item to PO Builder"
                              >
                                + Reorder
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-bold">
                      No past Purchase Orders recorded for {currentSelectedSupplier.name}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Issue a purchase order to begin tracking acquisitions and restock history.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setPoSupplierId(currentSelectedSupplier.id);
                        setActiveTab('po');
                      }}
                      className="px-3.5 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-black cursor-pointer"
                    >
                      + Create First PO
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 3: CREATE PURCHASE ORDER / RESTOCK INTAKE
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'po' && !isSupFormOpen && (
            <div className="space-y-4 animate-fade-in">
              {/* Re-order source notice banner if items were prefilled */}
              {reorderSourceNotice && (
                <div className="bg-indigo-500/10 dark:bg-indigo-950/50 border border-indigo-500/20 dark:border-indigo-800/60 rounded-2xl p-3 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    <span className="text-xs font-black text-indigo-950 dark:text-indigo-200">
                      {reorderSourceNotice}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setReorderSourceNotice(null)}
                    className="text-indigo-400 hover:text-indigo-600 text-xs p-1"
                  >
                    ✕
                  </button>
                </div>
              )}

              {suppliers.length === 0 ? (
                <div className="text-center py-8 px-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-2">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">
                    ⚠️ Add a Supplier First
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Distributors are required to issue Purchase Orders.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('list');
                      handleOpenSupplierForm(null);
                    }}
                    className="mt-1 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black cursor-pointer shadow-md"
                  >
                    + Register Supplier
                  </button>
                </div>
              ) : (
                <>
                  {/* Supplier Selector */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Distributing Supplier *
                    </label>
                    <select
                      id="po-supplier-select"
                      value={poSupplierId}
                      onChange={(e) => setPoSupplierId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 font-bold"
                    >
                      <option value="">Choose Supplier...</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} {s.phone ? `(${s.phone})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Restock items builder container */}
                  <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-3.5 rounded-2xl space-y-3">
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">
                      Add Merchandise Item to Restock Order
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <div className="sm:col-span-6">
                        <select
                          id="po-product-select"
                          value={poSelectedProductId}
                          onChange={(e) => {
                            const pId = e.target.value;
                            setPoSelectedProductId(pId);
                            const found = products.find((p) => p.id === pId);
                            if (found) {
                              setPoCustomBuyPrice(found.buyPrice || 0);
                            }
                          }}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 font-medium"
                        >
                          <option value="">Choose merchandise item...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} (Stock: {p.qty} {p.unit || 'pcs'} • Buy: {currency}
                              {formatCurrency(p.buyPrice)})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3 flex items-center gap-1">
                        <div className="w-full">
                          <input
                            type="number"
                            min="1"
                            value={poQtyInput}
                            onChange={(e) =>
                              setPoQtyInput(Math.max(1, parseInt(e.target.value) || 1))
                            }
                            placeholder="Qty"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 text-center text-xs text-slate-900 dark:text-slate-100 outline-none font-bold"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-3 flex items-center gap-1.5">
                        <button
                          id="add-po-item-btn"
                          type="button"
                          onClick={handleAddPOItem}
                          className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black cursor-pointer active:scale-95 transition-transform flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Item</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* PO Draft Items Table */}
                  {poItems.length > 0 ? (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          Items In Restock Order ({poItems.length} Products,{' '}
                          {poItems.reduce((sum, i) => sum + i.qty, 0)} Units)
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setPoItems([]);
                            setReorderSourceNotice(null);
                          }}
                          className="text-[9px] font-bold text-rose-500 hover:underline uppercase cursor-pointer"
                        >
                          Clear All Items
                        </button>
                      </div>

                      <div className="max-h-[220px] overflow-y-auto space-y-2 bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-3 border border-slate-200 dark:border-slate-800">
                        {poItems.map((item, idx) => (
                          <div
                            key={item.id || idx}
                            className="bg-white dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 shadow-2xs"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="font-black text-slate-900 dark:text-slate-100 text-xs truncate block">
                                {item.name}
                              </span>
                              <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                                <span>Unit: {item.unit || 'pcs'}</span>
                                <span>•</span>
                                <span>
                                  Subtotal: <strong>{currency}{formatCurrency(item.buyPrice * item.qty)}</strong>
                                </span>
                              </div>
                            </div>

                            {/* Stepper & Price */}
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleUpdatePOItemQty(idx, -1)}
                                  className="w-6 h-6 flex items-center justify-center font-black text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded cursor-pointer"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center text-xs font-black text-slate-800 dark:text-slate-200">
                                  {item.qty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleUpdatePOItemQty(idx, 1)}
                                  className="w-6 h-6 flex items-center justify-center font-black text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded cursor-pointer"
                                >
                                  +
                                </button>
                              </div>

                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-400 font-bold">@</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={item.buyPrice}
                                  onChange={(e) =>
                                    handleUpdatePOItemPrice(idx, parseFloat(e.target.value) || 0)
                                  }
                                  className="w-16 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-1 px-1.5 text-xs text-center font-bold outline-none"
                                  title="Unit cost / Buy price"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemovePOItem(idx)}
                                className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg p-1 text-xs cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 space-y-1">
                      <ShoppingBag className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-700" />
                      <p className="text-xs text-slate-500 font-bold">
                        No merchandise added to PO draft yet
                      </p>
                      <p className="text-[10px] text-slate-400">
                        Select a product above or load items from PO History.
                      </p>
                    </div>
                  )}

                  {/* PO Grand Total & Final Submit */}
                  {poItems.length > 0 && (
                    <div className="pt-3 flex justify-between items-center border-t border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider block">
                          Estimated PO Cost Total
                        </span>
                        <span className="text-base font-black text-slate-900 dark:text-slate-100">
                          {currency}
                          {formatCurrency(poGrandTotal)}
                        </span>
                      </div>

                      <button
                        id="submit-po-btn"
                        type="button"
                        onClick={handleSavePOSubmit}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-black shadow-md cursor-pointer active:scale-95 transition-transform flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>Complete Restock Intake</span>
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              TAB 4: ALL PO HISTORY (WITH RE-ORDER CONTROLS)
             ══════════════════════════════════════════════════════════ */}
          {activeTab === 'hist' && !isSupFormOpen && (
            <div className="space-y-4 animate-fade-in">
              {/* Filter and Search Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                <div className="sm:col-span-5 relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="history-search-input"
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Search by supplier, item, date..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500 font-medium"
                  />
                  {historySearch && (
                    <button
                      type="button"
                      onClick={() => setHistorySearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>

                <div className="sm:col-span-4">
                  <select
                    id="history-supplier-filter"
                    value={historySupplierFilter}
                    onChange={(e) => setHistorySupplierFilter(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 font-bold"
                  >
                    <option value="all">All Suppliers ({suppliers.length})</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-3">
                  <select
                    id="history-sort-select"
                    value={historySortBy}
                    onChange={(e) => setHistorySortBy(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 font-bold"
                  >
                    <option value="newest">Date (Newest)</option>
                    <option value="oldest">Date (Oldest)</option>
                    <option value="amount-desc">Amount (High to Low)</option>
                    <option value="amount-asc">Amount (Low to High)</option>
                  </select>
                </div>
              </div>

              {/* History Summary Stats */}
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Showing {filteredHistory.length} of {purchases.length} Purchase Orders
                </span>
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">
                  Total Spend: {currency}
                  {formatCurrency(filteredHistory.reduce((sum, p) => sum + (p.total || 0), 0))}
                </span>
              </div>

              {/* PO History Cards List */}
              <div className="space-y-3">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((po, idx) => {
                    const matchedSupplier = suppliersMap.get(po.supplierId);
                    const totalUnits = po.items.reduce((sum, it) => sum + it.qty, 0);

                    return (
                      <div
                        key={po.id || idx}
                        className="bg-slate-50/80 dark:bg-slate-850/70 border border-slate-200 dark:border-slate-750 p-4 rounded-2xl shadow-xs space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all"
                      >
                        {/* PO Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                <Factory className="w-3.5 h-3.5 text-indigo-500" />
                                {matchedSupplier ? matchedSupplier.name : 'Unknown Distributor'}
                              </h4>
                              <span className="text-[8.5px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full uppercase border border-emerald-500/20">
                                Restocked
                              </span>
                            </div>

                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1 flex items-center gap-2">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {formatDate(po.date)} {po.time || ''}
                              </span>
                              <span>•</span>
                              <span>{po.items.length} item types ({totalUnits} units)</span>
                            </p>
                          </div>

                          {/* PO Cost & Action buttons */}
                          <div className="flex items-center justify-between sm:justify-end gap-3">
                            <div className="text-right">
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">
                                PO Total
                              </span>
                              <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                                {currency}
                                {formatCurrency(po.total)}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5">
                              {/* Re-order into Builder button */}
                              <button
                                type="button"
                                onClick={() => handleLoadPOToDraft(po)}
                                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-black uppercase rounded-xl flex items-center gap-1 cursor-pointer active:scale-95 shadow-xs transition-transform"
                                title="Load these items into PO Draft to modify or re-order"
                              >
                                <RotateCcw className="w-3 h-3" />
                                <span>Re-Order PO</span>
                              </button>

                              {/* 1-Click Instant Restock button */}
                              <button
                                type="button"
                                onClick={() => handleInstantReOrderPO(po)}
                                className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20 rounded-xl cursor-pointer"
                                title="1-Click Instant Restock without editing"
                              >
                                <Zap className="w-3.5 h-3.5" />
                              </button>

                              {/* View Receipt button */}
                              <button
                                type="button"
                                onClick={() => setActivePoReceipt(po)}
                                className="p-1.5 bg-slate-200/70 hover:bg-slate-300 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl cursor-pointer"
                                title="View / Print PO Receipt"
                              >
                                <Receipt className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* PO Line Items breakdown */}
                        <div className="bg-white dark:bg-slate-900 rounded-xl p-3 border border-slate-150 dark:border-slate-800 space-y-1.5">
                          <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
                            <span>Item Name</span>
                            <span>Qty × Rate = Subtotal</span>
                          </div>
                          {po.items.map((it, itemIdx) => (
                            <div
                              key={it.id || itemIdx}
                              className="text-xs text-slate-700 dark:text-slate-300 flex justify-between items-center py-1 border-b border-dashed border-slate-100 dark:border-slate-800/60 last:border-none"
                            >
                              <div className="min-w-0 flex-1 pr-2">
                                <span className="font-bold text-slate-900 dark:text-slate-100 truncate block">
                                  {it.name}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  Qty: {it.qty} {it.unit || 'pcs'} @ {currency}
                                  {formatCurrency(it.buyPrice)}/ea
                                </span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <span className="font-black text-slate-800 dark:text-slate-200">
                                  {currency}
                                  {formatCurrency(it.buyPrice * it.qty)}
                                </span>

                                <button
                                  type="button"
                                  onClick={() => handleReorderSingleItem(po.supplierId, it)}
                                  className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[9px] font-black uppercase rounded-lg border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                                  title="Add only this item to PO Builder"
                                >
                                  + Reorder
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 px-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-3xl space-y-2">
                    <div className="w-10 h-10 mx-auto rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-bold">
                      No purchase orders match your filter criteria
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Navigate to "Create PO" or select a supplier to log restock orders.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════
              SUPPLIER FORM (CREATE / EDIT MODAL)
             ══════════════════════════════════════════════════════════ */}
          {isSupFormOpen && (
            <form onSubmit={handleSaveSupplierSubmit} className="space-y-4 p-1 animate-fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-3 py-1.5 rounded-xl inline-block">
                  {supFormId ? '✏️ Modify Supplier Details' : '🌱 Register New Distributor'}
                </h4>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Supplier / Company Name *
                </label>
                <input
                  id="supplier-name-input"
                  type="text"
                  value={supName}
                  onChange={(e) => setSupFormName(e.target.value)}
                  placeholder="e.g. Supreme Foods Wholesale"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Contact Phone
                  </label>
                  <input
                    id="supplier-phone-input"
                    type="tel"
                    value={supPhone}
                    onChange={(e) => setSupFormPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    id="supplier-email-input"
                    type="email"
                    value={supEmail}
                    onChange={(e) => setSupFormEmail(e.target.value)}
                    placeholder="sales@distributor.com"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500 lowercase font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Corporate HQ / Warehouse Address
                </label>
                <input
                  id="supplier-address-input"
                  type="text"
                  value={supAddress}
                  onChange={(e) => setSupFormAddress(e.target.value)}
                  placeholder="Plot 42, Industrial Area, Sector 5"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  id="save-supplier-btn"
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-transform shadow-xs"
                >
                  Save Supplier Details
                </button>
                {supFormId && (
                  <button
                    type="button"
                    onClick={async () => {
                      await onDeleteSupplier(supFormId);
                      setIsSupFormOpen(false);
                      showToast('Supplier deleted');
                    }}
                    className="px-3.5 text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 rounded-xl hover:bg-rose-100 cursor-pointer"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsSupFormOpen(false)}
                  className="px-4 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ══════════════════════════════════════════════════════════
            PRINTABLE / SHAREABLE PO RECEIPT MODAL
           ══════════════════════════════════════════════════════════ */}
        {activePoReceipt && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs z-[1100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-5 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-black uppercase text-slate-900 dark:text-white">
                    Purchase Order Receipt
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActivePoReceipt(null)}
                  className="text-slate-400 hover:text-slate-600 text-xs p-1"
                >
                  ✕
                </button>
              </div>

              {/* Receipt Content */}
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 space-y-2 text-xs">
                <div className="text-center pb-2 border-b border-dashed border-slate-200 dark:border-slate-800">
                  <h4 className="font-black text-slate-900 dark:text-white text-sm">
                    {suppliersMap.get(activePoReceipt.supplierId)?.name || 'Distributor PO'}
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Date: {formatDate(activePoReceipt.date)} {activePoReceipt.time || ''}
                  </p>
                </div>

                <div className="space-y-1.5 py-1">
                  {activePoReceipt.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[11px]">
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                        {it.name} (×{it.qty})
                      </span>
                      <span className="font-bold text-slate-900 dark:text-slate-100 shrink-0">
                        {currency}
                        {formatCurrency(it.buyPrice * it.qty)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center font-black">
                  <span className="text-slate-600 dark:text-slate-400 uppercase text-[10px]">
                    Total PO Value:
                  </span>
                  <span className="text-sm text-indigo-600 dark:text-indigo-400">
                    {currency}
                    {formatCurrency(activePoReceipt.total)}
                  </span>
                </div>
              </div>

              {/* Actions inside Receipt */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const po = activePoReceipt;
                    setActivePoReceipt(null);
                    handleLoadPOToDraft(po);
                  }}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Re-Order This PO</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const text = `PURCHASE ORDER RECEIPT\nSupplier: ${
                      suppliersMap.get(activePoReceipt.supplierId)?.name || 'Supplier'
                    }\nDate: ${activePoReceipt.date} ${activePoReceipt.time || ''}\n\nITEMS:\n${activePoReceipt.items
                      .map((it) => `- ${it.name} × ${it.qty} = ${currency}${formatCurrency(it.buyPrice * it.qty)}`)
                      .join('\n')}\n\nTOTAL: ${currency}${formatCurrency(activePoReceipt.total)}`;
                    copyToClipboard(text);
                    showToast('Copied PO Summary to clipboard!');
                  }}
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 cursor-pointer flex items-center gap-1"
                  title="Copy text summary"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
