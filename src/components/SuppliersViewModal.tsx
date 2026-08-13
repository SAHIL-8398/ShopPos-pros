/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { X, Plus, Factory, Notebook, ShoppingBag, Trash2, Calendar, FileText } from 'lucide-react';
import { Supplier, Product, PurchaseOrder, PurchaseItem } from '../types';
import { formatCurrency, generateId } from '../utils';

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
    if (!supName.trim()) return alert('Supplier Name is required!');

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
    if (!poSelectedProductId) return alert('Select a product to restocks!');
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
    if (!poSupplierId) return alert('Please select a supplier Brand!');
    if (poItems.length === 0) return alert('Add at least one item quantity to restock order!');

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
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-base font-extrabold text-slate-850 dark:text-slate-100 flex items-center gap-1.5">
              <Factory className="w-5 h-5 text-indigo-500" />
              Suppliers Logistics Portal
            </h3>
            <button
              onClick={onClose}
              className="p-1 text-slate-450 hover:text-slate-600 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation subtabs */}
          <div className="flex gap-1 overflow-x-auto pb-1 select-none border-b border-slate-100 mb-4">
            <button
              onClick={() => { setActiveTab('list'); setIsSupFormOpen(false); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap text-center transition-colors ${
                activeTab === 'list' && !isSupFormOpen ? 'bg-indigo-50 text-indigo-650' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Suppliers Directory ({suppliers.length})
            </button>
            <button
              onClick={() => { setActiveTab('po'); setIsSupFormOpen(false); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap text-center transition-colors ${
                activeTab === 'po' && !isSupFormOpen ? 'bg-indigo-50 text-indigo-650' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              Log Purchase Order (PO)
            </button>
            <button
              onClick={() => { setActiveTab('hist'); setIsSupFormOpen(false); }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap text-center transition-colors ${
                activeTab === 'hist' && !isSupFormOpen ? 'bg-indigo-50 text-indigo-650' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              PO Logs History ({purchases.length})
            </button>
          </div>

          {/* Supplier Directory Tab */}
          {activeTab === 'list' && !isSupFormOpen && (
            <div className="space-y-3.5">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  List of Suppliers
                </span>
                <button
                  onClick={() => handleOpenSupplierForm(null)}
                  className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-[11px] font-black hover:bg-emerald-100 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5px]" />
                  Add Supplier
                </button>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {suppliers.length > 0 ? (
                  suppliers.map((s, idx) => (
                    <button
                      key={s.id || idx}
                      type="button"
                      onClick={() => handleOpenSupplierForm(s)}
                      className="w-full text-left bg-slate-50 hover:bg-slate-100/80 p-3 rounded-xl border border-slate-150 transition-colors cursor-pointer group flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-extrabold text-slate-800 text-xs flex items-center gap-1 group-hover:text-indigo-650">
                          {s.name}
                        </span>
                        <span className="text-[10px] font-semibold text-slate-400 group-hover:text-slate-500">
                          Edit details ›
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex flex-wrap gap-2 items-center font-medium">
                        {s.phone && <span>📞 {s.phone}</span>}
                        {s.phone && s.email && <span>•</span>}
                        {s.email && <span className="lowercase">✉️ {s.email}</span>}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="text-center py-10 bg-slate-50 border border-slate-150 rounded-xl">
                    <p className="text-xs text-slate-450 font-bold">No suppliers recorded in database</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Click "Add Supplier" to create logistics details.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Supplier Form Sheet overlay */}
          {isSupFormOpen && (
            <form onSubmit={handleSaveSupplierSubmit} className="space-y-3 p-1 animate-fade-in">
              <h4 className="text-xs font-black text-rose-850 bg-rose-50 px-2 py-1 rounded inline-block">
                {supFormId ? '✏️ Modify Supplier Log' : '🌱 Register New Distributor'}
              </h4>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Supplier / Company Name *
                </label>
                <input
                  type="text"
                  value={supName}
                  onChange={(e) => setSupFormName(e.target.value)}
                  placeholder="e.g. Supreme Foods Wholesale"
                  required
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={supPhone}
                    onChange={(e) => setSupFormPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={supEmail}
                    onChange={(e) => setSupFormEmail(e.target.value)}
                    placeholder="sales@supreme.com"
                    className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 lowercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Corporate HQ Address
                </label>
                <input
                  type="text"
                  value={supAddress}
                  onChange={(e) => setSupFormAddress(e.target.value)}
                  placeholder="Sector-4 Industrial Area, Pune"
                  className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-770 text-white text-xs font-black uppercase rounded-xl flex items-center justify-center gap-1 cursor-pointer active:scale-95 transition-transform"
                >
                  Save Supplier Details
                </button>
                {supFormId && (
                  <button
                    type="button"
                    onClick={() => { onDeleteSupplier(supFormId); setIsSupFormOpen(false); }}
                    className="px-3 text-xs bg-rose-50 text-rose-600 border border-rose-100 rounded-xl active:scale-95"
                  >
                    Delete Supplier
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsSupFormOpen(false)}
                  className="px-3.5 text-xs bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-255"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Log Purchase Order (PO) Tab */}
          {activeTab === 'po' && !isSupFormOpen && (
            <div className="space-y-3">
              {suppliers.length === 0 ? (
                <div className="text-center py-6 bg-slate-50 border border-slate-150 rounded-xl select-none">
                  <p className="text-xs text-slate-450 font-bold mb-1">⚠️ Add a Supplier First</p>
                  <p className="text-[10px] text-slate-400">Distributors are required to issue Purchase Orders.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Distributing Supplier *
                    </label>
                    <select
                      value={poSupplierId}
                      onChange={(e) => setPoSupplierId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 font-semibold"
                    >
                      <option value="">Choose Supplier...</option>
                      {suppliers.map((s, idx) => (
                        <option key={s.id || idx} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Restock goods rows creator */}
                  <div className="border border-slate-200 select-none bg-slate-50/50 p-2.5 rounded-xl space-y-2">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                      Select Item & Restocking Quantity
                    </label>

                    <div className="flex gap-2">
                      <select
                        value={poSelectedProductId}
                        onChange={(e) => setPoSelectedProductId(e.target.value)}
                        className="flex-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none"
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
                        className="w-16 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs text-slate-800 dark:text-slate-200 outline-none font-bold"
                      />

                      <button
                        type="button"
                        onClick={handleAddPOItem}
                        className="px-3 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-black select-all active:scale-95 transition-transform"
                      >
                        + Add
                      </button>
                    </div>
                  </div>

                  {/* Registered items catalog */}
                  {poItems.length > 0 ? (
                    <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-0.5 mt-2 bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                      {poItems.map((item, idx) => (
                        <div key={item.id || idx} className="flex justify-between items-center text-xs py-1 border-b border-dashed border-slate-205 last:border-none">
                          <div className="min-w-0 flex-1">
                            <span className="font-extrabold text-slate-850 truncate block">{item.name}</span>
                            <span className="text-[10px] text-slate-400 font-semibold uppercase">
                              ×{item.qty} @ Rs.{formatCurrency(item.buyPrice)} cost
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900">
                              Rs.{formatCurrency(item.buyPrice * item.qty)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemovePOItem(idx)}
                              className="text-rose-500 hover:bg-rose-50 rounded-lg p-1 text-xs"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[9px] text-slate-450 text-center font-bold py-2">
                      ⚠️ No merchandise restock items added to purchase order sheet.
                    </p>
                  )}

                  {poItems.length > 0 && (
                    <div className="pt-2 flex justify-between items-center border-t border-slate-150">
                      <div>
                        <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block">Estimated PO Cost</span>
                        <span className="text-base font-black text-slate-900">Rs.{formatCurrency(poGrandTotal)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleSavePOSubmit}
                        className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-xs font-black shadow-md hover:bg-indigo-755 cursor-pointer"
                      >
                        Complete restock intake
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
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block leading-none">
                Historical PO Acquisitions receipts
              </span>

              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-0.5">
                {purchases.length > 0 ? (
                  [...purchases].reverse().map((po, idx) => {
                    const matchedSupplier = suppliers.find(s => s.id === po.supplierId);
                    return (
                      <div
                        key={po.id || idx}
                        className="bg-white border border-slate-200 p-3 rounded-xl shadow-xs"
                      >
                        <div className="flex justify-between items-start w-full">
                          <div>
                            <h4 className="text-xs font-black text-indigo-700 flex items-center gap-1 leading-none">
                              Supplier: {matchedSupplier ? matchedSupplier.name : 'Unknown Distributor'}
                            </h4>
                            <p className="text-[9px] text-slate-400 font-bold mt-1.5 flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {po.date} {po.time || ''}
                            </p>
                          </div>
                          <span className="font-extrabold text-xs text-slate-900 flex-shrink-0 text-right">
                            Total: Rs.{formatCurrency(po.total)}
                          </span>
                        </div>

                        {/* List acquired goods */}
                        <div className="mt-2 pt-2 border-t border-slate-155 space-y-1">
                          {po.items.map((it, idx) => (
                            <div key={it.id || idx} className="text-[10px] text-slate-600 flex justify-between font-medium">
                              <span>• {it.name} <span className="text-slate-400 font-extrabold">×{it.qty}</span></span>
                              <span className="font-semibold text-slate-800">Rs.{formatCurrency(it.buyPrice * it.qty)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-10 bg-slate-50 border border-slate-150 rounded-xl">
                    <p className="text-xs text-slate-450 font-bold">No purchase orders created yet</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Navigate to PO creation to log acquisitions.</p>
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
