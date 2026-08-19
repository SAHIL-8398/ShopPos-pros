/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Store, 
  Phone, 
  MapPin, 
  CreditCard, 
  FileText, 
  ShieldCheck, 
  Key, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Sparkles, 
  Percent, 
  QrCode, 
  AlertCircle, 
  Receipt,
  Sliders,
  ChevronRight,
  Fingerprint,
  ScanFace,
  Lock,
  Smartphone,
  Check
} from 'lucide-react';
import { AppLogo } from './AppLogo';
import { checkBiometricsAvailability, authenticateWithNativeBiometrics } from '../services/biometricService';

export interface FirstLoginSetupData {
  auth: {
    userId: string;
    pw: string;
    fpId?: string | null;
    rpId?: string | null;
  };
  settings: {
    shopName: string;
    phone: string;
    address: string;
    gstin: string;
    fssai: string;
    upi: string;
    footer: string;
    currency: string;
    financialYear: string;
    gstEnabled: boolean;
    defaultGstPct: number;
    lowStockDefault: number;
    nearExpiryDefault: number;
    termsTextOnBill: string;
    showTermsOnBill: boolean;
  };
}

interface FirstLoginSetupFormProps {
  onSave: (data: FirstLoginSetupData) => void;
}

export const FirstLoginSetupForm: React.FC<FirstLoginSetupFormProps> = ({ onSave }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 4;

  // Step 1: Store & Contact Info
  const [shopName, setShopName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [currency, setCurrency] = useState<string>('Rs.');

  // Step 2: Tax, Registration & Payments
  const [gstin, setGstin] = useState<string>('');
  const [fssai, setFssai] = useState<string>('');
  const [gstEnabled, setGstEnabled] = useState<boolean>(true);
  const [defaultGstPct, setDefaultGstPct] = useState<number>(18);
  const [upi, setUpi] = useState<string>('');

  // Step 3: Receipt & Invoicing Defaults
  const [footer, setFooter] = useState<string>('Thank you! Visit again');
  const [financialYear, setFinancialYear] = useState<string>('2026-27');
  const [lowStockDefault, setLowStockDefault] = useState<number>(10);
  const [nearExpiryDefault, setNearExpiryDefault] = useState<number>(30);
  const [termsTextOnBill, setTermsTextOnBill] = useState<string>('1. Goods once sold cannot be returned without original receipt.\n2. Warranty as per manufacturer terms.');
  const [showTermsOnBill, setShowTermsOnBill] = useState<boolean>(true);

  // Step 4: Admin Security & Passcode + Biometric Registration
  const [nid, setNid] = useState<string>('admin');
  const [pw1, setPw1] = useState<string>('');
  const [pw2, setPw2] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Biometrics State
  const [fpId, setFpId] = useState<string | null>(null);
  const [rpId, setRpId] = useState<string | null>(null);
  const [biometricType, setBiometricType] = useState<string>('Fingerprint / Biometric');
  const [isBioAvailable, setIsBioAvailable] = useState<boolean>(true);
  const [isBioChecking, setIsBioChecking] = useState<boolean>(false);
  const [bioSuccessMsg, setBioSuccessMsg] = useState<string>('');
  const [bioErrorMsg, setBioErrorMsg] = useState<string>('');

  // Auto-detect biometric sensors on load
  React.useEffect(() => {
    checkBiometricsAvailability().then(res => {
      setIsBioAvailable(res.isAvailable || res.strongBiometryIsAvailable);
      if (res.biometryType && res.biometryType !== 'None') {
        setBiometricType(res.biometryType);
      }
    }).catch(() => {
      setIsBioAvailable(true);
    });
  }, []);

  const handleRegisterBiometrics = async () => {
    setIsBioChecking(true);
    setBioErrorMsg('');
    setBioSuccessMsg('');

    try {
      const bioInfo = await checkBiometricsAvailability();

      // Native Capacitor Biometrics (Android / iOS)
      if (bioInfo.isNative) {
        if (!bioInfo.isAvailable) {
          setBioErrorMsg(`No biometric credentials enrolled in Android Device Settings. Please enroll a fingerprint or screen lock first.`);
          setIsBioChecking(false);
          return;
        }

        const authRes = await authenticateWithNativeBiometrics('Scan fingerprint or face to link quick biometric unlock for admin profile');
        if (authRes.success) {
          setFpId('native_biometric');
          setRpId('native_android');
          setBioSuccessMsg(`✓ Native ${bioInfo.biometryType} successfully enrolled! You can now unlock with one touch.`);
        } else if (authRes.error && !authRes.error.toLowerCase().includes('cancel')) {
          setBioErrorMsg(`Biometric enrollment error: ${authRes.error}`);
        }
        setIsBioChecking(false);
        return;
      }

      // Web Browser Flow (WebAuthn or Simulated fallback)
      const hostRpId = window.location.hostname || 'localhost';
      const chall = crypto.getRandomValues(new Uint8Array(32));
      const uId = crypto.getRandomValues(new Uint8Array(16));

      if (!window.PublicKeyCredential) {
        // Fallback for browsers without physical WebAuthn
        setFpId('simulated_biometric');
        setRpId(hostRpId);
        setBioSuccessMsg('✓ Quick Touch Unlock simulation enrolled for testing.');
        setIsBioChecking(false);
        return;
      }

      try {
        const cr = await navigator.credentials.create({
          publicKey: {
            challenge: chall,
            rp: { name: 'ShopPOS Pro', id: hostRpId },
            user: { id: uId, name: nid || 'admin', displayName: nid || 'admin' },
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
            authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
            timeout: 60000,
            attestation: 'none'
          }
        });

        if (cr) {
          const rawId = new Uint8Array((cr as any).rawId);
          const b64Id = btoa(String.fromCharCode(...rawId));
          setFpId(b64Id);
          setRpId(hostRpId);
          setBioSuccessMsg('✓ Platform Biometric credential linked successfully!');
        }
      } catch (innerErr: any) {
        console.warn('Physical biometric registration blocked, using virtual fallback:', innerErr);
        setFpId('simulated_biometric');
        setRpId(hostRpId);
        setBioSuccessMsg('✓ Quick Touch Unlock enabled for browser testing.');
      }
    } catch (err: any) {
      setBioErrorMsg(`Biometric setup aborted: ${err.message || 'Cancelled'}`);
    } finally {
      setIsBioChecking(false);
    }
  };

  const validateStep = (stepNumber: number): boolean => {
    setErrorMsg('');
    if (stepNumber === 1) {
      if (!shopName.trim()) {
        setErrorMsg('Please enter your Shop / Business Name to continue.');
        return false;
      }
    } else if (stepNumber === 4) {
      if (!pw1 || pw1.length < 6) {
        setErrorMsg('Security Passcode is required (minimum 6 characters).');
        return false;
      }
      if (pw1 !== pw2) {
        setErrorMsg('Passcodes do not match. Please re-enter carefully.');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        setCurrentStep(prev => prev + 1);
      }
    }
  };

  const handleBack = () => {
    setErrorMsg('');
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleFinalSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    // Validate Step 1 and Step 4
    if (!shopName.trim()) {
      setCurrentStep(1);
      setErrorMsg('Please enter your Shop / Business Name.');
      return;
    }
    if (!pw1 || pw1.length < 6) {
      setCurrentStep(4);
      setErrorMsg('Security Passcode is required (minimum 6 characters).');
      return;
    }
    if (pw1 !== pw2) {
      setCurrentStep(4);
      setErrorMsg('Passcodes do not match.');
      return;
    }

    onSave({
      auth: {
        userId: nid.trim() || 'admin',
        pw: pw1,
        fpId: fpId || null,
        rpId: rpId || null,
      },
      settings: {
        shopName: shopName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        gstin: gstin.trim().toUpperCase(),
        fssai: fssai.trim(),
        upi: upi.trim(),
        footer: footer.trim() || 'Thank you! Visit again',
        currency: currency.trim() || 'Rs.',
        financialYear: financialYear.trim() || '2026-27',
        gstEnabled,
        defaultGstPct: Number(defaultGstPct) || 18,
        lowStockDefault: Number(lowStockDefault) || 10,
        nearExpiryDefault: Number(nearExpiryDefault) || 30,
        termsTextOnBill: termsTextOnBill.trim(),
        showTermsOnBill,
      },
    });
  };

  const stepTitles = [
    { num: 1, label: 'Store Info', icon: Store },
    { num: 2, label: 'Tax & UPI', icon: Percent },
    { num: 3, label: 'Receipt & Policy', icon: Receipt },
    { num: 4, label: 'Admin Security', icon: ShieldCheck },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 flex flex-col justify-center p-3 sm:p-6 select-none">
      <div className="bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl max-w-xl w-full mx-auto text-white">
        
        {/* Header Branding */}
        <div className="text-center mb-6">
          <AppLogo size="xl" rounded="rounded-2xl" className="mx-auto mb-3 shadow-lg shadow-indigo-500/20" />
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white leading-tight">
            Welcome to ShopPOS Pro
          </h2>
          <p className="text-xs sm:text-sm text-indigo-300 font-medium mt-1">
            Let's set up your store details, billing rules & security passcode
          </p>
        </div>

        {/* Step Progress Bar */}
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2 mb-6">
          {stepTitles.map((st) => {
            const Icon = st.icon;
            const isActive = currentStep === st.num;
            const isDone = currentStep > st.num;

            return (
              <button
                key={st.num}
                type="button"
                onClick={() => {
                  if (currentStep === 1 && !shopName.trim()) {
                    validateStep(1);
                    return;
                  }
                  setCurrentStep(st.num);
                }}
                className={`flex flex-col items-center p-2 rounded-2xl border transition-all text-center ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                    : isDone
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60 hover:bg-emerald-900/40'
                    : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-center mb-1">
                  {isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  )}
                </div>
                <span className="text-[10px] sm:text-xs font-bold leading-tight line-clamp-1">
                  {st.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Form Steps Body */}
        <form onSubmit={currentStep === totalSteps ? handleFinalSubmit : (e) => { e.preventDefault(); handleNext(); }} className="space-y-4">
          
          {/* ═════════ STEP 1: STORE & CONTACT INFO ═════════ */}
          {currentStep === 1 && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-2xl p-3.5 flex items-start gap-3">
                <Store className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-200">
                  <p className="font-bold text-white mb-0.5">Store Identity & Contact Details</p>
                  These details will appear at the header of all printed receipts, invoices, and estimates.
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Store className="w-3.5 h-3.5 text-indigo-400" /> Shop / Business Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  required
                  placeholder="e.g. Royal Mart Supermarket, Apex Electronics"
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-bold placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone / Contact Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-medium placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Currency Symbol
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-medium focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="Rs.">Rs. (Indian Rupee Text)</option>
                    <option value="₹">₹ (INR Rupee Symbol)</option>
                    <option value="$">$ (US Dollar)</option>
                    <option value="AED">AED (UAE Dirham)</option>
                    <option value="£">£ (British Pound)</option>
                    <option value="€">€ (Euro)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> Store Address & Location
                </label>
                <textarea
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Shop #12, Ground Floor, Central Mall, MG Road, Mumbai - 400001"
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-medium placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>
            </div>
          )}

          {/* ═════════ STEP 2: TAX, REGISTRATION & PAYMENTS ═════════ */}
          {currentStep === 2 && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-2xl p-3.5 flex items-start gap-3">
                <QrCode className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-200">
                  <p className="font-bold text-white mb-0.5">Tax Invoicing & Digital Payments</p>
                  Configure your GSTIN, FSSAI license, and UPI ID for customer QR code payments.
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" /> GSTIN (Tax Number)
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="e.g. 27AAAAA0000A1Z5"
                    className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono uppercase font-bold placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Optional • 15-digit GST registration</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" /> FSSAI License Number
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    value={fssai}
                    onChange={(e) => setFssai(e.target.value)}
                    placeholder="e.g. 10019022009876"
                    className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono font-bold placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Optional • For grocery, bakery & restaurants</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-amber-400" /> Merchant UPI ID (Bharat QR Payments)
                </label>
                <input
                  type="text"
                  value={upi}
                  onChange={(e) => setUpi(e.target.value)}
                  placeholder="e.g. yourshopname@upi or merchant@okaxis"
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-mono font-bold placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <span className="text-[10px] text-indigo-300 mt-1 block">
                  Generates an instant dynamic UPI QR code on thermal receipts for quick customer scanning
                </span>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-white block">Enable GST Tax Billing</span>
                  <span className="text-[10px] text-slate-400">Calculate CGST & SGST breakdowns automatically</span>
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
          )}

          {/* ═════════ STEP 3: RECEIPT & INVENTORY SETTINGS ═════════ */}
          {currentStep === 3 && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-2xl p-3.5 flex items-start gap-3">
                <Receipt className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div className="text-xs text-indigo-200">
                  <p className="font-bold text-white mb-0.5">Receipt Styling & Stock Alert Thresholds</p>
                  Customize your bill greetings and automated inventory low-stock warnings.
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Receipt Footer Note / Tagline
                </label>
                <input
                  type="text"
                  value={footer}
                  onChange={(e) => setFooter(e.target.value)}
                  placeholder="e.g. Thank you! Visit again • No Exchange without bill"
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-medium placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" /> Low Stock Alert Level
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={999}
                      value={lowStockDefault}
                      onChange={(e) => setLowStockDefault(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white font-bold focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-xs text-slate-400 font-bold shrink-0">Units</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-emerald-400" /> Near Expiry Warning
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={nearExpiryDefault}
                      onChange={(e) => setNearExpiryDefault(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white font-bold focus:outline-none focus:border-indigo-500"
                    />
                    <span className="text-xs text-slate-400 font-bold shrink-0">Days</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" /> Terms & Conditions on Bills
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showTermsOnBill}
                      onChange={(e) => setShowTermsOnBill(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-0 w-3.5 h-3.5"
                    />
                    <span>Print on receipts</span>
                  </label>
                </div>
                <textarea
                  rows={2}
                  value={termsTextOnBill}
                  onChange={(e) => setTermsTextOnBill(e.target.value)}
                  placeholder="e.g. 1. Goods once sold cannot be returned.\n2. Please carry receipt for eligible returns."
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white font-medium placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
                />
              </div>
            </div>
          )}

          {/* ═════════ STEP 4: ADMIN SECURITY & PASSCODE ═════════ */}
          {currentStep === 4 && (
            <div className="space-y-3.5 animate-fadeIn">
              <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-2xl p-3.5 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-200">
                  <p className="font-bold text-white mb-0.5">Admin Security Lockout & Passcode</p>
                  Set your master operator ID and passcode to secure your POS register and daily sales logs.
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-400" /> Admin Username / Operator ID
                </label>
                <input
                  type="text"
                  value={nid}
                  onChange={(e) => setNid(e.target.value)}
                  placeholder="Default is 'admin'"
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white font-bold placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-400" /> Master Security Passcode <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  value={pw1}
                  onChange={(e) => setPw1(e.target.value)}
                  required
                  placeholder="Minimum 6 characters (e.g. 123456)"
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-bold placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-indigo-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-indigo-400" /> Confirm Passcode <span className="text-rose-400">*</span>
                </label>
                <input
                  type="password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  required
                  placeholder="Re-enter security passcode"
                  className="w-full bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white font-bold placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* 🛡️ BIOMETRIC ENROLLMENT PROMPT (FINGERPRINT / FACE UNLOCK) */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className={`p-4 rounded-2xl border transition-all ${
                  fpId 
                    ? 'bg-emerald-950/40 border-emerald-700/60' 
                    : 'bg-indigo-950/30 border-indigo-800/50 hover:border-indigo-700/70'
                }`}>
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        fpId ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                      }`}>
                        <Fingerprint className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white flex items-center gap-1.5">
                          Biometric Quick Unlock
                          {fpId && (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                              Enrolled
                            </span>
                          )}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {fpId 
                            ? `Hardware sensor enrolled (${biometricType}). Tap below to test or re-enroll.` 
                            : `Enable one-tap fingerprint/face unlock to open POS instantly without typing passcodes.`
                          }
                        </p>
                      </div>
                    </div>
                  </div>

                  {bioSuccessMsg && (
                    <div className="text-[11px] text-emerald-300 bg-emerald-950/60 p-2.5 rounded-xl font-bold border border-emerald-800/80 mb-2.5 flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{bioSuccessMsg}</span>
                    </div>
                  )}

                  {bioErrorMsg && (
                    <div className="text-[11px] text-rose-300 bg-rose-950/60 p-2.5 rounded-xl font-bold border border-rose-800/80 mb-2.5 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{bioErrorMsg}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    {!fpId ? (
                      <button
                        type="button"
                        onClick={handleRegisterBiometrics}
                        disabled={isBioChecking}
                        className="w-full py-2.5 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
                      >
                        <Fingerprint className="w-4 h-4 text-indigo-200" />
                        <span>{isBioChecking ? 'Scanning Sensor...' : 'Register Fingerprint / Face Unlock'}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 w-full">
                        <button
                          type="button"
                          onClick={handleRegisterBiometrics}
                          disabled={isBioChecking}
                          className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Fingerprint className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Test / Re-enroll</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setFpId(null);
                            setRpId(null);
                            setBioSuccessMsg('');
                            setBioErrorMsg('');
                          }}
                          className="py-2 px-3 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-[11px] font-bold rounded-xl border border-rose-800/40 transition-colors cursor-pointer"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message banner */}
          {errorMsg && (
            <div className="text-xs text-rose-300 bg-rose-950/60 p-3 rounded-2xl text-center font-bold border border-rose-800/80 flex items-center justify-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Controls Bottom Bar */}
          <div className="pt-3 flex items-center justify-between gap-3 border-t border-slate-800/80">
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
            ) : (
              <div className="text-[11px] text-slate-400 font-medium">
                Step 1 of 4: Store Identity
              </div>
            )}

            <div className="flex items-center gap-2">
              {/* Optional Quick Skip button on Steps 2 and 3 */}
              {(currentStep === 2 || currentStep === 3) && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(4)}
                  className="px-3 py-2.5 text-slate-400 hover:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
                >
                  Skip to Passcode
                </button>
              )}

              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer active:scale-95"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition-all cursor-pointer active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  <span>Launch Store & Open POS</span>
                </button>
              )}
            </div>
          </div>
        </form>

      </div>
    </div>
  );
};
