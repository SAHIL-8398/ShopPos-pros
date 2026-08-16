/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Store, 
  Phone, 
  MapPin, 
  FileText, 
  Percent, 
  QrCode, 
  Sparkles, 
  CheckCircle2, 
  X, 
  Receipt,
  CreditCard,
  Sliders,
  AlertCircle
} from 'lucide-react';
import { Settings } from '../types';

interface StoreOnboardingModalProps {
  settings: Settings;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedSettings: Partial<Settings>) => void;
}

export const StoreOnboardingModal: React.FC<StoreOnboardingModalProps> = ({
  settings,
  isOpen,
  onClose,
  onSave,
}) => {
  const [shopName, setShopName] = useState<string>(settings.shopName || '');
  const [phone, setPhone] = useState<string>(settings.phone || '');
  const [address, setAddress] = useState<string>(settings.address || '');
  const [currency, setCurrency] = useState<string>(settings.currency || 'Rs.');
  const [gstin, setGstin] = useState<string>(settings.gstin || '');
  const [fssai, setFssai] = useState<string>(settings.fssai || '');
  const [gstEnabled, setGstEnabled] = useState<boolean>(settings.gstEnabled !== false);
  const [defaultGstPct, setDefaultGstPct] = useState<number>(settings.defaultGstPct || 18);
  const [upi, setUpi] = useState<string>(settings.upi || '');
  const [footer, setFooter] = useState<string>(settings.footer || 'Thank you! Visit again');
  const [financialYear, setFinancialYear] = useState<string>(settings.financialYear || '2026-27');
  const [lowStockDefault, setLowStockDefault] = useState<number>(settings.lowStockDefault || 10);
  const [nearExpiryDefault, setNearExpiryDefault] = useState<number>(settings.nearExpiryDefault || 30);
  const [termsTextOnBill, setTermsTextOnBill] = useState<string>(
    settings.termsTextOnBill || '1. Goods once sold cannot be returned without original receipt.\n2. Warranty as per manufacturer terms.'
  );
  const [showTermsOnBill, setShowTermsOnBill] = useState<boolean>(settings.showTermsOnBill !== false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  // Calculate completeness score
  const items = [
    { name: 'Shop Name', filled: Boolean(shopName.trim()) },
    { name: 'Phone', filled: Boolean(phone.trim()) },
    { name: 'Address', filled: Boolean(address.trim()) },
    { name: 'UPI ID', filled: Boolean(upi.trim()) },
    { name: 'GSTIN', filled: Boolean(gstin.trim()) },
    { name: 'Footer Note', filled: Boolean(footer.trim()) },
  ];
  const filledCount = items.filter(i => i.filled).length;
  const completenessPercent = Math.round((filledCount / items.length) * 100);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) {
      setErrorMsg('Shop Name is required');
      return;
    }

    onSave({
      shopName: shopName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      currency: currency.trim() || 'Rs.',
      gstin: gstin.trim().toUpperCase(),
      fssai: fssai.trim(),
      gstEnabled,
      defaultGstPct: Number(defaultGstPct) || 18,
      upi: upi.trim(),
      footer: footer.trim() || 'Thank you! Visit again',
      financialYear: financialYear.trim() || '2026-27',
      lowStockDefault: Number(lowStockDefault) || 10,
      nearExpiryDefault: Number(nearExpiryDefault) || 30,
      termsTextOnBill: termsTextOnBill.trim(),
      showTermsOnBill,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl text-white overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">Store Profile & Billing Setup</h3>
              <p className="text-xs text-slate-400">Personalize your receipts, tax compliance, and instant UPI QR</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Completeness Bar */}
        <div className="px-6 py-3 bg-indigo-950/30 border-b border-indigo-900/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-indigo-300">Profile Completeness:</span>
            <span className="text-xs font-black text-indigo-400">{completenessPercent}%</span>
          </div>
          <div className="flex-1 max-w-xs bg-slate-800 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${completenessPercent}%` }}
            />
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="text-xs text-rose-300 bg-rose-950/60 p-3 rounded-2xl font-bold border border-rose-800/80 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Section 1: Store & Contact Info */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Store className="w-3.5 h-3.5" /> 1. Store Identity & Contact
            </h4>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Shop / Business Name <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                required
                placeholder="e.g. My Supermarket"
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-bold placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Phone / Mobile Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Currency Symbol
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Rs.">Rs. (Rupees Text)</option>
                  <option value="₹">₹ (Rupee Symbol)</option>
                  <option value="$">$ (USD)</option>
                  <option value="AED">AED (Dirham)</option>
                  <option value="£">£ (Pound)</option>
                  <option value="€">€ (Euro)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Store Address
              </label>
              <textarea
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Shop 12, Ground Floor, Central Mall, MG Road"
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
          </div>

          {/* Section 2: Tax & Payments */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5" /> 2. Tax Registrations & UPI QR
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  GSTIN (GST Number)
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value.toUpperCase())}
                  placeholder="e.g. 27AAAAA0000A1Z5"
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white font-mono uppercase font-bold placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  FSSAI License (Food/Grocery)
                </label>
                <input
                  type="text"
                  maxLength={14}
                  value={fssai}
                  onChange={(e) => setFssai(e.target.value)}
                  placeholder="e.g. 10019022009876"
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white font-mono font-bold placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Merchant UPI ID (Bharat QR on Receipts)
              </label>
              <input
                type="text"
                value={upi}
                onChange={(e) => setUpi(e.target.value)}
                placeholder="e.g. shopname@upi or merchant@okaxis"
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono font-bold placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Enable GST Breakdown</span>
                <span className="text-[10px] text-slate-400">Calculate CGST/SGST on billing</span>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={defaultGstPct}
                  onChange={(e) => setDefaultGstPct(Number(e.target.value))}
                  disabled={!gstEnabled}
                  className="bg-slate-900 border border-slate-700 text-xs text-white rounded-lg px-2 py-1 focus:outline-none"
                >
                  <option value={0}>0% GST</option>
                  <option value={5}>5% GST</option>
                  <option value={12}>12% GST</option>
                  <option value={18}>18% GST</option>
                  <option value={28}>28% GST</option>
                </select>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gstEnabled}
                    onChange={(e) => setGstEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Receipt & Defaults */}
          <div className="space-y-3 pt-3 border-t border-slate-800">
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5" /> 3. Receipt Tagline & Stock Alerts
            </h4>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Receipt Footer Tagline
              </label>
              <input
                type="text"
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                placeholder="e.g. Thank you! Visit again"
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Low Stock Warning (Units)
                </label>
                <input
                  type="number"
                  min={1}
                  value={lowStockDefault}
                  onChange={(e) => setLowStockDefault(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                  Near Expiry Warning (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  value={nearExpiryDefault}
                  onChange={(e) => setNearExpiryDefault(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white font-bold focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                Terms & Conditions on Bills
              </label>
              <textarea
                rows={2}
                value={termsTextOnBill}
                onChange={(e) => setTermsTextOnBill(e.target.value)}
                placeholder="e.g. Goods once sold cannot be returned without receipt"
                className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 text-white" />
              Save Shop Details
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
