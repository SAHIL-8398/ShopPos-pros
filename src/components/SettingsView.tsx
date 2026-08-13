/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { 
  Settings, 
  Save, 
  Lock, 
  Database, 
  Upload, 
  Download, 
  Trash, 
  Key, 
  ShieldCheck, 
  Factory, 
  Users, 
  Tag, 
  CreditCard,
  Building,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ChevronRight,
  Globe,
  Coins,
  CalendarDays,
  Percent,
  Check,
  Plus,
  FileText,
  X,
  Sun,
  Moon,
  Edit3
} from 'lucide-react';
import { AppDatabase, Settings as SettingsType } from '../types';
import { formatCurrency } from '../utils';
import { useTranslation } from '../context/LocalizationContext';

interface SettingsViewProps {
  db: AppDatabase;
  onSaveShopInfo: (info: Partial<SettingsType>) => void;
  onChangeCredentials: (nid: string, cpw: string, npw: string) => void;
  onRegisterBiometric: () => void;
  onOpenSuppliers: () => void;
  onOpenStaff: () => void;
  onOpenLabels: () => void;
  onOpenExpenses: () => void;
  onExportData: () => void;
  onImportData: (inputEl: HTMLInputElement) => void;
  onClearAllData: () => void;
  storageInfo: { used: number; total: number };
  lastBackupTime: string | null;
  isDarkMode: boolean;
  onToggleDarkMode: (dark: boolean) => void;
}

type SettingsSection = 'profile' | 'shops' | 'modules' | 'security' | 'database';

