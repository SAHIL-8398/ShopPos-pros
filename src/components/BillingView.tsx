/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, Scan, User, Phone, MapPin, CheckCircle, Bookmark, Sparkles, Clock, Printer } from 'lucide-react';
import { Product, SaleItem, Settings } from '../types';
import { formatCurrency, generateQuotationPDF, generateDeliveryChallanPDF } from '../utils';
import { useTranslation } from '../context/LocalizationContext';

interface BillingViewProps {
  products: Product[];
  cart: SaleItem[];
  onAddToCart: (product: Product) => void;
  onRemoveFromCart: (productId: string) => void;
  onChangeCartQty: (productId: string, delta: number) => void;
  onClearCart: () => void;
  onOpenScanner: () => void;
  onCheckout: (customerInfo: { name: string; phone: string; address: string }) => void;
  suspendedCarts?: {
    id: string;
    note: string;
    cart: SaleItem[];
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    createdAt: string;
  }[];
  onSuspendCart?: (note: string) => void;
  onResumeCart?: (id: string) => void;
  onDeleteSuspendedCart?: (id: string) => void;
  showConfirm?: (message: string, title?: string) => Promise<boolean>;
  showPrompt?: (message: string, defaultValue?: string, title?: string, placeholder?: string) => Promise<string | null>;
  onPrintLastBill?: () => void;
  settings?: Settings;
}

