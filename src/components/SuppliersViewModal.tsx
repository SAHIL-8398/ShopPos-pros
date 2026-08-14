/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Plus, Factory, Notebook, ShoppingBag, Trash2, Calendar, FileText } from 'lucide-react';
import { Supplier, Product, PurchaseOrder, PurchaseItem } from '../types';
import { formatCurrency, generateId } from '../utils';
import { useDialog } from '../context/DialogContext';

interface SuppliersViewModalProps {
  suppliers: Supplier[];
  products: Product[];
  purchases: PurchaseOrder[];
  onClose: () => void;
  onSaveSupplier: (data: Partial<Supplier>) => void;
  onDeleteSupplier: (id: string) => void;
  onSavePurchaseOrder: (poData: { supplierId: string; items: PurchaseItem[]; total: number }) => void;
}

export const SuppliersViewModal: React.FC<SuppliersViewModalProps> = ({
  suppliers,
  products,
  purchases,
  onClose,
  onSaveSupplier,
  onDeleteSupplier,
  onSavePurchaseOrder,
}) => {
  const { showAlert } = useDialog();
  const [activeTab, setActiveTab] = useState<'list' | 'po' | 'hist'>('list');

  // Supplier Form state
  const [supFormId, setSupFormId] = useState<string | null>(null);
  const [supName, setSupFormName] = useState<string>('');
  const [supPhone, setSupFormPhone] = useState<string>('');
  const [supEmail, setSupFormEmail] = useState<string>('');
  const [supAddress, setSupFormAddress] = useState<string>('');
  const [isSupFormOpen, setIsSupFormOpen] = useState<boolean>(false);

  // Purchase Order Form state
  const [poSupplierId, setPoSupplierId] = useState<string>('');
  const [poSelectedProductId, setPoSelectedProductId] = useState<string>('');
  const [poQtyInput, setPoQtyInput] = useState<number>(1);
  const [poItems, setPoItems] = useState<PurchaseItem[]>([]);

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

  const handleSaveSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) {
      showAlert('Supplier Name is required!', 'Required Field');
      return;
    }

    onSaveSupplier({
      id: supFormId || undefined,
      name: supName.trim(),
      phone: supPhone.trim(),
      email: supEmail.trim(),
      address: supAddress.trim(),
    });
    setIsSupFormOpen(false);
  };

  const handleAddPOItem = () => {
    if (!poSelectedProductId) {
      showAlert('Select a product to restock!', 'Selection Required');
      return;
    }
    const targetProduct = products.find(p => p.id === poSelectedProductId);
    if (!targetProduct) return;

    const existingPoItem = poItems.find(i => i.id === poSelectedProductId);
    if (existingPoItem) {
      setPoItems(poItems.map(i => i.id === poSelectedProductId ? { ...i, qty: i.qty + poQtyInput } : i));
    } else {
      setPoItems([...poItems, {
        id: targetProduct.id,
        name: targetProduct.name,
        qty: poQtyInput,
        buyPrice: targetProduct.buyPrice || 0,
        unit: targetProduct.unit || 'pcs',
      }]);
    }

    setPoSelectedProductId('');
    setPoQtyInput(1);
  };

  const handleRemovePOItem = (idx: number) => {
    setPoItems(poItems.filter((_, i) => i !== idx));
  };

  const handleSavePOSubmit = () => {
    if (!poSupplierId) {
      showAlert('Please select a supplier Brand!', 'Supplier Required');
      return;
    }
    if (poItems.length === 0) {
      showAlert('Add at least one item quantity to restock order!', 'Items Required');
      return;
    }

    const poTotal = poItems.reduce((sum, item) => sum + item.buyPrice * item.qty, 0);

    onSavePurchaseOrder({
      supplierId: poSupplierId,
      items: poItems,
      total: poTotal,
    });

    setPoItems([]);
    setPoSupplierId('');
    setActiveTab('hist'); // go to PO purchase history
  };

  const poGrandTotal = poItems.reduce((sum, item) => sum + item.buyPrice * item.qty, 0);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1000] flex items-end sm:items-center justify-center p-3 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
        <div>
          {/* Header Panel */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Factory className="w-4 h-4" />
              </span>
              Suppliers Logistics Portal
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation subtabs */}
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-2xl gap-1 mb-4 select-none">
            <button
              onClick={() => { setActiveTab('list'); setIsSupFormOpen(false); }}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold whitespace-nowrap text-center transition-all cursor-pointer ${
                activeTab === 'list' && !isSupFormOpen
                  ? 'bg-indigo-600 text-white shadow-sm font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-850'
              }`}
            >
              Suppliers ({suppliers.length})
            </button>
            <button
              onClick={() => { setActiveTab('po'); setIsSupFormOpen(false); }}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold whitespace-nowrap text-center transition-all cursor-pointer ${
                activeTab === 'po' && !isSupFormOpen
                  ? 'bg-indigo-600 text-white shadow-sm font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-850'
              }`}
            >
              Create PO
            </button>
            <button
              onClick={() => { setActiveTab('hist'); setIsSupFormOpen(false); }}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold whitespace-nowrap text-center transition-all cursor-pointer ${
                activeTab === 'hist' && !isSupFormOpen
                  ? 'bg-indigo-600 text-white shadow-sm font-black'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-200/50 dark:hover:bg-slate-850'
              }`}
            >
              PO History ({purchases.length})
            </button>
          </div>

          {/* Supplier Directory Tab */}
          {activeTab === 'list' && !isSupFormOpen && (
            <div className="space-y-3.5">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  List of Suppliers
                </span>
                <button
                  onClick={() => handleOpenSupplierForm(null)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-[11px] font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5px]" />
                  Add Supplier
                </button>
              </div>

              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-0.5">
                {suppliers.length > 0 ? (
                  suppliers.map((s, idx) => (
                    <button
                      key={s.id || idx}
                      type="button"
                      onClick={() => handleOpenSupplierForm(s)}
                      className="w-full text-left bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-750 transition-colors cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-black text-slate-900 dark:text-slate-100 text-xs flex items-center gap-1.5 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          {s.name}
                        </span>
                        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                          Edit details ›
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 flex flex-wrap gap-2 items-center font-medium">
                        {s.phone && <span>📞 {s.phone}</span>}
                        {s.phone && s.email && <span className="text-slate-300 dark:text-slate-600">•</span>}
                        {s.email && <span className="lowercase">✉️ {s.email}</span>}
                        {s.address && <span className="text-slate-400 dark:text-slate-500 text-[10px] w-full block truncate">📍 {s.address}</span>}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-10 px-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
                    <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500">
                      <Factory className="w-5 h-5" />
                    </div>
                    <p className="text-xs text-slate-800 dark:text-slate-200 font-bold">No suppliers recorded in database</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">Click "Add Supplier" to create logistics and restock distributor details.</p>
                    <button
                      onClick={() => handleOpenSupplierForm(null)}
                      className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add First Supplier
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Supplier Form Sheet overlay */}
          {isSupFormOpen && (
            <form onSubmit={handleSaveSupplierSubmit} className="space-y-3.5 p-1 animate-fade-in">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-2.5 py-1 rounded-lg inline-block">
                  {supFormId ? '✏️ Modify Supplier Details' : '🌱 Register New Distributor'}
                </h4>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Supplier / Company Name *
                </label>
                <input
                  type="text"
                  value={supName}
                  onChange={(e) => setSupFormName(e.target.value)}
                  placeholder="e.g. Supreme Foods Wholesale"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={supPhone}
                    onChange={(e) => setSupFormPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none focus:border-indigo-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={supEmail}
                    onChange={(e) => setSupFormEmail(e.target.value)}
                    placeholder="sales@supreme.com"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none focus:border-indigo-500 lowercase font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Corporate HQ Address
                </label>
                <input
                  type="text"
                  value={supAddress}
                  onChange={(e) => setSupFormAddress(e.target.value)}
                  placeholder="Sector-4 Industrial Area, Pune"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-transform shadow-xs"
                >
                  Save Supplier Details
                </button>
                {supFormId && (
                  <button
                    type="button"
                    onClick={() => { onDeleteSupplier(supFormId); setIsSupFormOpen(false); }}
                    className="px-3.5 text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/60 active:scale-95 cursor-pointer"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsSupFormOpen(false)}
                  className="px-4 text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Log Purchase Order (PO) Tab */}
          {activeTab === 'po' && !isSupFormOpen && (
            <div className="space-y-3.5">
              {suppliers.length === 0 ? (
                <div className="text-center py-8 px-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl select-none space-y-2">
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-bold">⚠️ Add a Supplier First</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Distributors are required to issue Purchase Orders.</p>
                  <button
                    onClick={() => { setActiveTab('list'); handleOpenSupplierForm(null); }}
                    className="mt-1 px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                  >
                    + Register Supplier
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                      Distributing Supplier *
                    </label>
                    <select
                      value={poSupplierId}
                      onChange={(e) => setPoSupplierId(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 font-semibold"
                    >
                      <option value="">Choose Supplier...</option>
                      {suppliers.map((s, idx) => (
                        <option key={s.id || idx} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Restock goods rows creator */}
                  <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 p-3 rounded-2xl space-y-2.5">
                    <label className="block text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest leading-none">
                      Select Item & Restocking Quantity
                    </label>

                    <div className="flex gap-2">
                      <select
                        value={poSelectedProductId}
                        onChange={(e) => setPoSelectedProductId(e.target.value)}
                        className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 outline-none focus:border-indigo-500 font-medium"
                      >
                        <option value="">Choose merchandise...</option>
                        {products.map((p, idx) => (
                          <option key={p.id || idx} value={p.id}>
                            {p.name} (Stock: {p.qty})
                          </option>
                        ))}
                      </select>

                      <input
                        type="number"
                        min="1"
                        value={poQtyInput}
                        onChange={(e) => setPoQtyInput(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-16 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs text-slate-900 dark:text-slate-100 outline-none font-bold"
                      />

                      <button
                        type="button"
                        onClick={handleAddPOItem}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black cursor-pointer active:scale-95 transition-transform"
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  {/* Registered items catalog */}
                  {poItems.length > 0 ? (
                    <div className="max-h-[160px] overflow-y-auto space-y-2 pr-0.5 mt-2 bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-3 border border-slate-200 dark:border-slate-800">
                      {poItems.map((item, idx) => (
                        <div key={item.id || idx} className="flex justify-between items-center text-xs py-1.5 border-b border-dashed border-slate-200 dark:border-slate-800 last:border-none">
                          <div className="min-w-0 flex-1">
                            <span className="font-black text-slate-900 dark:text-slate-100 truncate block">{item.name}</span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold uppercase">
                              ×{item.qty} @ Rs.{formatCurrency(item.buyPrice)} cost
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 dark:text-slate-100">
                              Rs.{formatCurrency(item.buyPrice * item.qty)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemovePOItem(idx)}
                              className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg p-1 text-xs cursor-pointer"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center font-semibold py-2">
                      ⚠️ No merchandise restock items added to purchase order sheet.
                    </p>
                  )}

                  {poItems.length > 0 && (
                    <div className="pt-3 flex justify-between items-center border-t border-slate-200 dark:border-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-wider block">Estimated PO Cost</span>
                        <span className="text-base font-black text-slate-900 dark:text-slate-100">Rs.{formatCurrency(poGrandTotal)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSavePOSubmit}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-md cursor-pointer active:scale-95 transition-transform"
                      >
                        Complete Restock Intake
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* PO History Tab */}
          {activeTab === 'hist' && !isSupFormOpen && (
            <div className="space-y-3.5">
              <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider block leading-none">
                Historical PO Acquisitions Receipts
              </span>

              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-0.5">
                {purchases.length > 0 ? (
                  [...purchases].reverse().map((po, idx) => {
                    const matchedSupplier = suppliers.find(s => s.id === po.supplierId);
                    return (
                      <div
                        key={po.id || idx}
                        className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-750 p-3.5 rounded-2xl shadow-xs"
                      >
                        <div className="flex justify-between items-start w-full">
                          <div>
                            <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 flex items-center gap-1 leading-none">
                              Supplier: {matchedSupplier ? matchedSupplier.name : 'Unknown Distributor'}
                            </h4>
                            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mt-1.5 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                              {po.date} {po.time || ''}
                            </p>
                          </div>
                          <span className="font-black text-xs text-slate-900 dark:text-slate-100 flex-shrink-0 text-right">
                            Total: Rs.{formatCurrency(po.total)}
                          </span>
                        </div>

                        {/* List acquired goods */}
                        <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700/60 space-y-1">
                          {po.items.map((it, idx) => (
                            <div key={it.id || idx} className="text-[11px] text-slate-600 dark:text-slate-300 flex justify-between font-medium">
                              <span>• {it.name} <span className="text-slate-400 dark:text-slate-500 font-black">×{it.qty}</span></span>
                              <span className="font-bold text-slate-800 dark:text-slate-200">Rs.{formatCurrency(it.buyPrice * it.qty)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 px-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl">
                    <p className="text-xs text-slate-700 dark:text-slate-300 font-bold">No purchase orders created yet</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Navigate to "Create PO" to log merchandise acquisitions.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
