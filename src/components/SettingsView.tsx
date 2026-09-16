/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useMemo } from 'react';
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
  Clock,
  Edit3,
  BookOpen,
  ShieldAlert,
  Eye,
  EyeOff,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  LayoutGrid
} from 'lucide-react';
import { AppDatabase, Settings as SettingsType, DashboardWidgetConfig, DashboardWidgetId } from '../types';
import { hashPassword } from '../db';
import { formatCurrency, isValidGstin, isValidFssai, cleanIndianPhone, isValidUpiId } from '../utils';
import { useTranslation } from '../context/LocalizationContext';
import { useDialog } from '../context/DialogContext';
import { checkBiometricsAvailability, BiometricCheckResult } from '../services/biometricService';
import { DEFAULT_WIDGET_CONFIGS, WIDGET_STORAGE_KEY, loadDashboardWidgets } from './DashboardView';
import { SHOP_NAME_FONTS, SHOP_NAME_COLORS, ShopNameFontKey, ShopNameColorKey } from './LabelGenerator';
import { BillFormatKey, BILL_FORMATS, getBillFormatConfig } from '../constants/billFormats';
import { BillFormatSelector } from './BillFormatSelector';

interface SettingsViewProps {
  db: AppDatabase;
  onSaveShopInfo: (info: Partial<SettingsType>) => void;
  onChangeCredentials: (nid: string, cpw: string, npw: string) => void;
  onRegisterBiometric: () => void;
  onRemoveBiometric?: () => void;
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
  onTestDayChangeWarning?: () => void;
  onOpenAppGuide?: () => void;
}

type SettingsSection = 'profile' | 'shops' | 'modules' | 'security' | 'layout' | 'database';