export const BillingView: React.FC<BillingViewProps> = ({
  products,
  cart,
  onAddToCart,
  onRemoveFromCart,
  onChangeCartQty,
  onClearCart,
  onOpenScanner,
  onCheckout,
  suspendedCarts = [],
  onSuspendCart,
  onResumeCart,
  onDeleteSuspendedCart,
  showConfirm,
  showPrompt,
  onPrintLastBill,
  settings,
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState<string>('');
  const [custName, setCustName] = useState<string>('');
  const [custPhone, setCustPhone] = useState<string>('');
  const [custAddress, setCustAddress] = useState<string>('');

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-add product when exact barcode match is found (perfect for physical barcode scanners)
  useEffect(() => {
    const cleanSearch = search.trim().toLowerCase();
    if (cleanSearch.length >= 3) {
      const exactMatch = products.find(p => p.barcode && p.barcode.toLowerCase() === cleanSearch);
      if (exactMatch) {
        if (exactMatch.qty > 0) {
          onAddToCart(exactMatch);
          setSearch('');
          // Re-focus search field
          setTimeout(() => {
            searchInputRef.current?.focus();
          }, 50);
        }
      }
    }
  }, [search, products, onAddToCart]);

  const cartTotalQty = cart.reduce((sum, item) => sum + item.qty, 0);
  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  // Search filter
  const cleanSearch = search.toLowerCase().trim();
  const foundProducts = cleanSearch
    ? products
        .filter(p => p.name.toLowerCase().includes(cleanSearch) || (p.barcode && p.barcode.toLowerCase().includes(cleanSearch)))
        .slice(0, 5)
    : [];

  const handleCheckoutSubmit = () => {
    if (cart.length === 0) return;
    onCheckout({
      name: custName.trim(),
      phone: custPhone.trim(),
      address: custAddress.trim(),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Interactive top billing search actions */}
      <div className="flex gap-2 relative">
        <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-xl px-3 py-2.5 flex items-center gap-2 shadow-2xs focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500/20 transition-all">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Type product name or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                const targetCode = search.trim().toLowerCase();
                if (!targetCode) return;

                // 1. Try exact barcode match
                const exactMatch = products.find(p => p.barcode && p.barcode.toLowerCase() === targetCode);
                if (exactMatch) {
                  if (exactMatch.qty > 0) {
                    onAddToCart(exactMatch);
                    setSearch('');
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  } else {
                    alert(`Product "${exactMatch.name}" is out of stock.`);
                  }
                  return;
                }

                // 2. Try exact name match
                const nameMatch = products.find(p => p.name.toLowerCase() === targetCode);
                if (nameMatch) {
                  if (nameMatch.qty > 0) {
                    onAddToCart(nameMatch);
                    setSearch('');
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  }
                  return;
                }

                // 3. Fallback: if there is exactly 1 product shown in search results, add it!
                if (foundProducts.length === 1) {
                  const singleProduct = foundProducts[0];
                  if (singleProduct.qty > 0) {
                    onAddToCart(singleProduct);
                    setSearch('');
                    setTimeout(() => searchInputRef.current?.focus(), 50);
                  }
                }
              }
            }}
            className="flex-1 text-sm bg-transparent border-none outline-none focus:ring-0 text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-550"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-xs font-black text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350 uppercase tracking-wider"
            >
              Clear
            </button>
          )}
        </div>
        <button
          onClick={onOpenScanner}
          className="px-3.5 bg-slate-900 dark:bg-slate-800 border border-slate-850 dark:border-slate-700 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-white flex items-center justify-center cursor-pointer font-bold active:scale-95 transition-all shadow-2xs"
          title="Open Scanner Camera"
        >
          <Scan className="w-5 h-5" />
        </button>
      </div>

      {onPrintLastBill && (
        <div className="flex justify-end -mt-2 -mb-1 animate-fade-in">
          <button
            type="button"
            onClick={onPrintLastBill}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-indigo-100 dark:border-indigo-900/50 shadow-3xs cursor-pointer active:scale-95"
            title="Instant reprint of last checked-out sale invoice"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Quick Print Last Bill</span>
          </button>
        </div>
      )}

      {/* Quick Fast-Add shortcuts grid dashboard */}
      {products.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-850 rounded-xl p-2.5">
          <div className="flex justify-between items-center mb-1.5 select-none px-1">
            <span className="text-[9px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-500 animate-pulse fill-amber-300" />
              Quick POS Grid
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
            {products.slice(0, 6).map(p => {
              const isOutOfStock = p.qty <= 0;
              return (
                <button
                  key={`quick-${p.id}`}
                  type="button"
                  disabled={isOutOfStock}
                  onClick={() => onAddToCart(p)}
                  className={`text-left text-[10px] p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-xl flex flex-col justify-between transition-all select-none gap-0.5 shadow-2xs ${
                    isOutOfStock 
                      ? 'opacity-40 cursor-not-allowed bg-slate-100/50 dark:bg-slate-950/50' 
                      : 'cursor-pointer hover:border-indigo-500/20 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 active:scale-[0.97]'
                  }`}
                >
                  <span className="font-extrabold text-slate-700 dark:text-slate-200 truncate block w-full leading-tight">
                    {p.name}
                  </span>
                  <div className="flex justify-between items-center w-full leading-none mt-0.5">
                    <span className="text-[10px] font-black text-indigo-650 dark:text-indigo-400">
                      {settings?.currency || 'Rs.'}{formatCurrency(p.sellPrice || p.mrp)}
                    </span>
                    <span className="text-[8px] text-slate-450 dark:text-slate-500 font-bold uppercase tracking-wider">
                      Qty: {p.qty}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Searched Dynamic Results dropdown matches */}
      {foundProducts.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 rounded-2xl p-2 space-y-1 shadow-md max-h-[220px] overflow-y-auto">
          {foundProducts.map(p => {
            const inCartItem = cart.find(i => i.id === p.id);
            const isOutOfStock = p.qty <= 0;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  onAddToCart(p);
                  setSearch(''); // clear search on tap
                }}
                className={`w-full text-left p-2 rounded-lg border flex justify-between items-center transition-all ${
                  isOutOfStock 
                    ? 'border-rose-100 dark:border-rose-950/40 bg-rose-50/20 dark:bg-rose-950/20 opacity-75 cursor-not-allowed' 
                    : inCartItem
                      ? 'border-emerald-100 dark:border-emerald-950 bg-emerald-50/10 dark:bg-emerald-950/10'
                      : 'border-slate-100 dark:border-slate-800/60 hover:bg-slate-50 dark:hover:bg-slate-850'
                }`}
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="text-[11px] font-extrabold text-slate-850 dark:text-slate-200 truncate">{p.name}</div>
                  <div className="text-[9px] text-slate-450 dark:text-slate-500 font-semibold mt-0.5 uppercase tracking-wider">
                    {p.category} {p.barcode ? `• Barcode: ${p.barcode}` : ''}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-[11px] font-black text-slate-900 dark:text-slate-100">
                    {settings?.currency || 'Rs.'}{formatCurrency(p.sellPrice || p.mrp)}
                  </div>
                  {isOutOfStock ? (
                    <span className="text-[8px] font-black text-rose-500 bg-rose-50 dark:bg-rose-950/60 px-1 py-0.5 rounded-full uppercase tracking-wider">
                      Out of stock
                    </span>
                  ) : (
                    <span className={`text-[8px] font-black px-1 py-0.5 rounded-full uppercase tracking-wider ${
                        p.qty <= (p.lowStockAlert || 5) ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      In: {p.qty} {p.unit || 'pcs'}
                    </span>
                  )}
                  {inCartItem && (
                    <div className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      In Cart: {inCartItem.qty}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* List of Suspended Carts in Hold Queue */}
      {suspendedCarts.length > 0 && (
        <div className="bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/10 rounded-2xl p-2.5 space-y-1.5 mt-1">
          <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-400 text-[9.5px] font-black uppercase tracking-wider select-none">
            <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-450 animate-spin" />
            Held Baskets Queue ({suspendedCarts.length})
          </div>
          <div className="grid grid-cols-1 gap-1.5 max-h-[140px] overflow-y-auto pr-0.5">
            {suspendedCarts.map(item => {
              const totalItems = item.cart.reduce((sum, i) => sum + i.qty, 0);
              const totalCost = item.cart.reduce((sum, i) => sum + i.price * i.qty, 0);
              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-2 flex justify-between items-center shadow-2xs hover:border-amber-500/20 transition-all"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="text-[10px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <span className="truncate max-w-[130px] font-black">"{item.note}"</span>
                      <span className="text-[8px] text-slate-400 dark:text-slate-500 font-extrabold shrink-0 uppercase tracking-wider">{item.createdAt}</span>
                    </div>
                    <div className="text-[9px] text-slate-450 dark:text-slate-500 font-semibold mt-0.5 truncate leading-none uppercase tracking-wider">
                      {totalItems} items • <strong className="text-slate-700 dark:text-slate-300 font-bold">{settings?.currency || 'Rs.'}{formatCurrency(totalCost)}</strong> {item.customerName ? `(${item.customerName})` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => onResumeCart && onResumeCart(item.id)}
                      className="px-2 py-0.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-[8px] rounded-md cursor-pointer active:scale-95 transition-all uppercase tracking-wider"
                    >
                      Resume
                    </button>
                    {onDeleteSuspendedCart && (
                      <button
                        type="button"
                        onClick={() => onDeleteSuspendedCart(item.id)}
                        className="p-1 hover:bg-rose-500/10 text-rose-500 rounded-lg cursor-pointer transition-colors"
                        title="Discard held cart"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cart checkout listing */}
      <div className="space-y-2.5">
        <div className="flex justify-between items-center mb-1 select-none pt-1">
          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
            <ShoppingCart className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
            {t('billing')} ({cart.length} {cart.length === 1 ? 'line' : 'lines'})
          </span>
          <div className="flex items-center gap-3">
            {cart.length > 0 && onSuspendCart && (
              <button
                type="button"
                onClick={async () => {
                  const defaultVal = `Basket #${suspendedCarts.length + 1}`;
                  const promptFn = showPrompt || (async (msg, def) => window.prompt(msg, def));
                  const note = await promptFn(
                    'Enter a short note or seat number for this suspended basket:',
                    defaultVal,
                    'Hold Basket'
                  );
                  if (note === null) return; // cancelled
                  
                  onSuspendCart(note.trim() || defaultVal);
                  // Clear form fields
                  setCustName('');
                  setCustPhone('');
                  setCustAddress('');
                }}
                className="text-[10px] font-black text-indigo-650 dark:text-indigo-400 flex items-center gap-1 hover:text-indigo-500 uppercase tracking-widest cursor-pointer"
                title="Hold current cart state"
              >
                <Bookmark className="w-3.5 h-3.5 fill-indigo-100 text-indigo-650 dark:text-indigo-400" />
                Hold Basket
              </button>
            )}
            {cart.length > 0 && (
              <button
                onClick={onClearCart}
                className="text-[10px] font-black text-rose-550 hover:text-rose-450 flex items-center gap-1 uppercase tracking-widest cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Empty Cart
              </button>
            )}
          </div>
        </div>

        {cart.length > 0 ? (
          <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
            {cart.map(item => (
              <div
                key={item.id}
                className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xs rounded-xl p-2 flex justify-between items-center gap-2 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-extrabold text-slate-800 dark:text-slate-100 truncate leading-tight">
                    {item.name}
                  </div>
                  <div className="text-[9px] text-slate-450 dark:text-slate-500 font-bold mt-0.5">
                    {settings?.currency || 'Rs.'}{formatCurrency(item.price)} × {item.qty} = <strong className="text-slate-700 dark:text-slate-300 font-extrabold">{settings?.currency || 'Rs.'}{formatCurrency(item.price * item.qty)}</strong>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => onChangeCartQty(item.id, -1)}
                    className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-650 dark:text-rose-400 font-black flex items-center justify-center hover:bg-rose-500/20 transition-colors active:scale-90"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center text-xs font-black text-slate-850 dark:text-slate-100">
                    {item.qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => onChangeCartQty(item.id, 1)}
                    className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 font-black flex items-center justify-center hover:bg-emerald-500/20 transition-colors active:scale-90"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 select-none">
            <span className="text-4xl">🛒</span>
            <h3 className="font-extrabold text-slate-500 dark:text-slate-400 text-xs mt-2 uppercase tracking-wider">Registers are currently empty</h3>
            <p className="text-[10px] text-slate-450 dark:text-slate-555 mt-1">
              Type product keywords or search barcodes above to populate checkout cart.
            </p>
          </div>
        )}
      </div>

      {/* Cart Customer and Checklist panels */}
      {cart.length > 0 && (
        <div className="bg-slate-950 border border-slate-900 rounded-2xl p-4 text-slate-100 space-y-4 shadow-md mt-2">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{cartTotalQty} total units</span>
            <span className="text-xl font-black text-white">{settings?.currency || 'Rs.'}{formatCurrency(cartSubtotal)}</span>
          </div>

          <div className="border-t border-slate-900 pt-3">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 pl-0.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-400" />
              Customer Ledgers (Optional)
            </label>
            <input
              type="text"
              placeholder="Walk-in Customer Name"
              value={custName}
              onChange={(e) => setCustName(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 mb-2.5 focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
                <Phone className="w-3.5 h-3.5 text-slate-650" />
                <input
                  type="tel"
                  placeholder="Contact Mobile"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  maxLength={10}
                  className="flex-1 bg-transparent border-none text-xs text-white focus:outline-none placeholder-slate-600"
                />
              </div>

              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
                <MapPin className="w-3.5 h-3.5 text-slate-600" />
                <input
                  type="text"
                  placeholder="Street Address"
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  className="flex-1 bg-transparent border-none text-xs text-white focus:outline-none placeholder-slate-600"
                />
              </div>
            </div>

            {/* Estimate/Quotation and Dispatch Note Challan Action Grid */}
            <div className="grid grid-cols-2 gap-2 mb-1">
              <button
                type="button"
                onClick={() => {
                  generateQuotationPDF(
                    cart,
                    { name: custName, phone: custPhone, address: custAddress },
                    {
                      shopName: settings?.shopName || 'ShopPOS Pro Store',
                      address: settings?.address || '',
                      phone: settings?.phone || '',
                      gstin: settings?.gstin || '',
                      currency: settings?.currency
                    }
                  );
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 hover:border-slate-700 text-[10px] font-black uppercase rounded-xl active:scale-95 transition-all cursor-pointer tracking-wider"
                title="Download price quote estimate PDF"
              >
                📄 Quote Estimate
              </button>

              <button
                type="button"
                onClick={() => {
                  generateDeliveryChallanPDF(
                    cart.map(item => ({
                      name: item.name,
                      qty: item.qty,
                      unit: item.unit,
                      shelfLocation: item.shelfLocation
                    })),
                    { name: custName, phone: custPhone, address: custAddress },
                    {
                      shopName: settings?.shopName || 'ShopPOS Pro Store',
                      address: settings?.address || '',
                      phone: settings?.phone || '',
                      currency: settings?.currency
                    }
                  );
                }}
                className="flex items-center justify-center gap-1.5 py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 hover:border-slate-700 text-[10px] font-black uppercase rounded-xl active:scale-95 transition-all cursor-pointer tracking-wider"
                title="Download delivery dispatch challan note PDF"
              >
                🚚 Delivery Challan
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCheckoutSubmit}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-sm rounded-xl active:scale-[0.985] transition-all shadow-md shadow-emerald-500/10 cursor-pointer"
          >
            <CheckCircle className="w-4 h-4 fill-white" />
            {t('checkout')} → {settings?.currency || 'Rs.'}{formatCurrency(cartSubtotal)}
          </button>
        </div>
      )}
    </div>
  );
};