export const SettingsView: React.FC<SettingsViewProps> = ({
  db,
  onSaveShopInfo,
  onChangeCredentials,
  onRegisterBiometric,
  onOpenSuppliers,
  onOpenStaff,
  onOpenLabels,
  onOpenExpenses,
  onExportData,
  onImportData,
  onClearAllData,
  storageInfo,
  lastBackupTime,
  isDarkMode,
  onToggleDarkMode,
}) => {
  const { t } = useTranslation();
  const currentSettings = db.settings;
  const currentAuth = db.auth;

  // Active settings tab category state
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [isEditingStore, setIsEditingStore] = useState<boolean>(false);

  // Shop Info fields
  const [shopName, setShopName] = useState<string>(currentSettings.shopName || '');
  const [address, setAddress] = useState<string>(currentSettings.address || '');
  const [phone, setPhone] = useState<string>(currentSettings.phone || '');
  const [gstin, setGstin] = useState<string>(currentSettings.gstin || '');
  const [fssai, setFssai] = useState<string>(currentSettings.fssai || '');
  const [upi, setUpi] = useState<string>(currentSettings.upi || '');
  const [footer, setFooter] = useState<string>(currentSettings.footer || 'Thank you! Come again');

  // Custom added Enterprise variables
  const [logo, setLogo] = useState<string>(currentSettings.logo || '');
  const [currency, setCurrency] = useState<string>(currentSettings.currency || 'Rs.');
  const [language, setLanguage] = useState<string>(currentSettings.language || 'English');
  const [financialYear, setFinancialYear] = useState<string>(currentSettings.financialYear || '2026-27');
  const [gstEnabled, setGstEnabled] = useState<boolean>(currentSettings.gstEnabled !== false);
  const [defaultGstPct, setDefaultGstPct] = useState<number>(currentSettings.defaultGstPct || 18);

  // Low stock fields
  const [lowStockDefault, setLowStockDefault] = useState<number>(currentSettings.lowStockDefault || 10);
  const [nearExpiryDefault, setNearExpiryDefault] = useState<number>(currentSettings.nearExpiryDefault || 30);
  const [autoLockSession, setAutoLockSession] = useState<boolean>(!!currentSettings.autoLockSession);

  // Bill Format Options states
  const [showShopNameOnBill, setShowShopNameOnBill] = useState<boolean>(currentSettings.showShopNameOnBill !== false);
  const [showAddressOnBill, setShowAddressOnBill] = useState<boolean>(currentSettings.showAddressOnBill !== false);
  const [showPhoneOnBill, setShowPhoneOnBill] = useState<boolean>(currentSettings.showPhoneOnBill !== false);
  const [showGstinOnBill, setShowGstinOnBill] = useState<boolean>(currentSettings.showGstinOnBill !== false);
  const [showFssaiOnBill, setShowFssaiOnBill] = useState<boolean>(currentSettings.showFssaiOnBill !== false);
  const [showDateOnBill, setShowDateOnBill] = useState<boolean>(currentSettings.showDateOnBill !== false);
  const [showCustomerOnBill, setShowCustomerOnBill] = useState<boolean>(currentSettings.showCustomerOnBill !== false);
  const [showStaffOnBill, setShowStaffOnBill] = useState<boolean>(currentSettings.showStaffOnBill !== false);
  const [showBarcodeOnBill, setShowBarcodeOnBill] = useState<boolean>(currentSettings.showBarcodeOnBill !== false);
  const [showUpiQrOnBill, setShowUpiQrOnBill] = useState<boolean>(currentSettings.showUpiQrOnBill !== false);
  const [showFooterOnBill, setShowFooterOnBill] = useState<boolean>(currentSettings.showFooterOnBill !== false);
  const [showTermsOnBill, setShowTermsOnBill] = useState<boolean>(!!currentSettings.showTermsOnBill);
  const [termsTextOnBill, setTermsTextOnBill] = useState<string>(currentSettings.termsTextOnBill || '1. Goods once sold cannot be returned.\n2. Please carry receipt for eligible returns.');

  // Security Credentials update states
  const [nid, setNid] = useState<string>('');
  const [cpw, setCpw] = useState<string>('');
  const [npw, setNpw] = useState<string>('');
  const [biometricStatus, setBiometricStatus] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isBillFormatModalOpen, setIsBillFormatModalOpen] = useState<boolean>(false);

  // Multi-business profiles manager
  const [businessProfiles, setBusinessProfiles] = useState<{ id: string; name: string }[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('default');
  const [newProfileName, setNewProfileName] = useState<string>('');

  useEffect(() => {
    setBiometricStatus(currentAuth.fpId ? 'Registered device biometric print' : 'No biometric keys found');
  }, [currentAuth.fpId]);

  useEffect(() => {
    setShopName(currentSettings.shopName || '');
    setAddress(currentSettings.address || '');
    setPhone(currentSettings.phone || '');
    setGstin(currentSettings.gstin || '');
    setFssai(currentSettings.fssai || '');
    setUpi(currentSettings.upi || '');
    setFooter(currentSettings.footer || 'Thank you! Come again');
    setLogo(currentSettings.logo || '');
    setCurrency(currentSettings.currency || 'Rs.');
    setLanguage(currentSettings.language || 'English');
    setFinancialYear(currentSettings.financialYear || '2026-27');
    setGstEnabled(currentSettings.gstEnabled !== false);
    setDefaultGstPct(currentSettings.defaultGstPct || 18);
    setLowStockDefault(currentSettings.lowStockDefault || 10);
    setNearExpiryDefault(currentSettings.nearExpiryDefault || 30);
    setAutoLockSession(!!currentSettings.autoLockSession);

    setShowShopNameOnBill(currentSettings.showShopNameOnBill !== false);
    setShowAddressOnBill(currentSettings.showAddressOnBill !== false);
    setShowPhoneOnBill(currentSettings.showPhoneOnBill !== false);
    setShowGstinOnBill(currentSettings.showGstinOnBill !== false);
    setShowFssaiOnBill(currentSettings.showFssaiOnBill !== false);
    setShowDateOnBill(currentSettings.showDateOnBill !== false);
    setShowCustomerOnBill(currentSettings.showCustomerOnBill !== false);
    setShowStaffOnBill(currentSettings.showStaffOnBill !== false);
    setShowBarcodeOnBill(currentSettings.showBarcodeOnBill !== false);
    setShowUpiQrOnBill(currentSettings.showUpiQrOnBill !== false);
    setShowFooterOnBill(currentSettings.showFooterOnBill !== false);
    setShowTermsOnBill(!!currentSettings.showTermsOnBill);
    setTermsTextOnBill(currentSettings.termsTextOnBill || '1. Goods once sold cannot be returned.\n2. Please carry receipt for eligible returns.');
  }, [currentSettings]);

  useEffect(() => {
    const active = localStorage.getItem('shoppos_active_profile_id') || 'default';
    setActiveProfileId(active);

    const savedProfiles = localStorage.getItem('shoppos_profiles');
    if (savedProfiles) {
      try {
        setBusinessProfiles(JSON.parse(savedProfiles));
      } catch (e) {
        const initial = [{ id: 'default', name: currentSettings.shopName || 'Default Store' }];
        setBusinessProfiles(initial);
        localStorage.setItem('shoppos_profiles', JSON.stringify(initial));
      }
    } else {
      const initial = [{ id: 'default', name: currentSettings.shopName || 'Default Store' }];
      setBusinessProfiles(initial);
      localStorage.setItem('shoppos_profiles', JSON.stringify(initial));
    }
  }, [currentSettings.shopName]);

  const handleSaveShopInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveShopInfo({
      shopName: shopName.trim(),
      address: address.trim(),
      phone: phone.trim(),
      gstin: gstin.trim(),
      fssai: fssai.trim(),
      upi: upi.trim(),
      footer: footer.trim(),
      lowStockDefault,
      nearExpiryDefault,
      autoLockSession,
      logo,
      currency,
      language,
      financialYear,
      gstEnabled,
      defaultGstPct,
      showShopNameOnBill,
      showAddressOnBill,
      showPhoneOnBill,
      showGstinOnBill,
      showFssaiOnBill,
      showDateOnBill,
      showCustomerOnBill,
      showStaffOnBill,
      showBarcodeOnBill,
      showUpiQrOnBill,
      showFooterOnBill,
      showTermsOnBill,
      termsTextOnBill,
    });

    // Also update current active profile's name in localstorage list to keep synced!
    const activeId = localStorage.getItem('shoppos_active_profile_id') || 'default';
    const updatedProfiles = businessProfiles.map(p => p.id === activeId ? { ...p, name: shopName.trim() } : p);
    setBusinessProfiles(updatedProfiles);
    localStorage.setItem('shoppos_profiles', JSON.stringify(updatedProfiles));

    setSaveSuccess(true);
    setIsEditingStore(false);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleCancelEdit = () => {
    setShopName(currentSettings.shopName || '');
    setAddress(currentSettings.address || '');
    setPhone(currentSettings.phone || '');
    setGstin(currentSettings.gstin || '');
    setFssai(currentSettings.fssai || '');
    setUpi(currentSettings.upi || '');
    setFooter(currentSettings.footer || 'Thank you! Come again');
    setLogo(currentSettings.logo || '');
    setCurrency(currentSettings.currency || 'Rs.');
    setLanguage(currentSettings.language || 'English');
    setFinancialYear(currentSettings.financialYear || '2026-27');
    setGstEnabled(currentSettings.gstEnabled !== false);
    setDefaultGstPct(currentSettings.defaultGstPct || 18);
    setLowStockDefault(currentSettings.lowStockDefault || 10);
    setNearExpiryDefault(currentSettings.nearExpiryDefault || 30);
    setAutoLockSession(!!currentSettings.autoLockSession);
    setIsEditingStore(false);
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onChangeCredentials(nid.trim(), cpw, npw);
    setNid('');
    setCpw('');
    setNpw('');
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setLogo(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Multi-business logic
  const handleSwitchProfile = (pId: string) => {
    localStorage.setItem('shoppos_active_profile_id', pId);
    window.location.reload();
  };

  const handleCreateProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    const cleanName = newProfileName.trim();
    const newId = 'profile_' + Date.now().toString().slice(-6);
    const updated = [...businessProfiles, { id: newId, name: cleanName }];
    setBusinessProfiles(updated);
    localStorage.setItem('shoppos_profiles', JSON.stringify(updated));
    setNewProfileName('');

    // Switch to it immediately!
    localStorage.setItem('shoppos_active_profile_id', newId);
    window.location.reload();
  };

  const handleDeleteProfile = (pId: string) => {
    if (pId === 'default') return alert('Cannot delete the default business profile!');
    if (pId === activeProfileId) {
      alert('Cannot delete the active business profile! Switch to another profile first.');
      return;
    }
    if (window.confirm(`Are you sure you want to permanently delete this business profile? All inventory and records under this shop will be permanently wiped.`)) {
      const updated = businessProfiles.filter(p => p.id !== pId);
      setBusinessProfiles(updated);
      localStorage.setItem('shoppos_profiles', JSON.stringify(updated));

      // Delete the data in IndexedDB
      const request = indexedDB.open('ShopPOSPro', 1);
      request.onsuccess = (event) => {
        const idb = (event.target as IDBOpenDBRequest).result;
        try {
          const transaction = idb.transaction('kv', 'readwrite');
          const store = transaction.objectStore('kv');
          store.delete(`shoppos_db_${pId}`);
        } catch (err) {
          console.warn('Failed to clear database partition:', err);
        }
      };
    }
  };

  // Convert storage capacities
  const usedMB = (storageInfo.used / 1048576).toFixed(2);
  const totalMB = (storageInfo.total / 1048576).toFixed(0);
  const quotaPct = storageInfo.total ? Math.min(100, (storageInfo.used / storageInfo.total) * 100) : 0;

  const needsBackupAlert = !lastBackupTime || (Date.now() - new Date(lastBackupTime).getTime()) > 7 * 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-6">
      {/* Settings Panel Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 select-none pb-2">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-500 animate-spin-slow" />
            System Control Station
          </h2>
          <p className="text-xs text-slate-400 dark:text-slate-500 font-bold mt-1 uppercase tracking-wide">
            Configure register limits, operator authentication credentials, and database utilities
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 p-1.5 rounded-2xl flex flex-wrap gap-1 select-none">
        <button
          type="button"
          onClick={() => setActiveSection('profile')}
          className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl text-center text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSection === 'profile'
              ? 'bg-white dark:bg-slate-850 text-indigo-650 dark:text-indigo-400 shadow-sm border border-slate-200/40 dark:border-slate-800/50'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Building className="w-4 h-4" />
          Store Profile
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSection('shops');
            setIsEditingStore(false);
          }}
          className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl text-center text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSection === 'shops'
              ? 'bg-white dark:bg-slate-850 text-indigo-650 dark:text-indigo-400 shadow-sm border border-slate-200/40 dark:border-slate-800/50'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Building className="w-4 h-4" />
          Manage Shops
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('modules')}
          className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl text-center text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSection === 'modules'
              ? 'bg-white dark:bg-slate-850 text-indigo-650 dark:text-indigo-400 shadow-sm border border-slate-200/40 dark:border-slate-800/50'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Tools & Modules
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('security')}
          className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl text-center text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeSection === 'security'
              ? 'bg-white dark:bg-slate-850 text-indigo-650 dark:text-indigo-400 shadow-sm border border-slate-200/40 dark:border-slate-800/50'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Lock className="w-4 h-4" />
          Security Keys
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('database')}
          className={`flex-1 min-w-[120px] py-3 px-4 rounded-xl text-center text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
            activeSection === 'database'
              ? 'bg-white dark:bg-slate-850 text-indigo-650 dark:text-indigo-400 shadow-sm border border-slate-200/40 dark:border-slate-800/50'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Database className="w-4 h-4" />
          Data & System
          {needsBackupAlert && (
            <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full animate-ping" />
          )}
        </button>
      </div>

      {/* Profile / Store Details Tab Panel Content */}
      {activeSection === 'profile' && (
        <div className="space-y-6 animate-fade-in">
          {/* STORE CONFIGURATION DETAILS */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800/50 pb-4 select-none flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Building className="w-4 h-4 text-indigo-500" />
                Active Store Parameters & Settings
              </h3>
              {!isEditingStore && (
                <button
                  type="button"
                  onClick={() => setIsEditingStore(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-xs"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Settings
                </button>
              )}
            </div>

            {saveSuccess && !isEditingStore && (
              <div className="flex items-center gap-1.5 text-emerald-650 dark:text-emerald-400 font-extrabold text-xs uppercase select-none p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-250 dark:border-emerald-900/40 animate-fade-in">
                <CheckCircle2 className="w-5 h-5" />
                Parameters Saved & Updated Successfully
              </div>
            )}

            {!isEditingStore ? (
              <div className="space-y-6">
                {/* Header / Brand block */}
                <div className="flex flex-col items-center justify-center text-center gap-4 bg-slate-50 dark:bg-slate-950/40 p-6 rounded-2xl border border-slate-150 dark:border-slate-850/60 relative">
                  <div className="relative w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-800 shrink-0 shadow-xs">
                    {logo ? (
                      <img src={logo} alt="Store Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Building className="w-6 h-6 text-indigo-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col items-center text-center">
                    <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest block mb-1">Active Shop Node</span>
                    <h4 className="text-xl font-black text-slate-800 dark:text-slate-100 leading-tight">
                      {shopName || 'Unnamed Shop'}
                    </h4>
                    {phone && (
                      <p className="text-sm font-extrabold text-slate-700 dark:text-slate-300 mt-1">
                        {phone}
                      </p>
                    )}
                    {address && (
                      <p className="text-xs text-slate-450 dark:text-slate-500 font-medium mt-1 max-w-md">
                        {address}
                      </p>
                    )}
                    {gstin && (
                      <p className="text-[11px] font-mono font-black text-indigo-600 dark:text-indigo-400 mt-1 uppercase tracking-wider">
                        GSTIN: {gstin}
                      </p>
                    )}
                    {fssai && (
                      <p className="text-[11px] font-mono font-black text-emerald-600 dark:text-emerald-400 mt-0.5 uppercase tracking-wider">
                        FSSAI LIC. NO: {fssai}
                      </p>
                    )}
                    {upi && (
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-1 select-all" title="UPI Payment Address">
                        {upi}
                      </p>
                    )}
                  </div>
                </div>

                {/* Read-only details grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-950/30 p-4 rounded-xl border border-slate-150/80 dark:border-slate-850/60 space-y-1">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Trade Name</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{shopName || '—'}</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/30 p-4 rounded-xl border border-slate-150/80 dark:border-slate-850/60 space-y-1">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Contact Number</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{phone || '—'}</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/30 p-4 rounded-xl border border-slate-150/80 dark:border-slate-850/60 space-y-1 md:col-span-2">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Store Address</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{address || '—'}</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/30 p-4 rounded-xl border border-slate-150/80 dark:border-slate-850/60 space-y-1">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">GSTIN Number</span>
                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{gstin || '—'}</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/30 p-4 rounded-xl border border-slate-150/80 dark:border-slate-850/60 space-y-1">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">FSSAI License Number</span>
                    <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200">{fssai || '—'}</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/30 p-4 rounded-xl border border-slate-150/80 dark:border-slate-850/60 space-y-1">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">UPI Payee ID (VPA)</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{upi || '—'}</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/30 p-4 rounded-xl border border-slate-150/80 dark:border-slate-850/60 space-y-1 md:col-span-2">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Bill Footer Message</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">"{footer}"</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/30 p-4 rounded-xl border border-slate-150/80 dark:border-slate-850/60 space-y-1">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Currency & Localization</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{currency} (Language: {language})</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/30 p-4 rounded-xl border border-slate-150/80 dark:border-slate-850/60 space-y-1">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Current Financial Year</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{financialYear}</span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/30 p-4 rounded-xl border border-slate-150/80 dark:border-slate-850/60 space-y-1">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Inventory Thresholds</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Low Stock: {lowStockDefault} units | Expiry: {nearExpiryDefault} days prior
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/30 p-4 rounded-xl border border-slate-150/80 dark:border-slate-850/60 space-y-1">
                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Auto-Lock Idle Inactivity</span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {autoLockSession ? 'Enabled (Logs out cashier after 5m idle)' : 'Disabled'}
                    </span>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-950/30 p-4 rounded-xl border border-slate-150/80 dark:border-slate-850/60 space-y-1 md:col-span-2 flex flex-col sm:flex-row justify-between items-center gap-3">
                    <div>
                      <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Tax Configuration</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        GST Calculations: {gstEnabled ? `Enabled (${defaultGstPct}%)` : 'Disabled'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsBillFormatModalOpen(true)}
                      className="px-3.5 py-1.5 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-wider rounded-lg transition-transform active:scale-95 cursor-pointer border border-indigo-200 dark:border-indigo-800/60"
                    >
                      Configure Invoice Print Blocks
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveShopInfoSubmit} className="space-y-5">
              
              {/* Logo Upload section */}
              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-2xl border border-slate-150 dark:border-slate-850/60">
                <div className="relative w-14 h-14 bg-slate-200 dark:bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden border border-slate-300 dark:border-slate-700 shrink-0">
                  {logo ? (
                    <img src={logo} alt="Store Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <Building className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Company Brand Logo (Printed on Bills)</span>
                  <div className="flex gap-2">
                    <label className="inline-block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                      Upload Logo
                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                    </label>
                    {logo && (
                      <button
                        type="button"
                        onClick={() => setLogo('')}
                        className="text-[10px] font-black uppercase text-rose-500 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wilder mb-1.5 select-none">
                    {t('trade_name')} *
                  </label>
                  <input
                    type="text"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="e.g. Metro Mart"
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 font-bold transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wilder mb-1.5 select-none">
                    Store Contact Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 font-bold transition-colors"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wilder mb-1.5 select-none">
                    Physical Store Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="B-Wing, Central Hub Complex, City Centre Road, Mumbai"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 font-bold transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wilder mb-1.5 select-none">
                    GSTIN / Trade Tax Registration Number
                  </label>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="e.g. 27AAAAA1111A1Z1"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 font-bold transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wilder mb-1.5 select-none">
                    FSSAI License Number (Food Safety)
                  </label>
                  <input
                    type="text"
                    value={fssai}
                    onChange={(e) => setFssai(e.target.value)}
                    placeholder="e.g. 10020022001122"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 font-bold transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wilder mb-1.5 select-none">
                    UPI VPA Payee ID (QR Code Generator)
                  </label>
                  <input
                    type="text"
                    value={upi}
                    onChange={(e) => setUpi(e.target.value)}
                    placeholder="e.g. metromart@ybl"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 font-bold transition-colors"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wilder mb-1.5 select-none">
                    Thermal Receipt Bill Footer Notes
                  </label>
                  <input
                    type="text"
                    value={footer}
                    onChange={(e) => setFooter(e.target.value)}
                    placeholder="Thank you! Come again"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 font-bold transition-colors"
                  />
                </div>
              </div>

              {/* Advanced Localizations & Tax Parameters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                <div>
                  <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5 text-indigo-500" />
                    {t('currency_symbol')}
                  </label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 font-bold"
                  >
                    <option value="Rs.">Rs. (Indian Rupee)</option>
                    <option value="₹">₹ (Rupee Icon)</option>
                    <option value="$">$ (US Dollar)</option>
                    <option value="€">€ (Euro)</option>
                    <option value="£">£ (Pound)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-indigo-500" />
                    {t('system_language')}
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 font-bold"
                  >
                    <option value="English">English</option>
                    <option value="Hindi">Hindi (हिन्दी)</option>
                    <option value="Marathi">Marathi (मराठी)</option>
                    <option value="Tamil">Tamil (தமிழ்)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <CalendarDays className="w-3.5 h-3.5 text-indigo-500" />
                    {t('financial_year_label')}
                  </label>
                  <select
                    value={financialYear}
                    onChange={(e) => setFinancialYear(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 font-bold"
                  >
                    <option value="2026-27">2026-27</option>
                    <option value="2025-26">2025-26</option>
                    <option value="2024-25">2024-25</option>
                  </select>
                </div>
              </div>

              {/* Theme Mode Selector Section */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800/40">
                <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2.5 flex items-center gap-1.5 select-none">
                  Application Visual Theme
                </label>
                <div className="relative bg-slate-50 dark:bg-slate-950/40 p-1.5 rounded-2xl border border-slate-200/80 dark:border-slate-800/60 grid grid-cols-2 gap-1.5 overflow-hidden select-none">
                  {/* Light Mode Button */}
                  <motion.button
                    type="button"
                    onClick={() => onToggleDarkMode(false)}
                    whileTap={{ scale: 0.98 }}
                    className={`relative flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-colors duration-200 cursor-pointer flex-1 outline-none ${
                      !isDarkMode
                        ? 'text-indigo-700 dark:text-indigo-400 font-extrabold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    {!isDarkMode && (
                      <motion.div
                        layoutId="themeTogglePill"
                        className="absolute inset-0 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200/50 dark:border-slate-800/60"
                        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <Sun className={`w-4 h-4 transition-transform duration-300 ${!isDarkMode ? 'text-yellow-500 fill-yellow-500 scale-110 rotate-12' : 'text-slate-400'}`} />
                      Light Mode
                    </span>
                  </motion.button>

                  {/* Dark Mode Button */}
                  <motion.button
                    type="button"
                    onClick={() => onToggleDarkMode(true)}
                    whileTap={{ scale: 0.98 }}
                    className={`relative flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-colors duration-200 cursor-pointer flex-1 outline-none ${
                      isDarkMode
                        ? 'text-indigo-700 dark:text-indigo-400 font-extrabold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    {isDarkMode && (
                      <motion.div
                        layoutId="themeTogglePill"
                        className="absolute inset-0 bg-white dark:bg-slate-900 rounded-xl shadow-xs border border-slate-200/50 dark:border-slate-800/60"
                        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                      <Moon className={`w-4 h-4 transition-transform duration-300 ${isDarkMode ? 'text-indigo-400 fill-indigo-400/20 scale-110 -rotate-12' : 'text-slate-400'}`} />
                      Dark Mode
                    </span>
                  </motion.button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-3 border border-slate-100 dark:border-slate-800/60 flex justify-between items-center select-none">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-250">Enable GST Taxes</h4>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">Separate itemized tax on receipts</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input 
                      type="checkbox" 
                      checked={gstEnabled}
                      onChange={(e) => setGstEnabled(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-9 h-5 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2.5px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
                  </label>
                </div>

                {gstEnabled && (
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 rounded-xl p-3 border border-slate-100 dark:border-slate-800/60">
                    <Percent className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-0.5 select-none">
                        Default GST percentage
                      </label>
                      <select
                        value={defaultGstPct}
                        onChange={(e) => setDefaultGstPct(Number(e.target.value))}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-black p-1 outline-none text-indigo-650"
                      >
                        <option value={5}>5%</option>
                        <option value={12}>12%</option>
                        <option value={18}>18%</option>
                        <option value={28}>28%</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Threshold limits and switches */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wilder select-none">
                      Low Stock Warning Limit
                    </label>
                    <span className="text-[10px] font-mono font-bold bg-amber-50 dark:bg-amber-955/30 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">
                      Under {lowStockDefault} units
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={lowStockDefault}
                    onChange={(e) => setLowStockDefault(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 font-bold transition-colors"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wilder select-none">
                      Near Expiry Warning
                    </label>
                    <span className="text-[10px] font-mono font-bold bg-indigo-50 dark:bg-indigo-955/30 text-indigo-555 dark:text-indigo-400 px-1.5 py-0.5 rounded">
                      {nearExpiryDefault} days prior
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    value={nearExpiryDefault}
                    onChange={(e) => setNearExpiryDefault(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 font-bold transition-colors"
                  />
                </div>
              </div>

              {/* Lock Mode Switch Toggle row */}
              <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/60 flex justify-between items-center select-none gap-4">
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-250">Auto-Lock Inactivity Logout</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-semibold">
                    For safety, automatically logs out active cashier session after 5 minutes of idle time.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={autoLockSession}
                    onChange={(e) => setAutoLockSession(e.target.checked)}
                    className="sr-only peer" 
                    id="auto-lock-toggle-settings"
                  />
                  <div className="w-9 h-5 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2.5px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500" />
                </label>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800/40">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 py-3.5 bg-slate-105 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-750 dark:text-slate-300 text-xs font-black uppercase rounded-2xl flex items-center justify-center gap-1.5 active:scale-95 transition-all tracking-wider cursor-pointer border border-slate-200 dark:border-slate-700/50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-2xl flex items-center justify-center gap-1.5 active:scale-95 transition-all tracking-wider cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Save Parameters
                </button>

                {saveSuccess && (
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs uppercase animate-in fade-in duration-300 select-none">
                    <CheckCircle2 className="w-5 h-5" />
                    Parameters Saved
                  </div>
                )}
              </div>
            </form>
          )}
          </div>
        </div>
      )}

      {/* Manage Shops Tab Panel Content */}
      {activeSection === 'shops' && (
        <div className="space-y-6 animate-fade-in">
          {/* MULTI-BUSINESS MULTI-STORE PROFILES SELECTOR SECTION */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2 select-none">
                <Building className="w-4 h-4 text-indigo-500" />
                Active Shop Store Profiles
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-1">
                Establish multiple distinct business profile nodes. Switching profiles immediately swaps the active local database partition.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Existing profiles lists */}
              <div className="space-y-2">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Registered Profiles</span>
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                  {businessProfiles.map((p) => (
                    <div 
                      key={p.id} 
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all ${
                        p.id === activeProfileId 
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-250 dark:border-indigo-900/50' 
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <div className="min-w-0 flex-1 pr-2">
                        <span className="text-slate-800 dark:text-slate-200 block truncate">{p.name}</span>
                        <span className="text-[8px] text-slate-400 font-extrabold uppercase tracking-widest">
                          {p.id === 'default' ? 'Primary Root Profile' : `ID: ${p.id}`}
                        </span>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        {p.id !== activeProfileId ? (
                          <button
                            type="button"
                            onClick={() => handleSwitchProfile(p.id)}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase tracking-wider rounded-lg transition-transform active:scale-95 cursor-pointer"
                          >
                            Switch
                          </button>
                        ) : (
                          <span className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 px-2.5 py-1 text-[9px] uppercase font-black tracking-wider rounded-lg flex items-center gap-1">
                            <Check className="w-3 h-3 stroke-[3px]" /> Active
                          </span>
                        )}
                        {p.id !== 'default' && p.id !== activeProfileId && (
                          <button
                            type="button"
                            onClick={() => handleDeleteProfile(p.id)}
                            className="p-1 bg-rose-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 hover:bg-rose-100 rounded-lg cursor-pointer"
                            title="Delete Profile Partition"
                          >
                            <Trash className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add profile form */}
              <form onSubmit={handleCreateProfile} className="space-y-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850/60">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Launch New Shop Profile</span>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">New Business Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sweet Corner Bakery"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-800 dark:text-white font-bold outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-1 transition-transform active:scale-95 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[3.5px]" /> Register Shop Node
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Tools and External Modules Tab Panel */}
      {activeSection === 'modules' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800/50 pb-4 select-none">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-500" />
              Integrated Register Modules
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-1">
              Control the deep components of your shop station, including suppliers cataloging, cashier roster pins, sticker printing sheet generators, and daily expenses.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={onOpenSuppliers}
              className="group p-5 bg-slate-50 border border-slate-200/60 dark:bg-slate-950/45 dark:border-slate-800/50 rounded-2xl hover:border-indigo-400 dark:hover:border-indigo-900 transition-all text-left flex flex-col justify-between items-start cursor-pointer active:scale-98 relative overflow-hidden animate-fade-in"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Factory className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    Suppliers Base
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1 uppercase tracking-wider">
                    Log intake restocks & supplier credits
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={onOpenStaff}
              className="group p-5 bg-slate-50 border border-slate-200/60 dark:bg-slate-950/45 dark:border-slate-800/50 rounded-2xl hover:border-emerald-450 dark:hover:border-emerald-900 transition-all text-left flex flex-col justify-between items-start cursor-pointer active:scale-98 relative overflow-hidden animate-fade-in"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-955 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1 group-hover:text-emerald-555 dark:group-hover:text-emerald-400 transition-colors">
                    Staff & Cashiers
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1 uppercase tracking-wider">
                    Secure station entry and checkout logs
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={onOpenLabels}
              className="group p-5 bg-slate-50 border border-slate-200/60 dark:bg-slate-950/45 dark:border-slate-800/50 rounded-2xl hover:border-amber-450 dark:hover:border-amber-900 transition-all text-left flex flex-col justify-between items-start cursor-pointer active:scale-98 relative overflow-hidden animate-fade-in"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-955/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1 group-hover:text-amber-555 dark:group-hover:text-amber-400 transition-colors">
                    Sticker Generator
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1 uppercase tracking-wider">
                    Generate A4 barcode retail stickers
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={onOpenExpenses}
              className="group p-5 bg-slate-50 border border-slate-200/60 dark:bg-slate-950/45 dark:border-slate-800/50 rounded-2xl hover:border-rose-450 dark:hover:border-rose-900 transition-all text-left flex flex-col justify-between items-start cursor-pointer active:scale-98 relative overflow-hidden animate-fade-in"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-955/35 text-rose-605 dark:text-rose-400 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1 group-hover:text-rose-555 dark:group-hover:text-rose-400 transition-colors">
                    Expenditures Ledger
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1 uppercase tracking-wider">
                    Log electricity, lease and upkeeps
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setIsBillFormatModalOpen(true)}
              className="group p-5 bg-slate-50 border border-slate-200/60 dark:bg-slate-950/45 dark:border-slate-800/50 rounded-2xl hover:border-indigo-400 dark:hover:border-indigo-900 transition-all text-left flex flex-col justify-between items-start cursor-pointer active:scale-98 relative overflow-hidden animate-fade-in"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    Invoice Formatting
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1 uppercase tracking-wider">
                    Format bills, tax logs & terms policy
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Security Credentials Tab Panel */}
      {activeSection === 'security' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800/50 pb-4 select-none">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Lock className="w-4 h-4 text-indigo-500" />
              Security & Access Credentials
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-1">
              Modify database operator identities, locking passcodes, and setup local hardware biometrics.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left form section */}
            <form onSubmit={handleCredentialsSubmit} className="space-y-4 lg:col-span-3">
              <div className="text-[10px] text-slate-450 dark:text-slate-400 font-bold uppercase tracking-wide bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-850/60 select-none">
                Active Primary Operator ID: <strong className="text-indigo-600 dark:text-indigo-400">{currentAuth.userId}</strong>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1.5 select-none">
                  New Operator ID Alias / Brand ID
                </label>
                <input
                  type="text"
                  value={nid}
                  onChange={(e) => setNid(e.target.value)}
                  placeholder="Leave blank to retain active ID"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1.5 select-none">
                  Current Unlock Passcode *
                </label>
                <input
                  type="password"
                  value={cpw}
                  onChange={(e) => setCpw(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider mb-1.5 select-none">
                  Set New Unlock passcode *
                </label>
                <input
                  type="password"
                  value={npw}
                  onChange={(e) => setNpw(e.target.value)}
                  placeholder="minimum 4 digits suggested"
                  required
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 font-semibold text-center tracking-widest text-lg"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 bg-slate-900 border border-slate-800/80 hover:bg-slate-850 dark:bg-slate-955 dark:hover:bg-slate-900/60 text-white text-xs font-black uppercase rounded-2xl flex items-center justify-center gap-1.5 active:scale-95 transition-all tracking-wider cursor-pointer"
              >
                <Key className="w-4 h-4 text-indigo-400" />
                Change Unlock Credentials
              </button>
            </form>

            {/* Right biometric card section */}
            <div className="lg:col-span-2 select-none">
              <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-5 border border-slate-100 dark:border-slate-855 h-full flex flex-col justify-between items-center text-center space-y-4">
                <div className="space-y-2">
                  <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Hardware Biometrics</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-505 font-medium leading-relaxed">
                    Link biometric sensors or launch safe touch simulator verification to bypass typing unlock keys on startup.
                  </p>
                </div>

                <div className="w-full space-y-3">
                  <span className="text-[9px] px-2.5 py-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-855 rounded-full text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">
                    {biometricStatus}
                  </span>

                  <button
                    type="button"
                    onClick={onRegisterBiometric}
                    className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white hover:text-white text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all active:scale-95 shadow-sm"
                  >
                    Setup / Sync Biometric Credentials
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Database Systems and Backups Panel */}
      {activeSection === 'database' && (
        <div className="space-y-6">
          {/* Backup Alert Box */}
          {needsBackupAlert && (
            <div className="bg-amber-50 dark:bg-amber-955/15 border border-amber-200/50 dark:border-amber-900/40 rounded-2xl p-4 text-amber-900 dark:text-amber-300 shadow-sm flex items-start gap-3 relative overflow-hidden select-none">
              <AlertTriangle className="w-5 h-5 mt-0.5 text-amber-550 dark:text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-xs font-black uppercase text-amber-850 dark:text-amber-350 leading-none">
                  Database Protection Safety Alert
                </h3>
                <p className="text-[10px] text-amber-700/90 dark:text-amber-400/80 mt-1.5 font-semibold leading-relaxed">
                  {lastBackupTime 
                    ? `Your database has not been exported for ${Math.round((Date.now() - new Date(lastBackupTime).getTime()) / 86400000)} days. Guard listings, registers, and credits by taking a clean JSON dump.` 
                    : "Active database backup required! Preserve store ledger logs, closed bills, custom cashiers and inventories from accidental browser sandbox cleanings."}
                </p>
                <button
                  onClick={onExportData}
                  className="mt-2.5 text-[10px] font-black uppercase text-amber-805 hover:text-amber-955 dark:text-amber-400 dark:hover:text-amber-250 underline flex items-center gap-1 cursor-pointer"
                >
                  📥 Export database dump file now
                </button>
              </div>
            </div>
          )}

          {/* Core Database Panel details */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800/50 pb-4 select-none">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-indigo-500" />
                IndexedDB Store Sandbox Capacity
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-1">
                Monitor storage quotas, populate instant mock templates, clear files, and perform backups.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Storage details col */}
              <div className="space-y-4 lg:col-span-3 select-none">
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wide">
                    <span>Authorized Storage Sandbox Ratio</span>
                    <span className="font-mono text-xs">{quotaPct.toFixed(2)} %</span>
                  </div>
                  
                  <div className="w-full bg-slate-100 dark:bg-slate-950 h-3 rounded-full overflow-hidden border border-slate-200/20">
                    <div 
                      className={`h-full rounded-full transition-all duration-305 ${
                        quotaPct > 85 ? 'bg-red-500' : quotaPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${quotaPct.toFixed(1)}%` }}
                    />
                  </div>
                  
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold text-right">
                    Using {usedMB} MB of ~{totalMB} MB allocated browser disk space
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 p-3 bg-slate-50 border border-slate-200/60 dark:bg-slate-950/45 dark:border-slate-850 rounded-xl text-center">
                  <div>
                    <span className="block text-sm font-black text-slate-800 dark:text-slate-100">{db.products.length}</span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">Inventory</span>
                  </div>
                  <div>
                    <span className="block text-sm font-black text-slate-800 dark:text-slate-100">{db.sales.length}</span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">Bills closed</span>
                  </div>
                  <div>
                    <span className="block text-sm font-black text-slate-800 dark:text-slate-100">{db.customers.length}</span>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase">Creditors</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                  <button
                    onClick={onExportData}
                    className="flex items-center justify-center gap-1.5 py-3 border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-855 text-slate-700 dark:text-slate-300 text-xs font-black uppercase rounded-xl transition-all active:scale-95 cursor-pointer select-none"
                  >
                    <Upload className="w-4 h-4 text-indigo-500" />
                    Download Backup JSON
                  </button>

                  <label className="flex items-center justify-center gap-1.5 py-3 border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-855 text-slate-700 dark:text-slate-300 text-xs font-black uppercase rounded-xl cursor-pointer transition-all active:scale-95 select-none">
                    <Download className="w-4 h-4 text-emerald-500" />
                    Import/Restore JSON
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={(e) => onImportData(e.target)}
                    />
                  </label>
                </div>
              </div>

              {/* Developer sandboxes seeder / destructive section */}
              <div className="lg:col-span-2 space-y-4">
                {/* Clear database action button */}
                <button
                  onClick={onClearAllData}
                  className="w-full flex items-center justify-center gap-1.5 py-3.5 bg-rose-50/50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/20 dark:hover:bg-rose-900/30 dark:text-rose-400 hover:border-rose-310 text-xs font-bold rounded-2xl transition-all active:scale-95 cursor-pointer border border-rose-100/60 dark:border-rose-900/30 font-black uppercase select-none"
                >
                  <Trash className="w-4 h-4 text-rose-505" />
                  Wipe & Reset Register Base
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BILL AND INVOICE FORMAT MODAL */}
      {isBillFormatModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[8000] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl border border-slate-100 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between select-none shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">
                    Bill & Invoice Formatting Settings
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
                    Configure thermal receipt & A4 templates
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBillFormatModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-full cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5">
                {[
                  { id: 'shopName', label: 'Show Shop Name', value: showShopNameOnBill, setter: setShowShopNameOnBill, desc: 'Shop Brand Title on invoice top' },
                  { id: 'address', label: 'Show Address', value: showAddressOnBill, setter: setShowAddressOnBill, desc: 'Physical shop location line' },
                  { id: 'phone', label: 'Show Phone Number', value: showPhoneOnBill, setter: setShowPhoneOnBill, desc: 'Contact details line' },
                  { id: 'gstin', label: 'Show GSTIN No', value: showGstinOnBill, setter: setShowGstinOnBill, desc: 'Store Tax identification number' },
                  { id: 'fssai', label: 'Show FSSAI License No', value: showFssaiOnBill, setter: setShowFssaiOnBill, desc: 'Food Safety & Standards license on invoice' },
                  { id: 'date', label: 'Show Bill Date & Time', value: showDateOnBill, setter: setShowDateOnBill, desc: 'Timestamp of transaction settlement' },
                  { id: 'customer', label: 'Show Customer Details', value: showCustomerOnBill, setter: setShowCustomerOnBill, desc: 'Client name, mobile and address' },
                  { id: 'staff', label: 'Show Operator/Cashier', value: showStaffOnBill, setter: setShowStaffOnBill, desc: 'Active staff member billing details' },
                  { id: 'barcode', label: 'Show Barcode / Bill QR', value: showBarcodeOnBill, setter: setShowBarcodeOnBill, desc: 'For barcode scanning and returns' },
                  { id: 'upi', label: 'Show Scan to Pay UPI QR', value: showUpiQrOnBill, setter: setShowUpiQrOnBill, desc: 'Dynamic payment request UPI QR' },
                  { id: 'footer', label: 'Show Greeting Footer', value: showFooterOnBill, setter: setShowFooterOnBill, desc: 'Footer message custom text' },
                ].map((opt) => (
                  <div key={opt.id} className="flex items-center justify-between gap-4 py-1 select-none">
                    <div className="flex-1">
                      <label htmlFor={`bill-opt-modal-${opt.id}`} className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
                        {opt.label}
                      </label>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold block mt-0.5 leading-tight">
                        {opt.desc}
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input
                        id={`bill-opt-modal-${opt.id}`}
                        type="checkbox"
                        checked={opt.value}
                        onChange={(e) => opt.setter(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600" />
                    </label>
                  </div>
                ))}
              </div>

              {/* Terms and Conditions block */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between select-none">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
                      Print Terms & Conditions
                    </label>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold leading-normal mt-0.5">
                      Add legal disclaimers, return policies, or custom notes onto the invoice bottom.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={showTermsOnBill}
                      onChange={(e) => setShowTermsOnBill(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-8 h-4.5 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-600" />
                  </label>
                </div>

                {showTermsOnBill && (
                  <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                    <textarea
                      value={termsTextOnBill}
                      onChange={(e) => setTermsTextOnBill(e.target.value)}
                      placeholder="Enter terms & conditions, one rule per line..."
                      rows={3}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-850 dark:text-slate-200 outline-none focus:border-indigo-500 font-bold leading-relaxed shadow-inner"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-b-3xl shrink-0 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsBillFormatModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-850 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onSaveShopInfo({
                    showShopNameOnBill,
                    showAddressOnBill,
                    showPhoneOnBill,
                    showGstinOnBill,
                    showDateOnBill,
                    showCustomerOnBill,
                    showStaffOnBill,
                    showBarcodeOnBill,
                    showUpiQrOnBill,
                    showFooterOnBill,
                    showTermsOnBill,
                    termsTextOnBill,
                  });
                  setIsBillFormatModalOpen(false);
                }}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl flex items-center gap-1.5 active:scale-95 transition-all tracking-wider cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Save Formatting
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