export const SettingsView: React.FC<SettingsViewProps> = ({
  db,
  onSaveShopInfo,
  onChangeCredentials,
  onRegisterBiometric,
  onRemoveBiometric,
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
  onTestDayChangeWarning,
  onOpenAppGuide,
}) => {
  const { t } = useTranslation();
  const { showAlert, showConfirm } = useDialog();
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
  const [currency, setCurrency] = useState<string>(currentSettings.currency || '₹');
  const [language, setLanguage] = useState<string>(currentSettings.language || 'English');
  const [financialYear, setFinancialYear] = useState<string>(currentSettings.financialYear || '2026-27');
  const [gstEnabled, setGstEnabled] = useState<boolean>(currentSettings.gstEnabled !== false);
  const [defaultGstPct, setDefaultGstPct] = useState<number>(currentSettings.defaultGstPct || 18);

  // Low stock fields
  const [lowStockDefault, setLowStockDefault] = useState<number>(currentSettings.lowStockDefault || 10);
  const [nearExpiryDefault, setNearExpiryDefault] = useState<number>(currentSettings.nearExpiryDefault || 30);
  const [autoLockSession, setAutoLockSession] = useState<boolean>(!!currentSettings.autoLockSession);
  const [autoLogoutOnDayChange, setAutoLogoutOnDayChange] = useState<boolean>(currentSettings.autoLogoutOnDayChange !== false);
  const [dayChangeWarningMinutes, setDayChangeWarningMinutes] = useState<number>(currentSettings.dayChangeWarningMinutes || 5);

  // Bill Format Options states (Vyapar-Style Formats)
  const [billFormat, setBillFormat] = useState<BillFormatKey>(currentSettings.billFormat || 'regular');
  const [preferredReceiptPaperSize, setPreferredReceiptPaperSize] = useState<'58mm' | '80mm'>(currentSettings.preferredReceiptPaperSize || '58mm');
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

  // Barcode Label Typography & Color branding states
  const [barcodeLabelShopNameFont, setBarcodeLabelShopNameFont] = useState<ShopNameFontKey>(
    currentSettings.barcodeLabelShopNameFont || (localStorage.getItem('shoppos_label_shop_font') as ShopNameFontKey) || 'serif-bold'
  );
  const [barcodeLabelShopNameColor, setBarcodeLabelShopNameColor] = useState<ShopNameColorKey>(
    currentSettings.barcodeLabelShopNameColor || (localStorage.getItem('shoppos_label_shop_color') as ShopNameColorKey) || 'indigo'
  );

  const handleUpdateBarcodeLabelFont = (fontKey: ShopNameFontKey) => {
    setBarcodeLabelShopNameFont(fontKey);
    localStorage.setItem('shoppos_label_shop_font', fontKey);
    onSaveShopInfo({ barcodeLabelShopNameFont: fontKey });
  };

  const handleUpdateBarcodeLabelColor = (colorKey: ShopNameColorKey) => {
    setBarcodeLabelShopNameColor(colorKey);
    localStorage.setItem('shoppos_label_shop_color', colorKey);
    onSaveShopInfo({ barcodeLabelShopNameColor: colorKey });
  };

  const activeShopFont = useMemo(() => {
    return SHOP_NAME_FONTS.find(f => f.id === barcodeLabelShopNameFont) || SHOP_NAME_FONTS[0];
  }, [barcodeLabelShopNameFont]);

  const activeShopColor = useMemo(() => {
    return SHOP_NAME_COLORS[barcodeLabelShopNameColor] || SHOP_NAME_COLORS.indigo;
  }, [barcodeLabelShopNameColor]);

  const activeBillFormatConfig = useMemo(() => {
    return getBillFormatConfig(billFormat);
  }, [billFormat]);

  // Security Credentials update states
  const [nid, setNid] = useState<string>('');
  const [cpw, setCpw] = useState<string>('');
  const [npw, setNpw] = useState<string>('');
  const [biometricStatus, setBiometricStatus] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [isBillFormatModalOpen, setIsBillFormatModalOpen] = useState<boolean>(false);

  // Wipe & Reset confirmation modal state
  const [isWipeModalOpen, setIsWipeModalOpen] = useState<boolean>(false);
  const [wipeStep, setWipeStep] = useState<1 | 2>(1);
  const [adminPasscodeInput, setAdminPasscodeInput] = useState<string>('');
  const [wipeError, setWipeError] = useState<string | null>(null);
  const [isWiping, setIsWiping] = useState<boolean>(false);
  const [showWipePasscode, setShowWipePasscode] = useState<boolean>(false);

  // Multi-business profiles manager
  const [businessProfiles, setBusinessProfiles] = useState<{ id: string; name: string }[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('default');
  const [newProfileName, setNewProfileName] = useState<string>('');

  const [bioInfo, setBioInfo] = useState<BiometricCheckResult>({
    isAvailable: false,
    isNative: false,
    biometryType: 'Biometrics',
    strongBiometryIsAvailable: false,
  });

  // Dashboard layout configuration states
  const [dashboardWidgets, setDashboardWidgets] = useState<DashboardWidgetConfig[]>(() => loadDashboardWidgets());
  const [widgetSaveToast, setWidgetSaveToast] = useState<string | null>(null);
  const [isExportingBackup, setIsExportingBackup] = useState<boolean>(false);

  const handleExportWithFeedback = async () => {
    try {
      setIsExportingBackup(true);
      await onExportData();
    } finally {
      setIsExportingBackup(false);
    }
  };

  const persistDashboardWidgets = (newWidgets: DashboardWidgetConfig[]) => {
    setDashboardWidgets(newWidgets);
    try {
      localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(newWidgets));
      window.dispatchEvent(new Event('shoppos_dashboard_widgets_changed'));
    } catch (e) {
      console.error('Failed to save dashboard widgets:', e);
    }
  };

  const handleToggleWidgetVisibility = (id: DashboardWidgetId) => {
    const updated = dashboardWidgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w));
    persistDashboardWidgets(updated);
    setWidgetSaveToast('Widget visibility updated');
    setTimeout(() => setWidgetSaveToast(null), 2000);
  };

  const handleMoveWidgetOrder = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= dashboardWidgets.length) return;

    const copy = [...dashboardWidgets];
    const item = copy.splice(index, 1)[0];
    copy.splice(targetIndex, 0, item);
    persistDashboardWidgets(copy);
    setWidgetSaveToast('Widget order updated');
    setTimeout(() => setWidgetSaveToast(null), 2000);
  };

  const handleResetDashboardWidgets = () => {
    persistDashboardWidgets(DEFAULT_WIDGET_CONFIGS);
    setWidgetSaveToast('Layout reset to default');
    setTimeout(() => setWidgetSaveToast(null), 2000);
  };

  const handleEnableAllWidgets = () => {
    const updated = dashboardWidgets.map((w) => ({ ...w, visible: true }));
    persistDashboardWidgets(updated);
    setWidgetSaveToast('All widgets enabled');
    setTimeout(() => setWidgetSaveToast(null), 2000);
  };

  useEffect(() => {
    checkBiometricsAvailability().then((info) => {
      setBioInfo(info);
    });
  }, []);

  useEffect(() => {
    if (currentAuth.fpId) {
      if (currentAuth.fpId === 'native_biometric' || (bioInfo.isNative && currentAuth.fpId !== 'simulated_biometric')) {
        setBiometricStatus(`🔒 Native ${bioInfo.biometryType || 'Biometrics'} Linked (Device Hardware Lock)`);
      } else if (currentAuth.fpId === 'simulated_biometric') {
        setBiometricStatus('⚠️ Virtual Touch Bypass Active (Non-Secure / Demo Only)');
      } else {
        setBiometricStatus('🔒 Hardware Biometric Linked (WebAuthn Platform Key)');
      }
    } else {
      setBiometricStatus('No Biometric Keys Configured');
    }
  }, [currentAuth.fpId, bioInfo]);

  useEffect(() => {
    setShopName(currentSettings.shopName || '');
    setAddress(currentSettings.address || '');
    setPhone(currentSettings.phone || '');
    setGstin(currentSettings.gstin || '');
    setFssai(currentSettings.fssai || '');
    setUpi(currentSettings.upi || '');
    setFooter(currentSettings.footer || 'Thank you! Come again');
    setLogo(currentSettings.logo || '');
    setCurrency(currentSettings.currency || '₹');
    setLanguage(currentSettings.language || 'English');
    setFinancialYear(currentSettings.financialYear || '2026-27');
    setGstEnabled(currentSettings.gstEnabled !== false);
    setDefaultGstPct(currentSettings.defaultGstPct || 18);
    setLowStockDefault(currentSettings.lowStockDefault || 10);
    setNearExpiryDefault(currentSettings.nearExpiryDefault || 30);
    setAutoLockSession(!!currentSettings.autoLockSession);
    setAutoLogoutOnDayChange(currentSettings.autoLogoutOnDayChange !== false);
    setDayChangeWarningMinutes(currentSettings.dayChangeWarningMinutes || 5);
    setPreferredReceiptPaperSize(currentSettings.preferredReceiptPaperSize || '58mm');
    setBillFormat(currentSettings.billFormat || 'regular');

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
    if (currentSettings.barcodeLabelShopNameFont) {
      setBarcodeLabelShopNameFont(currentSettings.barcodeLabelShopNameFont);
    }
    if (currentSettings.barcodeLabelShopNameColor) {
      setBarcodeLabelShopNameColor(currentSettings.barcodeLabelShopNameColor);
    }
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
    if (!shopName.trim()) {
      showAlert('Store Name is required!', 'Required Field');
      return;
    }
    const cleanedPhone = cleanIndianPhone(phone);
    if (phone.trim() && cleanedPhone.length !== 10) {
      showAlert('Store contact number must be a valid 10-digit mobile number!', 'Invalid Phone Number');
      return;
    }
    if (gstin.trim() && !isValidGstin(gstin)) {
      showAlert('Invalid GSTIN format! Must be 15 characters (e.g. 27AAAAA0000A1Z5).', 'Invalid GSTIN');
      return;
    }
    if (fssai.trim() && !isValidFssai(fssai)) {
      showAlert('FSSAI License number must be exactly 14 digits.', 'Invalid FSSAI');
      return;
    }
    if (upi.trim() && !isValidUpiId(upi)) {
      showAlert('Invalid UPI ID format (e.g. storename@upi or merchant@okaxis).', 'Invalid UPI ID');
      return;
    }

    onSaveShopInfo({
      shopName: shopName.trim(),
      address: address.trim(),
      phone: cleanedPhone,
      gstin: gstin.trim().toUpperCase(),
      fssai: fssai.trim(),
      upi: upi.trim(),
      footer: footer.trim(),
      lowStockDefault,
      nearExpiryDefault,
      autoLockSession,
      autoLogoutOnDayChange,
      dayChangeWarningMinutes,
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
      barcodeLabelShopNameFont,
      barcodeLabelShopNameColor,
      billFormat,
      preferredReceiptPaperSize,
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
    setCurrency(currentSettings.currency || '₹');
    setLanguage(currentSettings.language || 'English');
    setFinancialYear(currentSettings.financialYear || '2026-27');
    setGstEnabled(currentSettings.gstEnabled !== false);
    setDefaultGstPct(currentSettings.defaultGstPct || 18);
    setLowStockDefault(currentSettings.lowStockDefault || 10);
    setNearExpiryDefault(currentSettings.nearExpiryDefault || 30);
    setAutoLockSession(!!currentSettings.autoLockSession);
    setAutoLogoutOnDayChange(currentSettings.autoLogoutOnDayChange !== false);
    setDayChangeWarningMinutes(currentSettings.dayChangeWarningMinutes || 5);
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

  const handleDeleteProfile = async (pId: string) => {
    if (pId === 'default') {
      await showAlert('Cannot delete the default business profile!', 'Operation Restricted');
      return;
    }
    if (pId === activeProfileId) {
      await showAlert('Cannot delete the active business profile! Switch to another profile first.', 'Active Profile');
      return;
    }
    const confirmed = await showConfirm(
      'Are you sure you want to permanently delete this business profile? All inventory and records under this shop will be permanently wiped.',
      'Delete Business Profile'
    );
    if (confirmed) {
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
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
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
      <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/60 p-1.5 rounded-2xl grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1.5 select-none w-full">
        <button
          type="button"
          onClick={() => setActiveSection('profile')}
          className={`w-full py-2.5 px-2 rounded-xl text-center text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSection === 'profile'
              ? 'bg-white dark:bg-slate-850 text-indigo-650 dark:text-indigo-400 shadow-sm border border-slate-200/40 dark:border-slate-800/50'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Store Profile</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveSection('shops');
            setIsEditingStore(false);
          }}
          className={`w-full py-2.5 px-2 rounded-xl text-center text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSection === 'shops'
              ? 'bg-white dark:bg-slate-850 text-indigo-650 dark:text-indigo-400 shadow-sm border border-slate-200/40 dark:border-slate-800/50'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Manage Shops</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('modules')}
          className={`w-full py-2.5 px-2 rounded-xl text-center text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSection === 'modules'
              ? 'bg-white dark:bg-slate-850 text-indigo-650 dark:text-indigo-400 shadow-sm border border-slate-200/40 dark:border-slate-800/50'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Tools & Modules</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('security')}
          className={`w-full py-2.5 px-2 rounded-xl text-center text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSection === 'security'
              ? 'bg-white dark:bg-slate-850 text-indigo-650 dark:text-indigo-400 shadow-sm border border-slate-200/40 dark:border-slate-800/50'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Security Keys</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('layout')}
          className={`w-full py-2.5 px-2 rounded-xl text-center text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            activeSection === 'layout'
              ? 'bg-white dark:bg-slate-850 text-indigo-650 dark:text-indigo-400 shadow-sm border border-slate-200/40 dark:border-slate-800/50'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Dashboard Layout</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSection('database')}
          className={`w-full py-2.5 px-2 rounded-xl text-center text-[11px] sm:text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer relative ${
            activeSection === 'database'
              ? 'bg-white dark:bg-slate-850 text-indigo-650 dark:text-indigo-400 shadow-sm border border-slate-200/40 dark:border-slate-800/50'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Database className="w-3.5 h-3.5 text-indigo-500" />
          <span>Backup & Restore</span>
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
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBillFormatModalOpen(true)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-200/80 dark:border-slate-700/60 transition-all cursor-pointer"
                  >
                    Receipt Format
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingStore(true)}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer shadow-xs"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Details
                  </button>
                </div>
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
                {/* Active Shop Node Brand & Header */}
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left pb-6 border-b border-slate-150 dark:border-slate-800/60">
                  <div className="relative w-20 h-20 bg-slate-900 rounded-2xl flex items-center justify-center overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 shadow-xs">
                    {logo ? (
                      <img src={logo} alt="Store Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <img src="/app-icon.svg" alt="ShopPOS Pro Icon" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1.5">
                      <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800/60 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Active Shop Node
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 rounded-full">
                        FY: {financialYear}
                      </span>
                    </div>
                    
                    <h4 className="text-2xl font-black text-slate-900 dark:text-slate-100 leading-tight">
                      {shopName || 'Unnamed Shop'}
                    </h4>
                    
                    {phone && (
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1">
                        📞 {phone}
                      </p>
                    )}
                    
                    {address && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-relaxed max-w-2xl">
                        📍 {address}
                      </p>
                    )}
                  </div>
                </div>

                {/* Flat, Key-Value Information Grid without nested box tabs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">GSTIN / Tax ID</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">{gstin || 'Not Configured'}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">FSSAI License</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">{fssai || 'Not Configured'}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">UPI Payee ID (VPA)</span>
                    <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm select-all">{upi || 'Not Configured'}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Currency & Language</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{currency} · {language}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Tax Calculations</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{gstEnabled ? `GST Active (${defaultGstPct}%)` : 'Tax Disabled'}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Inventory Thresholds</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">Low: {lowStockDefault} units | Exp: {nearExpiryDefault}d</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Auto-Lock Inactivity</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{autoLockSession ? 'Enabled (5m idle)' : 'Disabled'}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Day-Change Midnight Logout</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{autoLogoutOnDayChange ? `Enabled (00:00, ${dayChangeWarningMinutes}m warning)` : 'Disabled'}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Receipt Footer Note</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{footer ? `"${footer}"` : 'Not Set'}</span>
                  </div>

                  <div className="space-y-1 sm:col-span-2 lg:col-span-3 pt-2 border-t border-slate-100 dark:border-slate-800/40 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Barcode Label Shop Name Styling</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {activeShopFont.label} · <span className="inline-flex items-center gap-1 font-bold"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: activeShopColor.hex }} />{activeShopColor.label}</span>
                      </span>
                    </div>
                    <span 
                      className={`text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 uppercase ${activeShopFont.cssClass}`}
                      style={{ color: activeShopColor.hex, backgroundColor: `${activeShopColor.hex}10` }}
                    >
                      {shopName || 'Shop Name'}
                    </span>
                  </div>

                  <div className="space-y-1 sm:col-span-2 lg:col-span-3 pt-2 border-t border-slate-100 dark:border-slate-800/40 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Default Bill & Invoice Template (Vyapar-Style)</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-extrabold text-slate-800 dark:text-slate-200 text-xs">{activeBillFormatConfig.name}</span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${activeBillFormatConfig.tagClass}`}>{activeBillFormatConfig.tag}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{activeBillFormatConfig.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsBillFormatModalOpen(true)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 dark:text-indigo-300 text-xs font-bold rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 transition-all cursor-pointer shadow-3xs flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Choose Bill Format (6 Presets)
                    </button>
                  </div>

                  <div className="space-y-1 sm:col-span-2 lg:col-span-3 pt-2 border-t border-slate-100 dark:border-slate-800/40 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Database Backup & Device Safety</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-extrabold ${lastBackupTime ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                          {lastBackupTime ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                          {lastBackupTime ? `Last backup: ${new Date(lastBackupTime).toLocaleDateString()}` : 'No backup yet - Local only!'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Exports all products, sales, customers, khata, POs & settings as single JSON with native share.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveSection('database')}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200/80 dark:border-slate-700/60 transition-all cursor-pointer shadow-3xs flex items-center gap-1.5"
                    >
                      <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
                      Manage Backup & Restore
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
                    maxLength={15}
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="e.g. 27AAAAA1111A1Z1"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 font-bold transition-colors font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wilder mb-1.5 select-none">
                    FSSAI License Number (Food Safety)
                  </label>
                  <input
                    type="text"
                    maxLength={14}
                    value={fssai}
                    onChange={(e) => setFssai(e.target.value.replace(/\D/g, '').slice(0, 14))}
                    placeholder="e.g. 10020022001122"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-250 dark:border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 font-bold transition-colors font-mono"
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
                    <option value="₹">₹ (INR Rupee Symbol)</option>
                    <option value="Rs.">Rs. (Indian Rupee Text)</option>
                    <option value="INR">INR (Currency Code)</option>
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

              {/* Day Change Midnight Logout row */}
              <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/60 space-y-3">
                <div className="flex justify-between items-center select-none gap-4">
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-250 flex items-center gap-1.5">
                      <Moon className="w-3.5 h-3.5 text-indigo-500" />
                      Auto-Logout on Date Change (Midnight Rollover)
                    </h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-semibold">
                      Automatically signs out session at 12:00 AM (midnight) when the date changes to ensure clean daily ledger and billing rollover.
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={autoLogoutOnDayChange}
                      onChange={(e) => setAutoLogoutOnDayChange(e.target.checked)}
                      className="sr-only peer" 
                      id="day-change-auto-logout-toggle"
                    />
                    <div className="w-9 h-5 bg-slate-300 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2.5px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-500" />
                  </label>
                </div>

                {autoLogoutOnDayChange && (
                  <div className="pt-3 border-t border-slate-200/70 dark:border-slate-800/70 space-y-2">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider select-none">
                      Advance Warning Notification
                    </label>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1">
                        <select
                          value={dayChangeWarningMinutes}
                          onChange={(e) => setDayChangeWarningMinutes(Number(e.target.value))}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 cursor-pointer shadow-xs transition-colors"
                        >
                          <option value={2}>2 minutes before (11:58 PM)</option>
                          <option value={5}>5 minutes before (11:55 PM - Recommended)</option>
                          <option value={10}>10 minutes before (11:50 PM)</option>
                          <option value={15}>15 minutes before (11:45 PM)</option>
                        </select>
                      </div>

                      {onTestDayChangeWarning && (
                        <button
                          type="button"
                          onClick={onTestDayChangeWarning}
                          className="px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl border border-indigo-200/80 dark:border-indigo-800/60 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shrink-0 shadow-xs"
                          title="Simulate the 5-minute pre-logout warning banner and chime"
                        >
                          <Clock className="w-3.5 h-3.5" />
                          Preview Notification Banner
                        </button>
                      )}
                    </div>
                  </div>
                )}
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

          {/* BARCODE LABEL BRANDING & TYPOGRAPHY CARD */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-5">
            <div className="border-b border-slate-100 dark:border-slate-800/50 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 select-none">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-600 dark:text-indigo-400">
                  <Tag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Barcode Label Branding & Typography
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                    Customize shop name font style & brand color printed on barcode stickers
                  </p>
                </div>
              </div>

              {/* Live Preview Badge */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Live Tag Preview:</span>
                <span 
                  className={`px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider ${activeShopFont.cssClass}`}
                  style={{ color: activeShopColor.hex, backgroundColor: `${activeShopColor.hex}14` }}
                >
                  {shopName || 'Shop Name'}
                </span>
              </div>
            </div>

            {/* Typography Selection */}
            <div className="space-y-2">
              <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
                Shop Name Font Typography
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {SHOP_NAME_FONTS.map(font => {
                  const isSelected = barcodeLabelShopNameFont === font.id;
                  return (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => handleUpdateBarcodeLabelFont(font.id)}
                      className={`p-3 rounded-2xl text-left transition-all border cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-500/20 shadow-xs font-bold'
                          : 'bg-slate-50/70 dark:bg-slate-950 border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                        {font.label}
                      </div>
                      <div className={`text-xs sm:text-sm mt-1 truncate ${font.cssClass}`}>
                        {font.preview}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Brand Color Palette */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800/40">
              <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider select-none">
                Brand Text Color
              </label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(SHOP_NAME_COLORS) as ShopNameColorKey[]).map(cKey => {
                  const c = SHOP_NAME_COLORS[cKey];
                  const isSelected = barcodeLabelShopNameColor === cKey;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleUpdateBarcodeLabelColor(c.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-white dark:bg-slate-900 border-indigo-500 text-slate-900 dark:text-slate-100 shadow-xs ring-2 ring-indigo-500/30'
                          : 'bg-slate-50/80 dark:bg-slate-950 border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-xs shrink-0"
                        style={{ backgroundColor: c.hex }}
                      />
                      <span>{c.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
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
              Integrated Register Tools & Modules
            </h3>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-1">
              Access store utility tools, user manual & operational guides, supplier logs, cashier roster PINs, sticker generators, and daily expenses.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {onOpenAppGuide && (
              <button
                onClick={onOpenAppGuide}
                className="group p-5 bg-indigo-50/50 border border-indigo-200/80 dark:bg-indigo-950/25 dark:border-indigo-800/40 rounded-2xl hover:border-indigo-500 transition-all text-left flex flex-col justify-between items-start cursor-pointer active:scale-98 relative overflow-hidden animate-fade-in"
              >
                <div className="space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide flex items-center gap-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      User Manual & Guide
                      <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-1 uppercase tracking-wider">
                      Workflows, button dictionary & PDF guide
                    </p>
                  </div>
                </div>
              </button>
            )}
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
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">Biometric & Touch Unlock</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-505 font-medium leading-relaxed">
                    {bioInfo.isNative
                      ? `Native ${bioInfo.biometryType || 'fingerprint / face unlock'} is supported via Android hardware sensors.`
                      : bioInfo.isAvailable
                      ? 'Link platform biometrics (fingerprint / face recognition) for fast hardware-secured login.'
                      : 'Hardware WebAuthn biometrics is not supported in this browser environment. Touch bypass provides simulated demo unlock without cryptographic security.'}
                  </p>
                </div>

                <div className="w-full space-y-3">
                  <span className={`text-[9px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider block ${
                    currentAuth.fpId === 'simulated_biometric'
                      ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50'
                      : currentAuth.fpId
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
                      : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-855 text-slate-500 dark:text-slate-400'
                  }`}>
                    {biometricStatus}
                  </span>

                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={onRegisterBiometric}
                      className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all active:scale-95 shadow-sm"
                    >
                      {currentAuth.fpId 
                        ? 'Reconfigure Credentials' 
                        : bioInfo.isNative 
                        ? `Setup Native ${bioInfo.biometryType}` 
                        : bioInfo.isAvailable 
                        ? 'Setup Biometric Lock' 
                        : 'Setup Touch Bypass (Non-Secure)'}
                    </button>

                    {currentAuth.fpId && onRemoveBiometric && (
                      <button
                        type="button"
                        onClick={onRemoveBiometric}
                        className="w-full py-1.5 px-3 bg-slate-200/70 hover:bg-rose-100 dark:bg-slate-800 dark:hover:bg-rose-950/40 text-slate-600 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 text-[9px] font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-all active:scale-95"
                      >
                        Remove / Disable Biometrics
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Layout & Widgets Tab Panel */}
      {activeSection === 'layout' && (
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-6 animate-fade-in">
          <div className="border-b border-slate-100 dark:border-slate-800/50 pb-4 select-none flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
                Dashboard Layout & Widgets
              </h3>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium mt-1">
                Customize which widgets appear on the main store register and reorder their vertical display sequence.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleEnableAllWidgets}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/50 text-indigo-650 dark:text-indigo-400 text-xs font-black uppercase tracking-wider rounded-xl border border-indigo-200/60 dark:border-indigo-800/60 cursor-pointer transition-all active:scale-95"
              >
                Enable All
              </button>
              <button
                type="button"
                onClick={handleResetDashboardWidgets}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1 cursor-pointer transition-all active:scale-95"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Default
              </button>
            </div>
          </div>

          {widgetSaveToast && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 animate-in fade-in select-none">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{widgetSaveToast}</span>
            </div>
          )}

          {/* Widget list */}
          <div className="space-y-3">
            {dashboardWidgets.map((widget, index) => (
              <div
                key={widget.id}
                className={`p-4 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                  widget.visible
                    ? 'bg-slate-50 dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-800/80 shadow-2xs'
                    : 'bg-slate-100/40 dark:bg-slate-950/20 border-dashed border-slate-200 dark:border-slate-800/60 opacity-60'
                }`}
              >
                {/* Reorder and description */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex flex-col items-center justify-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveWidgetOrder(index, 'up')}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={index === dashboardWidgets.length - 1}
                      onClick={() => handleMoveWidgetOrder(index, 'down')}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-200/70 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-20 disabled:pointer-events-none cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-850 dark:text-slate-100">
                        {widget.name}
                      </span>
                      {!widget.visible && (
                        <span className="text-[8.5px] bg-slate-200 dark:bg-slate-800 text-slate-500 font-bold px-2 py-0.5 rounded-md uppercase">
                          Hidden
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5 leading-snug">
                      {widget.description}
                    </p>
                  </div>
                </div>

                {/* Visibility toggle button */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleWidgetVisibility(widget.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                      widget.visible
                        ? 'bg-indigo-600 text-white shadow-xs hover:bg-indigo-500'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-slate-700'
                    }`}
                  >
                    {widget.visible ? (
                      <>
                        <Eye className="w-3.5 h-3.5" />
                        <span>Visible</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hidden</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-2xl border border-slate-200/60 dark:border-slate-850 flex items-center justify-between text-slate-400 text-xs">
            <span className="text-[11px] font-semibold">
              Changes take effect immediately across all dashboard views.
            </span>
          </div>
        </div>
      )}

      {/* Backup & Restore Systems Panel */}
      {activeSection === 'database' && (
        <div className="space-y-6 animate-fade-in">
          {/* Backup Alert Box */}
          {needsBackupAlert && (
            <div className="bg-amber-50 dark:bg-amber-955/15 border border-amber-200/50 dark:border-amber-900/40 rounded-2xl p-4 text-amber-900 dark:text-amber-300 shadow-xs flex items-start gap-3 relative overflow-hidden select-none">
              <AlertTriangle className="w-5 h-5 mt-0.5 text-amber-550 dark:text-amber-400 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-xs font-black uppercase text-amber-850 dark:text-amber-350 leading-none">
                  Backup Recommended: Protect Your Business Data
                </h3>
                <p className="text-[11px] text-amber-700/90 dark:text-amber-400/80 mt-1.5 font-semibold leading-relaxed">
                  {lastBackupTime 
                    ? `Your database has not been backed up for ${Math.round((Date.now() - new Date(lastBackupTime).getTime()) / 86400000)} days. Export and save a copy to Google Drive, WhatsApp, or email to prevent accidental data loss.` 
                    : "No backup created yet! Local data is stored on this device. Create a backup now and share it to Google Drive or Email so you can restore your shop records if your device is damaged, lost, or reset."}
                </p>
                <button
                  type="button"
                  onClick={onExportData}
                  className="mt-2.5 text-[11px] font-black uppercase text-amber-805 hover:text-amber-955 dark:text-amber-400 dark:hover:text-amber-250 underline flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Export & Share Full Backup Now
                </button>
              </div>
            </div>
          )}

          {/* Backup & Export Card */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-xs space-y-6">
            <div className="border-b border-slate-100 dark:border-slate-800/50 pb-4 select-none flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-2">
                  <HardDrive className="w-5 h-5 text-indigo-500" />
                  Full Database Backup & Cloud Share
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-1">
                  Exports everything into a single JSON file and saves to <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-[10px] text-indigo-600 dark:text-indigo-400 font-bold">Documents/ShopPOS Pro/Backups/</code> with direct cloud sharing.
                </p>
              </div>
              <div className="shrink-0">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase ${
                  lastBackupTime 
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40' 
                    : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/40'
                }`}>
                  {lastBackupTime ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                  {lastBackupTime 
                    ? `Backed Up: ${new Date(lastBackupTime).toLocaleDateString()}` 
                    : 'No Backup Yet'}
                </span>
              </div>
            </div>

            {/* Scope of Included Backup Data */}
            <div className="space-y-3">
              <label className="block text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                Data Included In Full Backup Package
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl">
                  <span className="block text-base font-black text-slate-850 dark:text-slate-100">{db.products.length}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Products & Stock</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl">
                  <span className="block text-base font-black text-slate-850 dark:text-slate-100">{db.sales.length}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Invoices & Bills</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl">
                  <span className="block text-base font-black text-slate-850 dark:text-slate-100">{db.customers.length}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Customers & Khata</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl">
                  <span className="block text-base font-black text-slate-850 dark:text-slate-100">{(db.purchases || []).length}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Purchase Orders</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl">
                  <span className="block text-base font-black text-slate-850 dark:text-slate-100">{(db.suppliers || []).length}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Suppliers</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl">
                  <span className="block text-base font-black text-slate-850 dark:text-slate-100">{(db.staff || []).length}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Staff & Cashiers</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl">
                  <span className="block text-base font-black text-slate-850 dark:text-slate-100">{(db.expenses || []).length}</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Store Expenses</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/50 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl">
                  <span className="block text-base font-black text-slate-850 dark:text-slate-100">
                    {((db.estimates || []).length) + ((db.deliveryChallans || []).length) + ((db.creditDebitNotes || []).length)}
                  </span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Quotations & Docs</span>
                </div>
              </div>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <button
                type="button"
                disabled={isExportingBackup}
                onClick={handleExportWithFeedback}
                className="flex items-center justify-center gap-2.5 py-4 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-black uppercase tracking-wider rounded-2xl transition-all active:scale-98 cursor-pointer shadow-md shadow-indigo-600/20 select-none"
              >
                <Upload className="w-4 h-4 stroke-[2.5px]" />
                {isExportingBackup ? 'Exporting & Saving Backup...' : 'Export & Share Backup (JSON)'}
              </button>

              <label className="flex items-center justify-center gap-2.5 py-4 px-4 border-2 border-emerald-500/40 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 text-xs font-black uppercase tracking-wider rounded-2xl cursor-pointer transition-all active:scale-98 select-none shadow-xs">
                <Download className="w-4 h-4 stroke-[2.5px] text-emerald-600 dark:text-emerald-400" />
                Restore from Backup File (.JSON)
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => onImportData(e.target)}
                />
              </label>
            </div>

            {/* Storage and folder details */}
            <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-4 border border-slate-200/60 dark:border-slate-850 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                <span>Local Device Storage Usage</span>
                <span className="font-mono text-xs text-slate-700 dark:text-slate-300">{usedMB} MB of ~{totalMB} MB ({quotaPct.toFixed(1)}%)</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-300 ${
                    quotaPct > 85 ? 'bg-red-500' : quotaPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.max(2, quotaPct).toFixed(1)}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                💡 <span className="font-bold">Cloud Safe Tip:</span> When you click "Export & Share Backup", use the share menu to send the JSON file to your Google Drive, email it to yourself, or send it on WhatsApp so your data is safe even if this phone is lost or replaced.
              </p>
            </div>
          </div>

          {/* Destructive / Factory Reset Zone */}
          <div className="bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200/70 dark:border-rose-900/40 rounded-3xl p-6 space-y-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <h4 className="text-xs font-black uppercase text-rose-800 dark:text-rose-300 tracking-wider">
                Danger Zone: Factory Reset
              </h4>
            </div>
            <p className="text-[11px] text-rose-700/90 dark:text-rose-400/80 font-medium leading-relaxed">
              Wipes all products, customer ledgers, and transaction history. Please export a backup first before resetting.
            </p>
            <button
              type="button"
              id="settings-clear-all-data-btn"
              onClick={() => {
                setAdminPasscodeInput('');
                setWipeError(null);
                setShowWipePasscode(false);
                setWipeStep(1);
                setIsWipeModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 text-white text-xs font-black rounded-xl transition-all active:scale-95 cursor-pointer uppercase select-none shadow-xs"
            >
              <Trash className="w-3.5 h-3.5" />
              Clear All Data (Factory Reset)
            </button>
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
              {/* 6 Bill Formats Selection (Vyapar Style) */}
              <BillFormatSelector
                selectedFormat={billFormat}
                onSelectFormat={setBillFormat}
              />

              {/* Default Thermal Paper Dimension Selector */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
                <label className="block text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                  Default Thermal Printer Paper Size
                </label>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                  Select your physical POS thermal receipt roll width standard
                </p>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPreferredReceiptPaperSize('58mm')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                      preferredReceiptPaperSize === '58mm'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850'
                    }`}
                  >
                    58mm (2" Standard)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreferredReceiptPaperSize('80mm')}
                    className={`py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer border ${
                      preferredReceiptPaperSize === '80mm'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-850'
                    }`}
                  >
                    80mm (3" Wide POS)
                  </button>
                </div>
              </div>

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

              {/* Barcode Label Shop Name Typography & Color */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3.5 select-none">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300">
                      🏷️ Barcode Label Shop Name Styling
                    </label>
                    <p className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold leading-normal mt-0.5">
                      Font typography & brand color for shop name printed on sticker barcode tags.
                    </p>
                  </div>
                  <span 
                    className={`px-2.5 py-0.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider ${activeShopFont.cssClass}`}
                    style={{ color: activeShopColor.hex, backgroundColor: `${activeShopColor.hex}14` }}
                  >
                    {shopName || 'Shop Name'}
                  </span>
                </div>

                {/* Font Choices */}
                <div className="space-y-1.5">
                  <label className="block text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Font Typography
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SHOP_NAME_FONTS.map(font => (
                      <button
                        key={font.id}
                        type="button"
                        onClick={() => handleUpdateBarcodeLabelFont(font.id)}
                        className={`p-2 rounded-xl text-left transition-all border cursor-pointer ${
                          barcodeLabelShopNameFont === font.id
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-500 text-indigo-600 dark:text-indigo-300 font-bold shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                        }`}
                      >
                        <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 leading-tight">
                          {font.label}
                        </div>
                        <div className={`text-xs truncate leading-tight mt-0.5 ${font.cssClass}`}>
                          {font.preview}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Choices */}
                <div className="space-y-1.5">
                  <label className="block text-[9.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Brand Text Color
                  </label>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {(Object.keys(SHOP_NAME_COLORS) as ShopNameColorKey[]).map(cKey => {
                      const c = SHOP_NAME_COLORS[cKey];
                      const isSelected = barcodeLabelShopNameColor === cKey;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleUpdateBarcodeLabelColor(c.id)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-white dark:bg-slate-900 border-indigo-500 text-slate-900 dark:text-slate-100 shadow-xs ring-1 ring-indigo-500/40'
                              : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          <span 
                            className="w-3 h-3 rounded-full border border-black/10 flex-shrink-0"
                            style={{ backgroundColor: c.hex }}
                          />
                          <span className="text-[10px]">{c.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
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
                    preferredReceiptPaperSize,
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
                    barcodeLabelShopNameFont,
                    barcodeLabelShopNameColor,
                    billFormat,
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
      {/* WIPE & RESET TWO-STEP CONFIRMATION MODAL */}
      {isWipeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-xs z-[9000] flex items-center justify-center p-4 animate-fade-in select-none">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-rose-200 dark:border-rose-900/50 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header with Step Progress Indicator */}
            <div className="p-5 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-100 dark:border-rose-900/40 flex items-start justify-between gap-3.5">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <ShieldAlert className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-rose-900 dark:text-rose-200 uppercase tracking-wide">
                      Clear All Data
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-200/70 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300">
                      Step {wipeStep} of 2
                    </span>
                  </div>
                  <p className="text-[11px] font-bold text-rose-700 dark:text-rose-400 mt-0.5 leading-snug">
                    {wipeStep === 1 ? 'Step 1: Permanent Data Loss Warning' : 'Step 2: Admin Master Passcode Authorization'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsWipeModalOpen(false);
                  setAdminPasscodeInput('');
                  setWipeError(null);
                  setWipeStep(1);
                }}
                className="w-8 h-8 rounded-full bg-rose-100/70 hover:bg-rose-200 text-rose-700 dark:bg-rose-900/40 dark:hover:bg-rose-900/60 dark:text-rose-300 flex items-center justify-center cursor-pointer transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* STEP 1: WARNING & SCOPE OF ERASURE */}
            {wipeStep === 1 && (
              <div className="p-5 space-y-4">
                {/* Critical Alert Box */}
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-rose-900 dark:text-rose-200 leading-relaxed">
                    <p className="font-black uppercase tracking-wide mb-1 text-rose-700 dark:text-rose-300">
                      Irreversible Factory Reset
                    </p>
                    <p className="font-semibold">
                      This operation will permanently wipe and erase all database records from this device. Once executed, this data cannot be recovered.
                    </p>
                  </div>
                </div>

                {/* Detailed Erasure Checklist */}
                <div className="space-y-2">
                  <p className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Records that will be permanently erased:
                  </p>
                  <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2 text-xs text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <span><strong>Inventory & Products:</strong> Stock levels, pricing, barcodes, and HSN/GST mappings</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <span><strong>Sales & Invoices:</strong> All past bills, quotations, receipts, and cash register logs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <span><strong>Accounts & Ledgers:</strong> Customer balances, reward points, and supplier purchase records</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <span><strong>Store Settings:</strong> Staff roster logins, branch profiles, and local cached data</span>
                    </div>
                  </div>
                </div>

                {/* Redirect Note */}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  💡 You will be immediately logged out and taken to the <strong>First Login Setup Wizard</strong> to register a new store.
                </p>

                {/* Step 1 Actions */}
                <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setIsWipeModalOpen(false);
                      setAdminPasscodeInput('');
                      setWipeError(null);
                      setWipeStep(1);
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    Cancel (Keep Data)
                  </button>
                  <button
                    type="button"
                    id="settings-proceed-wipe-step2-btn"
                    onClick={() => {
                      setWipeError(null);
                      setWipeStep(2);
                    }}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-2 shadow-md shadow-rose-600/20 cursor-pointer transition-all"
                  >
                    <span>Proceed to Step 2</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: PASSCODE VERIFICATION & FINAL CONFIRMATION */}
            {wipeStep === 2 && (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setWipeError(null);
                  if (!adminPasscodeInput.trim()) {
                    setWipeError('Please enter admin master passcode.');
                    return;
                  }
                  setIsWiping(true);
                  try {
                    const enteredHash = await hashPassword(adminPasscodeInput.trim());
                    if (enteredHash !== currentAuth.pwHash) {
                      setWipeError('❌ Incorrect Admin Passcode! Verification failed.');
                      setIsWiping(false);
                      return;
                    }
                    // Verification Passed! Ask for explicit final confirmation
                    const confirmed = await showConfirm(
                      'Are you sure you want to completely wipe and reset all store data?\n\n• All inventory products, sales bills, customer accounts, staff rosters, and store settings will be PERMANENTLY ERASED.\n• You will be redirected immediately to the First Login Setup page to configure a new store.\n\nClick "Confirm" to proceed and go to First Login Setup, or "Cancel" to keep all your data intact.',
                      'Confirm Wipe & Reset — Return to First Login Setup?'
                    );
                    if (!confirmed) {
                      setIsWiping(false);
                      return;
                    }

                    setIsWipeModalOpen(false);
                    setAdminPasscodeInput('');
                    setWipeError(null);
                    setWipeStep(1);
                    onClearAllData();
                  } catch (err: any) {
                    setWipeError('Verification error. Please try again.');
                  } finally {
                    setIsWiping(false);
                  }
                }}
                className="p-5 space-y-4"
              >
                {/* Authorization Banner */}
                <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 rounded-2xl flex items-start gap-2.5">
                  <Key className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-amber-900 dark:text-amber-200 leading-relaxed font-semibold">
                    <p className="font-black uppercase tracking-wide mb-1 text-amber-800 dark:text-amber-300">
                      Step 2: Admin Passcode Authorization
                    </p>
                    Please enter the Master Admin Passcode to authorize this irreversible factory reset.
                  </div>
                </div>

                {/* Passcode Input */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider block">
                    Admin Master Passcode
                  </label>
                  <div className="relative">
                    <input
                      type={showWipePasscode ? 'text' : 'password'}
                      value={adminPasscodeInput}
                      onChange={(e) => {
                        setAdminPasscodeInput(e.target.value);
                        if (wipeError) setWipeError(null);
                      }}
                      placeholder="Enter Admin Master Passcode"
                      autoFocus
                      required
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20 font-bold transition-all pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWipePasscode(!showWipePasscode)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer"
                      tabIndex={-1}
                    >
                      {showWipePasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Error feedback */}
                {wipeError && (
                  <div className="p-2.5 bg-red-100 dark:bg-red-950/40 text-red-700 dark:text-red-300 text-xs font-black rounded-xl border border-red-200 dark:border-red-800 animate-in fade-in flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                    <span>{wipeError}</span>
                  </div>
                )}

                {/* Step 2 Actions */}
                <div className="pt-2 flex items-center justify-between gap-2.5 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setWipeError(null);
                      setWipeStep(1);
                    }}
                    className="px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Step 1</span>
                  </button>
                  <button
                    type="submit"
                    id="settings-confirm-wipe-btn"
                    disabled={isWiping}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-md shadow-rose-600/20 cursor-pointer transition-all disabled:opacity-50"
                  >
                    <Trash className="w-4 h-4" />
                    <span>{isWiping ? 'Verifying...' : 'Confirm Factory Reset'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
