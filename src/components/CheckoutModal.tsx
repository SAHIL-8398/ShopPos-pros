/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Percent, QrCode, CreditCard, Landmark, DollarSign, Search, UserMinus, Award, RefreshCw, Copy, Check, Maximize2, Smartphone, AlertCircle, Edit3, ShieldCheck, CheckCircle2, ChevronRight } from 'lucide-react';
import { Customer, Staff, SaleItem, Settings, Sale } from '../types';
import { formatCurrency, generateId, generateUpiQrDataUrl, buildUpiPayload, copyToClipboard } from '../utils';
import { useDialog } from '../context/DialogContext';

interface CheckoutModalProps {
  cart: SaleItem[];
  customers: Customer[];
  staff: Staff[];
  settings: Settings;
  onClose: () => void;
  onComplete: (saleData: {
    discount: number;
    gstPct: number;
    gst: number;
    total: number;
    profit: number;
    paymentMethod: 'cash' | 'upi' | 'card' | 'credit' | 'split';
    splitDetails?: { cashAmount: number; upiAmount: number; cardAmount?: number };
    creditCustId: string | null;
    staffId: string;
    staffName: string;
    pointsRedeemed?: number;
    newCustomer?: { name: string; phone: string; email?: string; address?: string };
    interStateGst?: boolean;
    upiTxnId?: string;
  }) => Promise<void> | void;
  onShowUPIQR?: (amt: number) => void;
  sales?: Sale[];
  activeStaffId?: string | null;
  showAlert?: (msg: string, title?: string) => Promise<void>;
  onUpdateSettings?: (newSettings: Partial<Settings>) => Promise<void> | void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  cart,
  customers,
  staff,
  settings,
  onClose,
  onComplete,
  onShowUPIQR,
  sales = [],
  activeStaffId = null,
  showAlert: propShowAlert,
  onUpdateSettings,
}) => {
  const dialog = useDialog();
  const showAlert = propShowAlert || dialog.showAlert;
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [discountValue, setDiscountValue] = useState<string>('');
  const [discountType, setDiscountType] = useState<'flat' | 'pct'>('flat');
  const [gstPctVal, setGstPctVal] = useState<string>('');
  const [staffId, setStaffId] = useState<string>(activeStaffId || '');
  const [staffPin, setStaffPin] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'card' | 'credit' | 'split'>('cash');
  const [cashReceived, setCashReceived] = useState<string>('');
  const [splitCashAmount, setSplitCashAmount] = useState<string>('');
  const [splitCardAmount, setSplitCardAmount] = useState<string>('');
  const [interStateGst, setInterStateGst] = useState<boolean>(false);

  // Dynamic Pay via QR states
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isGeneratingQr, setIsGeneratingQr] = useState<boolean>(false);
  const [isEnlargedQrOpen, setIsEnlargedQrOpen] = useState<boolean>(false);
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [customUtr, setCustomUtr] = useState<string>('');
  const [inlineUpiInput, setInlineUpiInput] = useState<string>(settings.upi || '');
  const [isEditingInlineUpi, setIsEditingInlineUpi] = useState<boolean>(false);

  const [upiSimStatus, setUpiSimStatus] = useState<'idle' | 'waiting' | 'success'>('idle');
  const [upiSimCountdown, setUpiSimCountdown] = useState<number>(8);
  const [simTxnId, setSimTxnId] = useState<string>('');

  // Customer Credit state search
  const [credSearch, setCredSearch] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // New vs Existing Customer states
  const [customerType, setCustomerType] = useState<'existing' | 'new'>('existing');
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [newCustEmail, setNewCustEmail] = useState<string>('');
  const [newCustAddress, setNewCustAddress] = useState<string>('');

  const cartSubtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  // Promo Coupon states
  const [promoCode, setPromoCode] = useState<string>('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; type: 'flat' | 'pct' | 'bogo'; val: number; desc: string } | null>(null);

  const handleApplyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    
    let promo = null;
    if (code === 'GROCERY10') {
      promo = { code: 'GROCERY10', type: 'pct' as const, val: 10, desc: '10% Grocery Special Discount' };
    } else if (code === 'HAPPYHOUR') {
      promo = { code: 'HAPPYHOUR', type: 'pct' as const, val: 15, desc: '15% Happy Hour Promo' };
    } else if (code === 'WELCOME100') {
      promo = { code: 'WELCOME100', type: 'flat' as const, val: 100, desc: 'Flat Rs. 100 Promo Discount' };
    } else if (code === 'BOGO') {
      // Find lowest-priced item in cart for Buy 1 Get 1 Free
      if (cart.length === 0) return;
      const minPriceItem = cart.reduce((min, item) => item.price < min.price ? item : min, cart[0]);
      promo = { code: 'BOGO', type: 'flat' as const, val: minPriceItem.price, desc: `BOGO Free Item Discount (Rs. ${minPriceItem.price})` };
    } else if (code === 'FREESHIP') {
      promo = { code: 'FREESHIP', type: 'flat' as const, val: 50, desc: 'Rs. 50 Discount Waived' };
    } else {
      showAlert('Invalid or Expired promo coupon code!', 'Invalid Coupon');
      return;
    }
    
    setAppliedPromo(promo);
    setPromoCode('');
  };

  const handleClearPromo = () => {
    setAppliedPromo(null);
  };

  // Computed discount rates
  const numberDiscount = Number(discountValue) || 0;
  const manualDiscount = discountType === 'pct' 
    ? cartSubtotal * (numberDiscount / 100) 
    : numberDiscount;

  const promoDiscount = appliedPromo 
    ? (appliedPromo.type === 'pct' ? cartSubtotal * (appliedPromo.val / 100) : appliedPromo.val)
    : 0;

  const computedDiscount = manualDiscount + promoDiscount;
  const afterDiscount = Math.max(0, cartSubtotal - computedDiscount);

  // Computed GST rates
  const numGstPct = Number(gstPctVal) || 0;
  const computedGst = afterDiscount * (numGstPct / 100);

  const rawCheckoutTotal = afterDiscount + computedGst;

  // Loyalty points redemption parameters
  const [redeedPointsChecked, setRedeedPointsChecked] = useState<boolean>(false);
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  // Compute this linked customer's available balance across non-voided past bills (1 Point = Rs. 1)
  const activeCustomerSales = selectedCustomerId
    ? sales.filter(s => !s.voided && (s.creditCustId === selectedCustomerId || s.customer === selectedCustomer?.name))
    : [];
  
  let loyaltyPointsEarned = 0;
  let loyaltyPointsRedeemed = 0;
  activeCustomerSales.forEach(s => {
    loyaltyPointsEarned += Math.floor(s.total / 50);
    loyaltyPointsRedeemed += s.pointsRedeemed || 0;
  });
  const maxLoyaltyPoints = Math.max(0, loyaltyPointsEarned - loyaltyPointsRedeemed);

  const numPointsDeduction = redeedPointsChecked ? Math.min(maxLoyaltyPoints, Math.floor(rawCheckoutTotal)) : 0;
  const checkoutTotal = Math.max(0, rawCheckoutTotal - numPointsDeduction);

  // Split calculations
  const numSplitCash = Number(splitCashAmount) || 0;
  const numSplitCard = Number(splitCardAmount) || 0;
  const computedSplitUpi = Math.max(0, checkoutTotal - numSplitCash - numSplitCard);

  // Target amount for dynamic UPI QR
  const targetUpiAmount = paymentMethod === 'split' ? computedSplitUpi : checkoutTotal;
  const effectiveUpiId = settings.upi || inlineUpiInput;

  // Change calculator
  const numCashReceived = Number(cashReceived) || 0;
  const cashChange = Math.max(0, numCashReceived - checkoutTotal);

  // Synchronize inline UPI input if settings update
  useEffect(() => {
    if (settings.upi) {
      setInlineUpiInput(settings.upi);
    }
  }, [settings.upi]);

  // Effect to automatically generate dynamic UPI QR code whenever payment amount, method, or merchant details change
  useEffect(() => {
    const activeUpi = (settings.upi || inlineUpiInput).trim();
    const shouldGenerate = (paymentMethod === 'upi' || (paymentMethod === 'split' && computedSplitUpi > 0)) && activeUpi && targetUpiAmount > 0;
    
    if (shouldGenerate) {
      let isMounted = true;
      setIsGeneratingQr(true);
      
      generateUpiQrDataUrl({
        upiId: activeUpi,
        payeeName: settings.shopName || 'Shop',
        amount: targetUpiAmount,
        currency: settings.currency || 'INR',
        transactionNote: `Bill payment at ${settings.shopName || 'Store'}`
      }).then(url => {
        if (isMounted) {
          setQrDataUrl(url);
          setIsGeneratingQr(false);
        }
      }).catch(err => {
        console.error('Error in Checkout QR generation:', err);
        if (isMounted) setIsGeneratingQr(false);
      });

      return () => {
        isMounted = false;
      };
    } else {
      setQrDataUrl(null);
    }
  }, [paymentMethod, targetUpiAmount, computedSplitUpi, settings.upi, settings.shopName, settings.currency, inlineUpiInput]);

  const handleCopyUpiId = async () => {
    const activeUpi = (settings.upi || inlineUpiInput).trim();
    if (!activeUpi) return;
    try {
      await copyToClipboard(activeUpi);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    } catch (e) {
      console.error('Clipboard copy error:', e);
    }
  };

  const handleCopyUpiLink = async () => {
    const activeUpi = (settings.upi || inlineUpiInput).trim();
    if (!activeUpi) return;
    const uri = buildUpiPayload({
      upiId: activeUpi,
      payeeName: settings.shopName || 'Shop',
      amount: targetUpiAmount,
      currency: settings.currency || 'INR',
      transactionNote: `Bill payment at ${settings.shopName || 'Store'}`
    });
    try {
      await copyToClipboard(uri);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (e) {
      console.error('Clipboard copy error:', e);
    }
  };

  const handleSaveInlineUpi = async () => {
    const clean = inlineUpiInput.trim();
    if (!clean || !clean.includes('@')) {
      await showAlert('Please enter a valid UPI VPA ID containing an "@" (e.g. name@okhdfcbank or 9876543210@paytm)', 'Invalid UPI ID');
      return;
    }
    if (onUpdateSettings) {
      await onUpdateSettings({ upi: clean });
    }
    setIsEditingInlineUpi(false);
  };

  // Reset checkmark when selected customer is cleared
  useEffect(() => {
    if (!selectedCustomerId) {
      setRedeedPointsChecked(false);
    }
  }, [selectedCustomerId]);

  // Reset selectedCustomerId when customerType changes to 'new'
  useEffect(() => {
    if (customerType === 'new') {
      setSelectedCustomerId(null);
    }
  }, [customerType]);

  // Effect for UPI countdown simulator
  useEffect(() => {
    let t: any;
    if (upiSimStatus === 'waiting') {
      if (upiSimCountdown > 0) {
        t = setTimeout(() => {
          setUpiSimCountdown(p => p - 1);
        }, 1000);
      } else {
        setUpiSimStatus('success');
        setSimTxnId(`TXN-${Math.floor(100000 + Math.random() * 900000)}`);
      }
    }
    return () => clearTimeout(t);
  }, [upiSimStatus, upiSimCountdown]);

  const handleCompleteSale = async () => {
    if (isProcessing) return;

    if (paymentMethod === 'credit') {
      if (customerType === 'existing') {
        if (!selectedCustomerId) {
          await showAlert('Select a verified customer to log credit outstanding balance!', 'Verification Required');
          return;
        }
      } else {
        // new customer
        if (!newCustName.trim()) {
          await showAlert('Please specify the new customer\'s Name!', 'Information Required');
          return;
        }
        if (!newCustPhone.trim()) {
          await showAlert('Please specify the new customer\'s Phone Number!', 'Information Required');
          return;
        }
      }
    }

    if (settings.requireStaffPin) {
      if (!staffId) {
        await showAlert('Choose the active staff member serving the client!', 'Staff Required');
        return;
      }
      const assigned = staff.find(s => s.id === staffId);
      if (assigned && assigned.pin && assigned.pin !== staffPin) {
        await showAlert('Invalid 4-digit Staff PIN code entered!', 'PIN Verification Failed');
        return;
      }
    }

    const assignedStaff = staff.find(s => s.id === staffId);
    
    // Profit margin check
    const totalCost = cart.reduce((sum, i) => sum + (i.buyPrice || 0) * i.qty, 0);
    const calculatedProfit = afterDiscount - totalCost - numPointsDeduction;

    setIsProcessing(true);
    try {
      await onComplete({
        discount: computedDiscount + numPointsDeduction,
        gstPct: numGstPct,
        gst: computedGst,
        total: checkoutTotal,
        profit: calculatedProfit,
        paymentMethod,
        splitDetails: paymentMethod === 'split' ? { 
          cashAmount: numSplitCash, 
          cardAmount: numSplitCard, 
          upiAmount: computedSplitUpi 
        } : undefined,
        creditCustId: customerType === 'existing' ? selectedCustomerId : null,
        staffId,
        staffName: assignedStaff ? assignedStaff.name : '',
        pointsRedeemed: numPointsDeduction,
        interStateGst,
        upiTxnId: customUtr.trim() || (upiSimStatus === 'success' ? simTxnId : undefined),
        newCustomer: customerType === 'new' ? {
          name: newCustName.trim(),
          phone: newCustPhone.trim(),
          email: newCustEmail.trim(),
          address: newCustAddress.trim(),
        } : undefined
      });
    } catch (err) {
      console.error('Checkout error:', err);
      setIsProcessing(false);
    }
  };

  const filteredCreditorSrch = credSearch.toLowerCase().trim()
    ? customers.filter(c => c.name.toLowerCase().includes(credSearch.toLowerCase()) || (c.phone && c.phone.includes(credSearch)))
    : [];

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1000] flex items-end sm:items-center justify-center p-3 animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto p-5 shadow-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-extrabold text-slate-850 dark:text-slate-100">
              Checkout & Settlement Detail
            </h3>
            <button
              onClick={onClose}
              className="p-1 text-slate-450 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg bg-slate-100 dark:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4">
            {/* Basket summary preview */}
            <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3 border border-slate-100 dark:border-slate-850 max-h-[140px] overflow-y-auto">
              <label className="block text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">
                Itemizing basket rates
              </label>
              {cart.map(i => (
                <div key={i.id} className="flex justify-between text-xs py-1 border-b border-dashed border-slate-200 dark:border-slate-800 last:border-none">
                  <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[220px]">
                    {i.name} <span className="text-slate-400 dark:text-slate-500">×{i.qty}</span>
                  </span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    Rs.{formatCurrency(i.price * i.qty)}
                  </span>
                </div>
              ))}
            </div>

            {/* Discounts and GST taxes selectors */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Deduct Discount
                </label>
                <div className="flex bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl overflow-hidden focus-within:border-indigo-500">
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={discountValue}
                    onChange={(e) => setDiscountValue(e.target.value)}
                    className="w-full bg-transparent px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none text-center font-bold"
                  />
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="bg-slate-100 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 text-[10px] font-extrabold px-1 text-slate-600 dark:text-slate-300"
                  >
                    <option value="flat">Rs</option>
                    <option value="pct">%</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                  Tax Levies GST %
                </label>
                <select
                  value={gstPctVal}
                  onChange={(e) => setGstPctVal(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 font-semibold"
                >
                  <option value="">No Tax (0%)</option>
                  <option value="5">GST 5%</option>
                  <option value="12">GST 12%</option>
                  <option value="18">GST 18%</option>
                  <option value="28">GST 28%</option>
                </select>
              </div>
            </div>

            {/* Inter-State / Intra-state GST toggle */}
            {numGstPct > 0 && (
              <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 rounded-xl border border-slate-150 dark:border-slate-800 animate-fade-in">
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 block">Is Inter-State Transaction?</span>
                  <span className="text-[10px] text-slate-400 block">Applies IGST instead of CGST/SGST split</span>
                </div>
                <input
                  type="checkbox"
                  checked={interStateGst}
                  onChange={(e) => setInterStateGst(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 rounded cursor-pointer"
                />
              </div>
            )}

            {/* Promo Code Coupon & Combo Offers block */}
            <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl p-3.5 space-y-2">
              <label className="block text-[10px] font-extrabold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider leading-none">
                🎟️ Store Promo Coupon & Combo Codes
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. GROCERY10, BOGO, HAPPYHOUR"
                  value={promoCode}
                  onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                  className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-slate-200 outline-none uppercase font-bold"
                />
                <button
                  type="button"
                  onClick={handleApplyPromo}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all active:scale-95 cursor-pointer"
                >
                  Apply
                </button>
              </div>
              {appliedPromo && (
                <div className="flex items-center justify-between text-[10px] font-extrabold text-indigo-700 dark:text-indigo-300 bg-indigo-100/60 dark:bg-indigo-950/40 px-2.5 py-1.5 rounded-lg animate-fade-in">
                  <span>✨ Code: <strong>{appliedPromo.code}</strong> - {appliedPromo.desc}</span>
                  <button type="button" onClick={handleClearPromo} className="text-slate-400 hover:text-rose-600 font-bold ml-1">✕</button>
                </div>
              )}
              {/* Promo recommendation suggestions list */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['GROCERY10', 'HAPPYHOUR', 'BOGO', 'WELCOME100'].map(code => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setPromoCode(code)}
                    className="text-[8px] bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-700 border border-slate-150 rounded px-2 py-0.5 font-bold uppercase transition-colors"
                  >
                    {code === 'GROCERY10' && '🏷️ GROCERY10 (10%)'}
                    {code === 'HAPPYHOUR' && '🕒 HAPPYHOUR (15%)'}
                    {code === 'BOGO' && '💥 BOGO (Free Lowest)'}
                    {code === 'WELCOME100' && '🎁 WELCOME100 (Flat 100)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Serving staffing dropdown */}
            {db_require_staff_wrapper()}

            {/* Core checkout totals sheets */}
            <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-sm border border-slate-850">
              <div className="space-y-1.5 text-xs select-none">
                <div className="flex justify-between text-slate-450">
                  <span>Basket Subtotal</span>
                  <span>Rs.{formatCurrency(cartSubtotal)}</span>
                </div>
                {computedDiscount > 0 && (
                  <div className="flex justify-between text-rose-400">
                    <span>Campaign Discount</span>
                    <span>-Rs.{formatCurrency(computedDiscount)}</span>
                  </div>
                )}
                {numPointsDeduction > 0 && (
                  <div className="flex justify-between text-amber-450">
                    <span>Loyalty Points Applied</span>
                    <span>-Rs.{formatCurrency(numPointsDeduction)}</span>
                  </div>
                )}
                {computedGst > 0 && (
                  <div className="space-y-1 border-t border-slate-800/60 pt-1.5 text-[11px] text-slate-400 animate-fade-in">
                    <div className="flex justify-between text-slate-500 text-[10px]">
                      <span>GST Split Details:</span>
                      <span className="font-semibold uppercase text-[8px] bg-slate-800 px-1 py-0.5 rounded text-slate-300">
                        {interStateGst ? 'Inter-State (IGST)' : 'Intra-State (CGST+SGST)'}
                      </span>
                    </div>
                    {interStateGst ? (
                      <div className="flex justify-between text-slate-400">
                        <span>IGST ({numGstPct}%)</span>
                        <span>+Rs.{formatCurrency(computedGst)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between text-slate-400">
                          <span>CGST ({(numGstPct / 2).toFixed(1)}%)</span>
                          <span>+Rs.{formatCurrency(computedGst / 2)}</span>
                        </div>
                        <div className="flex justify-between text-slate-400">
                          <span>SGST ({(numGstPct / 2).toFixed(1)}%)</span>
                          <span>+Rs.{formatCurrency(computedGst / 2)}</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
                <div className="border-t border-slate-800 pt-2 flex justify-between text-base font-black text-white">
                  <span>Total Due</span>
                  <span className="text-emerald-450">Rs.{formatCurrency(checkoutTotal)}</span>
                </div>
              </div>
            </div>

            {/* Settlement trigger buttons */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Settlement Payment Method
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                {(['cash', 'upi', 'card', 'credit', 'split'] as const).map(pm => (
                  <button
                    key={pm}
                    type="button"
                    onClick={() => setPaymentMethod(pm)}
                    className={`py-2 rounded-xl text-[10px] font-black uppercase text-center cursor-pointer transition-all border ${
                      paymentMethod === pm
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                    }`}
                  >
                    {pm === 'cash' && '💵 Cash'}
                    {pm === 'upi' && '📱 UPI'}
                    {pm === 'card' && '💳 Card'}
                    {pm === 'credit' && '📒 Credit'}
                    {pm === 'split' && '📊 Split'}
                  </button>
                ))}
              </div>
            </div>

            {/* Split billing details entry */}
            {paymentMethod === 'split' && (
              <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3.5 border border-slate-150 dark:border-slate-800 space-y-3.5 text-slate-800 dark:text-slate-100">
                <span className="text-[10px] uppercase font-black text-indigo-700 dark:text-indigo-400 tracking-wider block">📊 Split Settlement (Part Cash + Card + UPI)</span>
                
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-450 dark:text-slate-500 uppercase mb-1">💵 Cash (Rs)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={splitCashAmount}
                      onChange={(e) => {
                        const val = Math.min(checkoutTotal, parseFloat(e.target.value) || 0);
                        setSplitCashAmount(val > 0 ? String(val) : '');
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-white outline-none text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-450 dark:text-slate-500 uppercase mb-1">💳 Card (Rs)</label>
                    <input
                      type="number"
                      placeholder="0"
                      value={splitCardAmount}
                      onChange={(e) => {
                        const val = Math.min(checkoutTotal - numSplitCash, parseFloat(e.target.value) || 0);
                        setSplitCardAmount(val > 0 ? String(val) : '');
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-800 dark:text-white outline-none text-center font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-bold text-slate-450 dark:text-slate-500 uppercase mb-1">📱 UPI (Rs)</label>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs text-indigo-600 dark:text-indigo-400 text-center font-black">
                      Rs.{formatCurrency(computedSplitUpi)}
                    </div>
                  </div>
                </div>

                {computedSplitUpi > 0 && (
                  <div className="bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 p-3 rounded-xl space-y-2.5">
                    <div className="flex justify-between items-center select-none">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase text-indigo-700 dark:text-indigo-300">
                          ⚡ Dynamic Split UPI QR • Rs.{formatCurrency(computedSplitUpi)}
                        </span>
                      </div>
                      {qrDataUrl && (
                        <button
                          type="button"
                          onClick={() => setIsEnlargedQrOpen(true)}
                          className="text-[9px] font-black uppercase text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-1 rounded shadow-xs border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                        >
                          <Maximize2 className="w-3 h-3" /> Enlarge
                        </button>
                      )}
                    </div>

                    {effectiveUpiId ? (
                      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-indigo-100 dark:border-indigo-900/40">
                        {qrDataUrl ? (
                          <div 
                            onClick={() => setIsEnlargedQrOpen(true)}
                            className="relative w-16 h-16 bg-white p-1 rounded-lg border border-slate-200 shadow-xs shrink-0 cursor-pointer group"
                            title="Click to enlarge"
                          >
                            <img src={qrDataUrl} alt="Split UPI QR" className="w-full h-full object-contain" />
                            <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center text-white">
                              <Maximize2 className="w-4 h-4" />
                            </div>
                          </div>
                        ) : (
                          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
                            <RefreshCw className="w-4 h-4 text-indigo-500 animate-spin" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                            Pay to: <span className="font-bold text-slate-800 dark:text-slate-200">{settings.shopName || 'Store'}</span>
                          </div>
                          <div className="text-[10px] font-mono font-bold text-indigo-600 dark:text-indigo-400 truncate">
                            {effectiveUpiId}
                          </div>
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <button
                              type="button"
                              onClick={handleCopyUpiId}
                              className="text-[9px] font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer"
                            >
                              {copiedUpi ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <Copy className="w-2.5 h-2.5" />}
                              {copiedUpi ? 'Copied' : 'Copy UPI'}
                            </button>
                            <button
                              type="button"
                              onClick={handleCopyUpiLink}
                              className="text-[9px] font-bold text-slate-600 dark:text-slate-300 hover:text-indigo-600 flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded cursor-pointer"
                            >
                              {copiedLink ? <Check className="w-2.5 h-2.5 text-emerald-600" /> : <QrCode className="w-2.5 h-2.5" />}
                              {copiedLink ? 'Copied Link' : 'Copy Link'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 p-2 rounded-lg border border-amber-200 dark:border-amber-800 flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>Merchant UPI ID is not configured. Set UPI ID in Settings.</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Cash changer block */}
            {paymentMethod === 'cash' && (
              <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3.5 border border-slate-100 dark:border-slate-850 space-y-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider mb-1">
                    Cash Paid Received (Rs)
                  </label>
                  <input
                    type="number"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    placeholder="Enter cash provided"
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white outline-none focus:border-indigo-550 text-center font-bold"
                  />
                </div>

                {numCashReceived >= checkoutTotal && (
                  <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-3 border border-emerald-100 dark:border-emerald-900/40 select-none">
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase block">Denomination change to return</span>
                    <span className="text-xl font-black text-emerald-700 dark:text-emerald-300 block mt-0.5">Rs.{formatCurrency(cashChange)}</span>
                  </div>
                )}
              </div>
            )}

            {/* DYNAMIC UPI QR PAYMENT CARD */}
            {paymentMethod === 'upi' && (
              <div className="bg-indigo-50/60 dark:bg-indigo-950/20 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-900/40 space-y-3.5">
                {/* Header */}
                <div className="flex items-center justify-between select-none">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                      <QrCode className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-slate-850 dark:text-slate-100 uppercase tracking-wide">Pay via Dynamic UPI QR</span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" /> Live
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">Scan & pay with any UPI App</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      Rs.{formatCurrency(checkoutTotal)}
                    </div>
                    {qrDataUrl && (
                      <button
                        type="button"
                        onClick={() => setIsEnlargedQrOpen(true)}
                        className="inline-flex items-center gap-1 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                      >
                        <Maximize2 className="w-2.5 h-2.5" /> Customer View
                      </button>
                    )}
                  </div>
                </div>

                {/* If UPI ID is missing, provide inline configuration */}
                {!effectiveUpiId ? (
                  <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl p-3.5 space-y-2.5">
                    <div className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-xs font-bold">Merchant UPI ID Not Set</div>
                        <div className="text-[10px] text-amber-700 dark:text-amber-400 leading-relaxed">
                          Enter your store UPI VPA ID to generate real-time dynamic QR codes for this and future bills.
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. shopname@okhdfcbank or 9876543210@paytm"
                        value={inlineUpiInput}
                        onChange={(e) => setInlineUpiInput(e.target.value)}
                        className="flex-1 bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-slate-800 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={handleSaveInlineUpi}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase shadow-xs cursor-pointer"
                      >
                        Save & Generate
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Dynamic QR Display Box */
                  <div className="space-y-3">
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-3.5 border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row items-center gap-4">
                      {/* QR Image Frame */}
                      <div 
                        onClick={() => setIsEnlargedQrOpen(true)}
                        className="relative group cursor-pointer p-2 bg-white rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs shrink-0 flex items-center justify-center"
                        title="Click to enlarge for customer"
                      >
                        {isGeneratingQr ? (
                          <div className="w-36 h-36 flex flex-col items-center justify-center gap-2">
                            <RefreshCw className="w-6 h-6 text-indigo-600 animate-spin" />
                            <span className="text-[9px] font-bold text-slate-400">Generating QR...</span>
                          </div>
                        ) : qrDataUrl ? (
                          <div className="relative">
                            <img src={qrDataUrl} alt="Dynamic UPI QR" className="w-36 h-36 object-contain rounded-md" />
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center text-white text-[10px] font-black uppercase gap-1">
                              <Maximize2 className="w-4 h-4" /> Enlarge
                            </div>
                          </div>
                        ) : (
                          <div className="w-36 h-36 flex items-center justify-center text-[10px] text-slate-400">
                            Unable to render QR
                          </div>
                        )}
                      </div>

                      {/* Payee Info & Actions */}
                      <div className="flex-1 min-w-0 space-y-2 text-left w-full">
                        <div>
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Merchant Payee</span>
                          <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 block truncate">
                            {settings.shopName || 'Store Merchant'}
                          </span>
                        </div>

                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">UPI VPA ID</span>
                            <button
                              type="button"
                              onClick={() => setIsEditingInlineUpi(!isEditingInlineUpi)}
                              className="text-[9px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-0.5 cursor-pointer font-semibold"
                            >
                              <Edit3 className="w-2.5 h-2.5" /> {isEditingInlineUpi ? 'Done' : 'Edit'}
                            </button>
                          </div>

                          {isEditingInlineUpi ? (
                            <div className="flex gap-1 mt-1">
                              <input
                                type="text"
                                value={inlineUpiInput}
                                onChange={(e) => setInlineUpiInput(e.target.value)}
                                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-1 text-[11px] font-mono text-slate-800 dark:text-white"
                              />
                              <button
                                type="button"
                                onClick={handleSaveInlineUpi}
                                className="px-2 bg-indigo-600 text-white rounded text-[9px] font-bold"
                              >
                                Save
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <code className="bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded font-mono text-[11px] font-bold truncate max-w-[170px]">
                                {effectiveUpiId}
                              </code>
                            </div>
                          )}
                        </div>

                        {/* Quick Copy Action Buttons */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={handleCopyUpiId}
                            className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer border ${
                              copiedUpi
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {copiedUpi ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                            {copiedUpi ? 'Copied VPA' : 'Copy UPI ID'}
                          </button>

                          <button
                            type="button"
                            onClick={handleCopyUpiLink}
                            className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase flex items-center gap-1 transition-all cursor-pointer border ${
                              copiedLink
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <QrCode className="w-3 h-3" />}
                            {copiedLink ? 'Copied Link' : 'Copy Pay Link'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Supported UPI Apps Badges */}
                    <div className="flex flex-wrap items-center justify-center gap-1 select-none">
                      <span className="text-[8px] font-bold text-slate-400 uppercase mr-1">Supported Apps:</span>
                      {['Google Pay', 'PhonePe', 'Paytm', 'BHIM UPI', 'Amazon Pay', 'Cred', 'WhatsApp'].map(app => (
                        <span 
                          key={app} 
                          className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[8px] font-bold text-slate-600 dark:text-slate-400"
                        >
                          {app}
                        </span>
                      ))}
                    </div>

                    {/* Optional UTR / Reference ID Entry */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl p-2.5 border border-slate-200 dark:border-slate-800 space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                          Bank UTR / Transaction Ref # (Optional)
                        </label>
                        {customUtr && (
                          <span className="text-[8px] font-bold text-emerald-600 dark:text-emerald-400">Attached</span>
                        )}
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. 423891024567 or TXN Ref"
                        value={customUtr}
                        onChange={(e) => setCustomUtr(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-250 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-800 dark:text-white outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* Live Verification & Gateway Simulator */}
                    <div className="pt-1">
                      {upiSimStatus === 'idle' && (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setUpiSimStatus('waiting');
                              setUpiSimCountdown(6);
                            }}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase rounded-xl border border-indigo-200 dark:border-indigo-800 transition-all cursor-pointer"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Simulate Bank Webhook Listen
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setUpiSimStatus('success');
                              setSimTxnId(`UPI-${Math.floor(100000000000 + Math.random() * 900000000000)}`);
                            }}
                            className="flex items-center justify-center gap-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-xl shadow-xs transition-all cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Mark Paid
                          </button>
                        </div>
                      )}

                      {upiSimStatus === 'waiting' && (
                        <div className="bg-indigo-50 dark:bg-indigo-950/50 p-2.5 rounded-xl border border-indigo-200 dark:border-indigo-800 space-y-2 text-center">
                          <div className="flex justify-center items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                            <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-black uppercase">
                              Listening for Bank Webhook Confirmation... ({upiSimCountdown}s)
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setUpiSimStatus('success');
                              setSimTxnId(`UPI-${Math.floor(100000000000 + Math.random() * 900000000000)}`);
                            }}
                            className="mx-auto flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase rounded-lg shadow-xs cursor-pointer"
                          >
                            ⚡ Instant Approve Payment
                          </button>
                        </div>
                      )}

                      {upiSimStatus === 'success' && (
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between select-none">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </div>
                            <div>
                              <span className="text-[10px] font-black text-emerald-700 dark:text-emerald-300 uppercase block leading-none">
                                Payment Received & Verified!
                              </span>
                              <span className="text-[9px] font-mono text-emerald-800 dark:text-emerald-400 font-semibold block mt-0.5">
                                Ref: {customUtr || simTxnId}
                              </span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setUpiSimStatus('idle');
                              setSimTxnId('');
                            }}
                            className="text-[9px] text-slate-400 hover:text-slate-600 underline font-bold"
                          >
                            Reset
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Customer Creditor picker */}
            <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3 border border-slate-100 dark:border-slate-850 space-y-3">
              <div className="flex justify-between items-center select-none">
                <label className="block text-[10px] font-black text-slate-450 dark:text-slate-500 uppercase tracking-widest leading-none">
                  Customer Profile Linkage {paymentMethod === 'credit' ? <span className="text-rose-500 font-black">* Required</span> : <span className="text-slate-400 font-bold">(Optional)</span>}
                </label>
                {selectedCustomer && (
                  <span className="text-[8px] font-black bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded uppercase">Linked</span>
                )}
              </div>

              {/* Customer Type Toggle: Existing (Old) vs New */}
              <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
                <button
                  type="button"
                  onClick={() => setCustomerType('existing')}
                  className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md transition-all text-center cursor-pointer ${
                    customerType === 'existing'
                      ? 'bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-450 shadow-xs font-black'
                      : 'text-slate-500 dark:text-slate-400 font-bold hover:text-slate-700'
                  }`}
                >
                  Old (Existing) Customer
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerType('new')}
                  className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-md transition-all text-center cursor-pointer ${
                    customerType === 'new'
                      ? 'bg-white dark:bg-slate-850 text-indigo-600 dark:text-indigo-450 shadow-xs font-black'
                      : 'text-slate-500 dark:text-slate-400 font-bold hover:text-slate-700'
                  }`}
                >
                  New Customer Details
                </button>
              </div>
              
              {customerType === 'existing' ? (
                <div className="space-y-2">
                  <div className="relative">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-2.5 py-2 flex items-center gap-1.5 focus-within:border-indigo-500">
                      <Search className="w-3.5 h-3.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Type custom creditor search..."
                        value={credSearch}
                        onChange={(e) => setCredSearch(e.target.value)}
                        className="flex-1 bg-transparent text-xs text-slate-850 dark:text-slate-200 outline-none"
                      />
                    </div>

                    {filteredCreditorSrch.length > 0 && (
                      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 absolute left-0 right-0 top-[38px] z-50 shadow-md max-h-[140px] overflow-y-auto space-y-1">
                        {filteredCreditorSrch.map(c => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCustomerId(c.id);
                              setCredSearch('');
                            }}
                            className="w-full text-left p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-50 dark:border-slate-850 transition-colors cursor-pointer"
                          >
                            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{c.name}</div>
                            <div className="text-[9px] text-slate-450">{c.phone || 'No phone'}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedCustomer ? (
                    <div className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-750 p-2.5 rounded-xl flex justify-between items-center gap-2 animate-in fade-in duration-100">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-black text-indigo-700 dark:text-indigo-400 truncate">{selectedCustomer.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{selectedCustomer.phone || 'No phone'}</div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {maxLoyaltyPoints > 0 ? (
                          <button
                            type="button"
                            onClick={() => setRedeedPointsChecked(!redeedPointsChecked)}
                            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all border ${
                              redeedPointsChecked
                                ? 'bg-amber-500 text-white border-amber-500 active:scale-95'
                                : 'bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 border-amber-250/50'
                            }`}
                            title="Redeem available store rewards discount"
                          >
                            <Award className="w-3 h-3 fill-current" />
                            {redeedPointsChecked ? `Apply ${numPointsDeduction} Pts` : `Redeem (${maxLoyaltyPoints})`}
                          </button>
                        ) : (
                          <span className="text-[8px] font-extrabold text-amber-600 bg-amber-50 px-1.5 py-1 rounded">0 Pts</span>
                        )}
                        <button
                          onClick={() => {
                            setSelectedCustomerId(null);
                            setRedeedPointsChecked(false);
                          }}
                          className="text-xs text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950 p-1 rounded-lg"
                          title="Clear Customer Selection"
                        >
                          <UserMinus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : paymentMethod === 'credit' ? (
                    <p className="text-[9px] text-slate-500 text-center font-bold">
                      ⚠️ Required: Select an existing verified customer from the database search above!
                    </p>
                  ) : null}
                </div>
              ) : (
                /* NEW CUSTOMER FORM LAYOUT */
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 space-y-2.5 animate-in fade-in duration-150">
                  <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block">Registering New Customer</span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Customer Name *</label>
                      <input
                        type="text"
                        placeholder="e.g. Rahul Sharma"
                        value={newCustName}
                        onChange={(e) => setNewCustName(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-850 dark:text-slate-100 outline-none focus:border-indigo-500 font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Phone Number *</label>
                      <input
                        type="text"
                        placeholder="e.g. 9876543210"
                        value={newCustPhone}
                        onChange={(e) => setNewCustPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        maxLength={10}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-850 dark:text-slate-100 outline-none focus:border-indigo-500 font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Email Address</label>
                      <input
                        type="email"
                        placeholder="e.g. rahul@gmail.com (Optional)"
                        value={newCustEmail}
                        onChange={(e) => setNewCustEmail(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-850 dark:text-slate-100 outline-none focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] font-extrabold text-slate-400 uppercase tracking-wider mb-0.5">Physical Address</label>
                      <input
                        type="text"
                        placeholder="e.g. Flat 102, Sector 4, Dwarka (Optional)"
                        value={newCustAddress}
                        onChange={(e) => setNewCustAddress(e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-850 dark:text-slate-100 outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Complete submit */}
            <button
              onClick={handleCompleteSale}
              disabled={isProcessing}
              className={`w-full flex items-center justify-center gap-2 py-3 font-extrabold text-sm rounded-xl transition-all shadow-md mt-1 ${
                isProcessing
                  ? 'bg-indigo-400 dark:bg-indigo-500/50 text-white cursor-not-allowed opacity-75'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-[0.98] cursor-pointer'
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 text-white animate-spin" />
                  <span>Processing Sale & Generating Invoice...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 fill-white" />
                  <span>Complete Sale and Print Invoice</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* CUSTOMER-FACING FULLSCREEN/ENLARGED DYNAMIC UPI QR POPUP */}
      {isEnlargedQrOpen && qrDataUrl && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 text-center space-y-4 shadow-2xl border border-slate-200 dark:border-slate-800 relative">
            <button
              type="button"
              onClick={() => setIsEnlargedQrOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-full p-1.5 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Dynamic UPI Payment
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white mt-1">
                {settings.shopName || 'Store Payment'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Scan to pay with any UPI Application</p>
            </div>

            {/* High-res Enlarged QR Frame */}
            <div className="p-3 bg-white rounded-2xl border-2 border-indigo-100 dark:border-indigo-900/50 shadow-inner inline-block mx-auto">
              <img 
                src={qrDataUrl} 
                alt="Enlarged Dynamic UPI QR" 
                className="w-56 h-56 object-contain rounded-lg"
              />
            </div>

            {/* Amount Banner */}
            <div className="bg-slate-50 dark:bg-slate-850 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payable Amount</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">
                Rs.{formatCurrency(targetUpiAmount)}
              </span>
              <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block mt-1">
                UPI ID: {effectiveUpiId}
              </span>
            </div>

            {/* Supported Badges */}
            <div className="flex flex-wrap items-center justify-center gap-1.5 select-none pt-1">
              {['GPay', 'PhonePe', 'Paytm', 'BHIM', 'Amazon Pay', 'Cred'].map(app => (
                <span key={app} className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[9px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  {app}
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsEnlargedQrOpen(false)}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-black uppercase rounded-xl transition-all cursor-pointer"
            >
              Done / Close Display
            </button>
          </div>
        </div>
      )}
    </div>
  );

  function db_require_staff_wrapper() {
    if (settings.requireStaffPin && staff.length > 0) {
      return (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Served Cashier Personnel *
            </label>
            <select
              value={staffId}
              onChange={(e) => {
                setStaffId(e.target.value);
                setStaffPin('');
              }}
              required
              className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 font-semibold"
            >
              <option value="">Select cashier...</option>
              {staff.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Enter Cashier PIN *
            </label>
            <input
              type="password"
              maxLength={4}
              placeholder="••••"
              value={staffPin}
              onChange={(e) => setStaffPin(e.target.value.replace(/[^0-9]/g, ''))}
              required
              className="w-full bg-slate-50 border border-slate-250 rounded-xl px-3 py-2.5 text-xs text-slate-800 outline-none focus:border-indigo-500 font-bold text-center tracking-widest"
            />
          </div>
        </div>
      );
    }
    return null;
  }
};
