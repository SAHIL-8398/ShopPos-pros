/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { 
  Home, 
  ShoppingCart, 
  Package, 
  Users, 
  BarChart3, 
  Settings as SettingsIcon,
  Unlock,
  AlertTriangle,
  Notebook,
  RefreshCw,
  X,
  CreditCard,
  History,
  QrCode,
  Scan,
  Sun,
  Moon,
  Fingerprint,
  Bell,
  LogOut,
  Calendar,
  ArrowUpDown,
  Calculator,
  FileText,
  ArrowLeft
} from 'lucide-react';

import { AppDatabase, Product, Sale, Customer, Expense, Supplier, Staff, Settings, SaleItem, PurchaseItem } from './types';
import { 
  initIndexedDB, 
  getDBFromIndexedDB, 
  saveDBToIndexedDB, 
  estimateStorage, 
  createDefaultDatabase,
  hashPassword 
} from './db';
import { generateId, getTodayDateString, formatCurrency, playBeepSound, computePredictiveAlerts, translate, formatDate, formatHeaderDate } from './utils';
import { LocalizationProvider } from './context/LocalizationContext';
import { initAppStorage } from './services/nativeStorage';

// Extracted Sub-Views
import { DashboardView } from './components/DashboardView';
import { BillingView } from './components/BillingView';
import { InventoryView } from './components/InventoryView';
import { CustomersView } from './components/CustomersView';
import { DocumentsView } from './components/DocumentsView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';

// Extracted Helper Modals
import { ReceiptView } from './components/ReceiptView';
import { ScannerOverlay } from './components/ScannerOverlay';
import { LabelGenerator } from './components/LabelGenerator';
import { ProductFormModal } from './components/ProductFormModal';
import { CheckoutModal } from './components/CheckoutModal';
import { SuppliersViewModal } from './components/SuppliersViewModal';
import { StaffRosterViewModal } from './components/StaffRosterViewModal';
import { ExpensesModal } from './components/ExpensesModal';
import { CustomerFormModal } from './components/CustomerFormModal';
import { CalculatorModal } from './components/CalculatorModal';
import { DayChangeLogoutBanner } from './components/DayChangeLogoutBanner';
import { AppLogo } from './components/AppLogo';

interface AppHistoryState {
  idx: number;
  tab: string;
  isProductModalOpen: boolean;
  activeProductId: string | null;
  isCheckoutOpen: boolean;
  isReceiptOpen: boolean;
  receiptSaleId: string | null;
  isScannerOpen: boolean;
  scannerMode: 'bill' | 'restock' | 'prod' | 'return_bill';
  isSuppliersOpen: boolean;
  isStaffOpen: boolean;
  isLabelsOpen: boolean;
  isExpensesOpen: boolean;
  isHistoryOpen: boolean;
  isAlertsOpen: boolean;
  isCustomerModalOpen: boolean;
  activeCustomerId: string | null;
  isCalculatorOpen: boolean;
  isUpiQrOpen: boolean;
  dayDetailsDate: string | null;
  activeBillDetailsId: string | null;
  returnBillId: string | null;
}

export default function App() {
  // Navigation history tracker refs
  const historyIdxRef = useRef<number>(0);
  const isInternalStateChange = useRef<boolean>(false);
  const isCheckingOutRef = useRef<boolean>(false);

  // Debounced write engine refs for high-throughput typing & state changes
  const pendingDbRef = useRef<AppDatabase | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Database State
  const [db, setDb] = useState<AppDatabase | null>(null);
  const [idbConn, setIdbConn] = useState<IDBDatabase | null>(null);
  const [storageStats, setStorageStats] = useState<{ used: number; total: number }>({ used: 0, total: 0 });

  // Session Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loginUserId, setLoginUserId] = useState<string>('');
  const [loginPw, setLoginPw] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [loginLockoutMsg, setLoginLockoutMsg] = useState<string>('');

  // Primary active Tab
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  // Biometric simulation overlay state
  const [showBiometricScanOverlay, setShowBiometricScanOverlay] = useState<boolean>(false);

  // Checkout Billing Cart state
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [checkoutCustInfo, setCheckoutCustInfo] = useState<{ name: string; phone: string; address: string } | null>(null);

  // General Modal Toggles
  const [activeProductId, setActiveProductId] = useState<string | null>(null); // Null = new, string = edit
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);
  const [activeReceiptSale, setActiveReceiptSale] = useState<Sale | null>(null);

  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);
  const [scannerMode, setScannerMode] = useState<'bill' | 'restock' | 'prod' | 'return_bill'>('bill');
  const [scannerField, setScannerField] = useState<string>(''); // For attaching scan to modal fields
  const [scannedBarcodeProduct, setScannedBarcodeProduct] = useState<string>('');

  const [isSuppliersOpen, setIsSuppliersOpen] = useState<boolean>(false);
  const [isStaffOpen, setIsStaffOpen] = useState<boolean>(false);
  const [isLabelsOpen, setIsLabelsOpen] = useState<boolean>(false);
  const [isExpensesOpen, setIsExpensesOpen] = useState<boolean>(false);
  
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [searchHistoryQuery, setSearchHistoryQuery] = useState<string>('');
  const [historySortBy, setHistorySortBy] = useState<'date' | 'amount' | 'customer'>('date');
  const [historySortOrder, setHistorySortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [isAlertsOpen, setIsAlertsOpen] = useState<boolean>(false);
  const [dayDetailsDate, setDayDetailsDate] = useState<string | null>(null);

  const [activeBillDetailsId, setActiveBillDetailsId] = useState<string | null>(null);

  // Customer Management states
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);
  const [activeCustomerId, setActiveCustomerId] = useState<string | null>(null);

  // Mini calculator state
  const [isCalculatorOpen, setIsCalculatorOpen] = useState<boolean>(false);

  const [lastBackupTime, setLastBackupTime] = useState<string | null>(() => {
    return localStorage.getItem('shoppos_last_backup');
  });

  // UPI payment QR simulation
  const [qrUpiAmount, setQrUpiAmount] = useState<number | null>(null);
  const [isUpiQrOpen, setIsUpiQrOpen] = useState<boolean>(false);

  // Customer Product Returns and Dark Theme states
  const [returnBillId, setReturnBillId] = useState<string | null>(null);
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('shoppos_theme') === 'dark';
  });

  const [activeStaffId, setActiveStaffId] = useState<string | null>(() => {
    return localStorage.getItem('shoppos_active_staff_id');
  });

  // Day / Date Change (Midnight Rollover) Automatic Logout states
  const sessionDateRef = useRef<string>(getTodayDateString());
  const snoozeUntilMsRef = useRef<number | null>(null);
  const [dayChangeCountdownSecs, setDayChangeCountdownSecs] = useState<number | null>(null);
  const [isDayChangeWarningOpen, setIsDayChangeWarningOpen] = useState<boolean>(false);
  const [isDayChangeBannerMinimized, setIsDayChangeBannerMinimized] = useState<boolean>(false);
  const [sessionLogoutReason, setSessionLogoutReason] = useState<string | null>(null);
  const [isSimulatedWarningTest, setIsSimulatedWarningTest] = useState<boolean>(false);
  const testCountdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSelectActiveStaff = async (id: string | null) => {
    setActiveStaffId(id);
    if (id) {
      localStorage.setItem('shoppos_active_staff_id', id);
    } else {
      localStorage.removeItem('shoppos_active_staff_id');
    }

    if (!db) return;

    let logs = [...(db.staffActivityLogs || [])];
    const now = new Date().toISOString();

    // 1. Log out previous session if any
    if (activeStaffId && activeStaffId !== id) {
      const activeLogIdx = logs.findIndex(l => l.staffId === activeStaffId && l.logoutTime === null);
      if (activeLogIdx !== -1) {
        const activeLog = logs[activeLogIdx];
        const loginMs = new Date(activeLog.loginTime).getTime();
        const durationMs = Date.now() - loginMs;
        logs[activeLogIdx] = {
          ...activeLog,
          logoutTime: now,
          durationMs,
        };
      }
    }

    // 2. Log in new session
    if (id && activeStaffId !== id) {
      const currentStaff = db.staff.find(s => s.id === id);
      if (currentStaff) {
        // Enforce close on any other open logs for this staff to prevent duplicates
        logs = logs.map(l => {
          if (l.staffId === id && l.logoutTime === null) {
            const loginMs = new Date(l.loginTime).getTime();
            return {
              ...l,
              logoutTime: now,
              durationMs: Date.now() - loginMs,
            };
          }
          return l;
        });

        const newLog = {
          id: 'log_' + Math.random().toString(36).substring(2, 9),
          staffId: id,
          staffName: currentStaff.name,
          loginTime: now,
          logoutTime: null,
          durationMs: null,
        };
        logs.unshift(newLog);
      }
    }

    // 3. Just log out if logging out
    if (id === null && activeStaffId) {
      const activeLogIdx = logs.findIndex(l => l.staffId === activeStaffId && l.logoutTime === null);
      if (activeLogIdx !== -1) {
        const activeLog = logs[activeLogIdx];
        const loginMs = new Date(activeLog.loginTime).getTime();
        const durationMs = Date.now() - loginMs;
        logs[activeLogIdx] = {
          ...activeLog,
          logoutTime: now,
          durationMs,
        };
      }
    }

    await triggerSave({
      ...db,
      staffActivityLogs: logs,
    });
  };

  // Sync return quantities on opening a return bill modal
  useEffect(() => {
    if (returnBillId && db) {
      const sale = db.sales.find(s => s.id === returnBillId);
      if (sale) {
        const initialQtys: Record<string, number> = {};
        sale.items.forEach(item => {
          initialQtys[item.id] = 0;
        });
        setReturnQtys(initialQtys);
      }
    } else {
      setReturnQtys({});
    }
  }, [returnBillId, db]);

  // Auto-Lock Inactivity effect
  const autoLockTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeStaffIdRef = useRef<string | null>(activeStaffId);

  useEffect(() => {
    activeStaffIdRef.current = activeStaffId;
  }, [activeStaffId]);

  useEffect(() => {
    const isAutoLockEnabled = db?.settings?.autoLockSession;
    if (!isAutoLockEnabled || !activeStaffId) {
      if (autoLockTimerRef.current) {
        clearTimeout(autoLockTimerRef.current);
        autoLockTimerRef.current = null;
      }
      return;
    }

    const resetTimer = () => {
      if (autoLockTimerRef.current) {
        clearTimeout(autoLockTimerRef.current);
      }
      autoLockTimerRef.current = setTimeout(() => {
        if (activeStaffIdRef.current) {
          handleSelectActiveStaff(null);
          showAlert('🕒 Cashier session automatically locked due to 5 minutes of inactivity.', 'Auto-Lock');
        }
      }, 5 * 60 * 1000);
    };

    resetTimer();

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(evt => window.addEventListener(evt, resetTimer));

    return () => {
      if (autoLockTimerRef.current) {
        clearTimeout(autoLockTimerRef.current);
      }
      events.forEach(evt => window.removeEventListener(evt, resetTimer));
    };
  }, [db?.settings?.autoLockSession, activeStaffId, handleSelectActiveStaff]);

  // Suspended Carts Hold Registry state
  const [suspendedCarts, setSuspendedCarts] = useState<{
    id: string;
    note: string;
    cart: SaleItem[];
    customerName: string;
    customerPhone: string;
    customerAddress: string;
    createdAt: string;
  }[]>(() => {
    try {
      const saved = localStorage.getItem('shoppos_suspended_carts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Custom non-blocking iframe-safe dialog modal helper
  const [dialogConfig, setDialogConfig] = useState<{
    isOpen: boolean;
    type: 'alert' | 'confirm' | 'prompt';
    title: string;
    message: string;
    defaultValue?: string;
    placeholder?: string;
    resolve?: (val: any) => void;
  } | null>(null);

  const showConfirm = (message: string, title = 'Confirm Action') => {
    return new Promise<boolean>((resolve) => {
      setDialogConfig({
        isOpen: true,
        type: 'confirm',
        title,
        message,
        resolve
      });
    });
  };

  const showPrompt = (message: string, defaultValue = '', title = 'Input Required', placeholder = 'Type here...') => {
    return new Promise<string | null>((resolve) => {
      setDialogConfig({
        isOpen: true,
        type: 'prompt',
        title,
        message,
        defaultValue,
        placeholder,
        resolve
      });
    });
  };

  const showAlert = (message: string, title = 'Alert') => {
    return new Promise<void>((resolve) => {
      setDialogConfig({
        isOpen: true,
        type: 'alert',
        title,
        message,
        resolve
      });
    });
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('shoppos_theme', isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);

  // Sync activeTab and open modals with browser history for multi-step back navigation
  useEffect(() => {
    const validTabs = ['dashboard', 'billing', 'inventory', 'customers', 'documents', 'reports', 'settings'];

    // Initialize history state on load if not present
    if (!window.history.state || typeof window.history.state.idx !== 'number') {
      const initialHash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
      const startTab = validTabs.includes(initialHash) ? initialHash : 'dashboard';
      const initialIdx = 0;
      historyIdxRef.current = initialIdx;
      
      const initState: AppHistoryState = {
        idx: initialIdx,
        tab: startTab,
        isProductModalOpen: false,
        activeProductId: null,
        isCheckoutOpen: false,
        isReceiptOpen: false,
        receiptSaleId: null,
        isScannerOpen: false,
        scannerMode: 'bill',
        isSuppliersOpen: false,
        isStaffOpen: false,
        isLabelsOpen: false,
        isExpensesOpen: false,
        isHistoryOpen: false,
        isAlertsOpen: false,
        isCustomerModalOpen: false,
        activeCustomerId: null,
        isCalculatorOpen: false,
        isUpiQrOpen: false,
        dayDetailsDate: null,
        activeBillDetailsId: null,
        returnBillId: null
      };

      window.history.replaceState(initState, '', `#/${startTab}`);
      if (activeTab !== startTab) {
        setActiveTab(startTab);
      }
    } else {
      // If we already have a state on load, restore it
      const state = window.history.state as AppHistoryState;
      historyIdxRef.current = state.idx || 0;
      if (state.tab && validTabs.includes(state.tab)) {
        setActiveTab(state.tab);
      }
      setIsProductModalOpen(Boolean(state.isProductModalOpen));
      setActiveProductId(state.activeProductId || null);
      setIsCheckoutOpen(Boolean(state.isCheckoutOpen));
      setIsReceiptOpen(Boolean(state.isReceiptOpen));
      setIsScannerOpen(Boolean(state.isScannerOpen));
      if (state.scannerMode) setScannerMode(state.scannerMode);
      setIsSuppliersOpen(Boolean(state.isSuppliersOpen));
      setIsStaffOpen(Boolean(state.isStaffOpen));
      setIsLabelsOpen(Boolean(state.isLabelsOpen));
      setIsExpensesOpen(Boolean(state.isExpensesOpen));
      setIsHistoryOpen(Boolean(state.isHistoryOpen));
      setIsAlertsOpen(Boolean(state.isAlertsOpen));
      setIsCustomerModalOpen(Boolean(state.isCustomerModalOpen));
      setActiveCustomerId(state.activeCustomerId || null);
      setIsCalculatorOpen(Boolean(state.isCalculatorOpen));
      setIsUpiQrOpen(Boolean(state.isUpiQrOpen));
      setDayDetailsDate(state.dayDetailsDate || null);
      setActiveBillDetailsId(state.activeBillDetailsId || null);
      setReturnBillId(state.returnBillId || null);
    }

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as AppHistoryState;
      isInternalStateChange.current = true;
      
      if (state && typeof state.idx === 'number') {
        historyIdxRef.current = state.idx;
        if (state.tab && validTabs.includes(state.tab)) {
          setActiveTab(state.tab);
        }
        setIsProductModalOpen(Boolean(state.isProductModalOpen));
        setActiveProductId(state.activeProductId || null);
        setIsCheckoutOpen(Boolean(state.isCheckoutOpen));
        setIsReceiptOpen(Boolean(state.isReceiptOpen));
        setIsScannerOpen(Boolean(state.isScannerOpen));
        if (state.scannerMode) setScannerMode(state.scannerMode);
        setIsSuppliersOpen(Boolean(state.isSuppliersOpen));
        setIsStaffOpen(Boolean(state.isStaffOpen));
        setIsLabelsOpen(Boolean(state.isLabelsOpen));
        setIsExpensesOpen(Boolean(state.isExpensesOpen));
        setIsHistoryOpen(Boolean(state.isHistoryOpen));
        setIsAlertsOpen(Boolean(state.isAlertsOpen));
        setIsCustomerModalOpen(Boolean(state.isCustomerModalOpen));
        setActiveCustomerId(state.activeCustomerId || null);
        setIsCalculatorOpen(Boolean(state.isCalculatorOpen));
        setIsUpiQrOpen(Boolean(state.isUpiQrOpen));
        setDayDetailsDate(state.dayDetailsDate || null);
        setActiveBillDetailsId(state.activeBillDetailsId || null);
        setReturnBillId(state.returnBillId || null);
      } else {
        // If state is null (e.g., from direct hash change), restore tab from hash
        const hash = window.location.hash.replace(/^#\/?/, '').split('?')[0];
        if (validTabs.includes(hash)) {
          setActiveTab(hash);
        }
      }

      setTimeout(() => {
        isInternalStateChange.current = false;
      }, 50);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Synchronize React state changes (UI actions) to the browser history
  useEffect(() => {
    if (isInternalStateChange.current) return;

    const currentIdx = historyIdxRef.current;
    const currentState = window.history.state as AppHistoryState | null;

    // Build the state representation of the current React state
    const targetState: Omit<AppHistoryState, 'idx'> = {
      tab: activeTab,
      isProductModalOpen,
      activeProductId,
      isCheckoutOpen,
      isReceiptOpen,
      receiptSaleId: activeReceiptSale?.id || null,
      isScannerOpen,
      scannerMode,
      isSuppliersOpen,
      isStaffOpen,
      isLabelsOpen,
      isExpensesOpen,
      isHistoryOpen,
      isAlertsOpen,
      isCustomerModalOpen,
      activeCustomerId,
      isCalculatorOpen,
      isUpiQrOpen,
      dayDetailsDate,
      activeBillDetailsId,
      returnBillId
    };

    if (!currentState) {
      window.history.replaceState({ ...targetState, idx: currentIdx }, '', `#/${activeTab}`);
      return;
    }

    // Check if any modal state or tab changed
    const tabChanged = currentState.tab !== activeTab;
    
    // Count open modals in current state vs previous state
    const prevOpenCount = [
      currentState.isProductModalOpen,
      currentState.isCheckoutOpen,
      currentState.isReceiptOpen,
      currentState.isScannerOpen,
      currentState.isSuppliersOpen,
      currentState.isStaffOpen,
      currentState.isLabelsOpen,
      currentState.isExpensesOpen,
      currentState.isHistoryOpen,
      currentState.isAlertsOpen,
      currentState.isCustomerModalOpen,
      currentState.isCalculatorOpen,
      currentState.isUpiQrOpen,
      !!currentState.dayDetailsDate,
      !!currentState.activeBillDetailsId,
      !!currentState.returnBillId
    ].filter(Boolean).length;

    const currentOpenCount = [
      isProductModalOpen,
      isCheckoutOpen,
      isReceiptOpen,
      isScannerOpen,
      isSuppliersOpen,
      isStaffOpen,
      isLabelsOpen,
      isExpensesOpen,
      isHistoryOpen,
      isAlertsOpen,
      isCustomerModalOpen,
      isCalculatorOpen,
      isUpiQrOpen,
      !!dayDetailsDate,
      !!activeBillDetailsId,
      !!returnBillId
    ].filter(Boolean).length;

    if (tabChanged || currentOpenCount > prevOpenCount) {
      // Something was opened or tab changed -> Push new history state!
      const nextIdx = currentIdx + 1;
      historyIdxRef.current = nextIdx;
      window.history.pushState({ ...targetState, idx: nextIdx }, '', `#/${activeTab}`);
    } else {
      // State updated or modal closed in UI -> replace state cleanly
      window.history.replaceState({ ...targetState, idx: currentIdx }, '', `#/${activeTab}`);
    }
  }, [
    activeTab,
    isProductModalOpen,
    activeProductId,
    isCheckoutOpen,
    isReceiptOpen,
    activeReceiptSale?.id,
    isScannerOpen,
    scannerMode,
    isSuppliersOpen,
    isStaffOpen,
    isLabelsOpen,
    isExpensesOpen,
    isHistoryOpen,
    isAlertsOpen,
    isCustomerModalOpen,
    activeCustomerId,
    isCalculatorOpen,
    isUpiQrOpen,
    dayDetailsDate,
    activeBillDetailsId,
    returnBillId
  ]);

  // Biometric simulation auto-unlock timer effect
  useEffect(() => {
    if (showBiometricScanOverlay) {
      const timer = setTimeout(() => {
        setShowBiometricScanOverlay(false);
        localStorage.setItem('sp_session', '1');
        setIsAuthenticated(true);
        setLoginError('');
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [showBiometricScanOverlay]);

  // Initial Load from IndexedDB
  useEffect(() => {
    async function loadData() {
      try {
        const conn = await initIndexedDB();
        setIdbConn(conn);
        
        let localData = await getDBFromIndexedDB(conn);
        if (!localData) {
          localData = await createDefaultDatabase();
          await saveDBToIndexedDB(conn, localData);
        }

        // Handle meta backups if sales grew out of bounds
        if (!localData.meta) {
          localData.meta = { billNo: localData.sales.length ? Math.max(...localData.sales.map(s => typeof s.billNo === 'number' ? s.billNo : parseInt(String(s.billNo)) || 0)) + 1 : 1 };
        }
        
        setDb(localData);

        // Initialize dedicated native storage directory hierarchy on device
        initAppStorage().catch(err => console.warn('Native storage setup notice:', err));

        const stats = await estimateStorage();
        setStorageStats(stats);

        // Session recovery on browser refreshes
        if (localStorage.getItem('sp_session')) {
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error('Local databases init failed:', err);
      }
    }
    loadData();
  }, []);

  // Update lockout notifications on login form triggers
  useEffect(() => {
    if (db && db.auth.lockUntil) {
      const remainingTime = Math.ceil((db.auth.lockUntil - Date.now()) / 1000);
      if (remainingTime > 0) {
        setLoginLockoutMsg(`🔒 Safe lock active. Wait ${remainingTime}s to unlock.`);
        const timer = setTimeout(() => {
          setLoginLockoutMsg('');
          setLoginError('');
        }, remainingTime * 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [db]);

  // Active Cashier inactivity auto lock logout
  useEffect(() => {
    if (!isAuthenticated || !db || !db.settings.autoLockSession) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        handleLogout();
        const toast = document.getElementById('toast');
        if (toast) {
          toast.textContent = '🔒 Session auto-locked due to inactivity';
          toast.classList.add('opacity-100');
          setTimeout(() => toast?.classList.remove('opacity-100'), 3000);
        }
      }, 300000); // 5 minutes inactivity
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keypress', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('touchstart', resetTimer);

    resetTimer();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keypress', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
    };
  }, [isAuthenticated, db?.settings.autoLockSession]);

  // ════════════════════════════════════════
  // AUTOMATIC LOGOUT ON DATE / DAY CHANGE (MIDNIGHT) WITH 5-MIN PRE-WARNING
  // ════════════════════════════════════════
  useEffect(() => {
    if (!isAuthenticated || !db || db.settings.autoLogoutOnDayChange === false) {
      if (!isSimulatedWarningTest) {
        setIsDayChangeWarningOpen(false);
        setDayChangeCountdownSecs(null);
      }
      return;
    }

    const warningMinutes = db.settings.dayChangeWarningMinutes ?? 5;
    const warningThresholdSecs = warningMinutes * 60;

    if (!sessionDateRef.current) {
      sessionDateRef.current = getTodayDateString();
    }

    let hasPlayedWarningChime = false;

    const checkMidnightAndDayChange = () => {
      if (isSimulatedWarningTest) return;

      const now = new Date();
      const currentCalDate = getTodayDateString();

      // 1. Calendar date rolled over past midnight
      if (sessionDateRef.current && sessionDateRef.current !== currentCalDate) {
        performDayChangeLogout();
        return;
      }

      // 2. Time remaining until next midnight (00:00:00)
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
      let targetDeadlineMs = nextMidnight.getTime();

      if (snoozeUntilMsRef.current && snoozeUntilMsRef.current > targetDeadlineMs) {
        targetDeadlineMs = snoozeUntilMsRef.current;
      }

      const msRemaining = targetDeadlineMs - now.getTime();
      const secsRemaining = Math.max(0, Math.floor(msRemaining / 1000));

      if (secsRemaining <= 0) {
        performDayChangeLogout();
        return;
      }

      if (secsRemaining <= warningThresholdSecs) {
        setDayChangeCountdownSecs(secsRemaining);
        setIsDayChangeWarningOpen(true);

        if (!hasPlayedWarningChime) {
          hasPlayedWarningChime = true;
          playBeepSound('error');
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification('⚠️ ShopPOS Midnight Day-Change Warning', {
                body: `Automatic logout in ${Math.ceil(secsRemaining / 60)} minutes for daily accounting rollover.`,
              });
            } catch (e) {
              // ignore
            }
          }
        }
      } else {
        setIsDayChangeWarningOpen(false);
        hasPlayedWarningChime = false;
      }
    };

    checkMidnightAndDayChange();
    const interval = setInterval(checkMidnightAndDayChange, 1000);

    const handleFocusCheck = () => checkMidnightAndDayChange();
    window.addEventListener('focus', handleFocusCheck);
    document.addEventListener('visibilitychange', handleFocusCheck);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocusCheck);
      document.removeEventListener('visibilitychange', handleFocusCheck);
    };
  }, [isAuthenticated, db?.settings?.autoLogoutOnDayChange, db?.settings?.dayChangeWarningMinutes, isSimulatedWarningTest]);

  // Flush pending debounced database write immediately to disk
  const flushPendingSave = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (pendingDbRef.current && idbConn) {
      const toSave = pendingDbRef.current;
      pendingDbRef.current = null;
      try {
        await saveDBToIndexedDB(idbConn, toSave);
        const stats = await estimateStorage();
        setStorageStats(stats);
      } catch (err) {
        console.error('Failed to flush to IndexedDB:', err);
      }
    }
  };

  // Ensure un-flushed writes are safely committed on window close or tab navigation
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (pendingDbRef.current && idbConn) {
        saveDBToIndexedDB(idbConn, pendingDbRef.current);
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [idbConn]);

  if (!db || !idbConn) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center text-white">
        <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
        <p className="text-sm font-semibold tracking-wide">Initializing local POS registers...</p>
      </div>
    );
  }

  // Trigger IndexedDB saves: updates UI state synchronously, debounces & coalesces disk writes to prevent I/O spam
  const triggerSave = async (updatedDb: AppDatabase, options?: { immediate?: boolean }) => {
    setDb(updatedDb);
    pendingDbRef.current = updatedDb;

    if (options?.immediate) {
      await flushPendingSave();
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      await flushPendingSave();
    }, 250);
  };

  // ════════════════════════════════════════
  // AUTH LOGIC
  // ════════════════════════════════════════
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const now = Date.now();
    
    // Check lockout limits
    if (db.auth.lockUntil && now < db.auth.lockUntil) {
      return;
    }

    if (!loginUserId || !loginPw) {
      setLoginError('Complete ID and Passcode fields');
      return;
    }

    const hashed = await hashPassword(loginPw);
    if (loginUserId === db.auth.userId && hashed === db.auth.pwHash) {
      // Clear safety limits
      const updated = {
        ...db,
        auth: { ...db.auth, attempts: 0, lockUntil: 0 }
      };
      await triggerSave(updated);
      
      localStorage.setItem('sp_session', '1');
      sessionDateRef.current = getTodayDateString();
      snoozeUntilMsRef.current = null;
      setSessionLogoutReason(null);
      setIsAuthenticated(true);
      setLoginPw('');
      setLoginUserId('');
      setLoginError('');
    } else {
      const attemptsCount = (db.auth.attempts || 0) + 1;
      let securityLock = 0;
      
      if (attemptsCount >= 5) {
        securityLock = Date.now() + 30000; // Lock for 30s
        setLoginLockoutMsg('🔒 5 failed attempts. Safe lockout active for 30s.');
      }

      const updated = {
        ...db,
        auth: { ...db.auth, attempts: attemptsCount >= 5 ? 0 : attemptsCount, lockUntil: securityLock }
      };
      await triggerSave(updated);

      if (securityLock === 0) {
        setLoginError(`Wrong passcode credentials. ${5 - attemptsCount} attempts left.`);
      }
      setLoginPw('');
    }
  };

  const handleFirstLoginSave = async (nid: string, pw1: string, shopName: string) => {
    const hashed = await hashPassword(pw1);
    const updated = {
      ...db,
      settings: {
        ...db.settings,
        shopName: shopName ? shopName.trim() : 'My Shop',
      },
      auth: {
        ...db.auth,
        userId: nid ? nid.trim() : db.auth.userId,
        pwHash: hashed,
        firstLogin: false,
      }
    };
    await triggerSave(updated);
    localStorage.setItem('sp_session', '1');
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    if (activeStaffIdRef.current) {
      handleSelectActiveStaff(null);
    }
    localStorage.removeItem('sp_session');
    setIsAuthenticated(false);
    setIsDayChangeWarningOpen(false);
    setDayChangeCountdownSecs(null);
    snoozeUntilMsRef.current = null;
  };

  const performDayChangeLogout = () => {
    if (activeStaffIdRef.current) {
      handleSelectActiveStaff(null);
    }
    localStorage.removeItem('sp_session');
    setIsAuthenticated(false);
    setIsDayChangeWarningOpen(false);
    setDayChangeCountdownSecs(null);
    snoozeUntilMsRef.current = null;
    sessionDateRef.current = getTodayDateString();

    playBeepSound('error');
    setSessionLogoutReason('📅 Session was automatically signed out due to Date Change (Midnight Rollover) for clean daily ledger & inventory synchronization.');
  };

  const handleSnoozeDayChangeLogout = (minutes: number = 15) => {
    const newDeadline = Date.now() + minutes * 60 * 1000;
    snoozeUntilMsRef.current = newDeadline;
    setIsDayChangeWarningOpen(false);
    
    const newTimeStr = new Date(newDeadline).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    showAlert(`Session extended by ${minutes} minutes. Automatic logout postponed to ${newTimeStr}.`, 'Session Extended');
  };

  const handleTestDayChangeWarning = () => {
    setIsSimulatedWarningTest(true);
    setDayChangeCountdownSecs(300); // 5 minutes preview
    setIsDayChangeWarningOpen(true);
    setIsDayChangeBannerMinimized(false);
    playBeepSound('error');

    if (testCountdownTimerRef.current) clearInterval(testCountdownTimerRef.current);
    testCountdownTimerRef.current = setInterval(() => {
      setDayChangeCountdownSecs((prev) => {
        if (prev === null || prev <= 1) {
          if (testCountdownTimerRef.current) clearInterval(testCountdownTimerRef.current);
          setIsDayChangeWarningOpen(false);
          setIsSimulatedWarningTest(false);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSuspendCart = (note: string) => {
    if (cart.length === 0) return;
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    
    const newSuspended = {
      id: generateId(),
      note: note || `Basket #${suspendedCarts.length + 1}`,
      cart,
      customerName: checkoutCustInfo?.name || '',
      customerPhone: checkoutCustInfo?.phone || '',
      customerAddress: checkoutCustInfo?.address || '',
      createdAt: timeStr,
    };
    
    const updated = [...suspendedCarts, newSuspended];
    setSuspendedCarts(updated);
    localStorage.setItem('shoppos_suspended_carts', JSON.stringify(updated));
    setCart([]);
    setCheckoutCustInfo(null);
    playBeepSound('success');
  };

  const handleResumeCart = async (id: string) => {
    const target = suspendedCarts.find(s => s.id === id);
    if (!target) return;
    
    if (cart.length > 0) {
      const confirmMerge = await showConfirm('Your active register contains items. Would you like to MERGE the suspended basket with your active cart? (Cancel will overwrite the active cart instead)', 'Resume Basket');
      if (confirmMerge) {
        const newCart = [...cart];
        target.cart.forEach(item => {
          const matched = newCart.find(i => i.id === item.id);
          if (matched) {
            matched.qty += item.qty;
          } else {
            newCart.push({ ...item });
          }
        });
        setCart(newCart);
      } else {
        setCart(target.cart);
      }
    } else {
      setCart(target.cart);
    }

    if (target.customerName || target.customerPhone || target.customerAddress) {
      setCheckoutCustInfo({
        name: target.customerName,
        phone: target.customerPhone,
        address: target.customerAddress,
      });
    }

    const updated = suspendedCarts.filter(s => s.id !== id);
    setSuspendedCarts(updated);
    localStorage.setItem('shoppos_suspended_carts', JSON.stringify(updated));
    playBeepSound('success');
  };

  const handleDeleteSuspendedCart = async (id: string) => {
    const ok = await showConfirm('Are you sure you want to delete this suspended basket from the hold queue?', 'Discard Held Basket');
    if (!ok) return;
    const updated = suspendedCarts.filter(s => s.id !== id);
    setSuspendedCarts(updated);
    localStorage.setItem('shoppos_suspended_carts', JSON.stringify(updated));
    playBeepSound('error');
  };

  // ════════════════════════════════════════
  // CART BUSINESS LOGIC
  // ════════════════════════════════════════
  const handleAddToCart = async (product: Product) => {
    if (product.qty <= 0) {
      await showAlert(`⚠️ ${product.name} is currently OUT OF STOCK.`, 'Out of Stock');
      return;
    }

    const existing = cart.find(i => i.id === product.id);
    if (existing) {
      if (existing.qty >= product.qty && product.qty > 0) {
        await showAlert(`⚠️ Limited Stock Alert: Only ${product.qty} units available.`, 'Limited Stock');
        return;
      }
      setCart(cart.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      setCart([...cart, {
        id: product.id,
        name: product.name,
        price: product.sellPrice || product.mrp,
        mrp: product.mrp,
        buyPrice: product.buyPrice || 0,
        qty: 1,
        unit: product.unit || 'pcs'
      }]);
    }
  };

  const handleRemoveFromCart = (id: string) => {
    setCart(cart.filter(i => i.id !== id));
  };

  const handleChangeCartQty = async (id: string, delta: number) => {
    const existing = cart.find(i => i.id === id);
    if (!existing) return;
    
    const product = db.products.find(p => p.id === id);
    const targetQty = existing.qty + delta;

    if (targetQty <= 0) {
      handleRemoveFromCart(id);
      return;
    }

    if (product && targetQty > product.qty && product.qty > 0) {
      await showAlert(`⚠️ Only ${product.qty} units left in stock.`, 'Stock Limit');
      return;
    }

    setCart(cart.map(i => i.id === id ? { ...i, qty: targetQty } : i));
  };

  const handleCompleteCheckout = async (checkoutDetails: any) => {
    if (isCheckingOutRef.current) return;
    isCheckingOutRef.current = true;

    try {
      const today = getTodayDateString();
      const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
      
      // Generate invoice number formatted as DDMMYY-XXXX (e.g., 020726-0001)
      const [year, month, day] = today.split('-');
      const yy = year.slice(-2);
      const datePrefix = `${day}${month}${yy}`;
      
      const salesToday = db.sales.filter(s => s.date === today);
      const seq = salesToday.length + 1;
      const billNumber = `${datePrefix}-${String(seq).padStart(4, '0')}`;

      let finalCreditCustId = checkoutDetails.creditCustId;
      let finalCustomerName = checkoutCustInfo?.name || '';
      let finalCustomerPhone = checkoutCustInfo?.phone || '';
      let finalCustomerAddress = checkoutCustInfo?.address || '';
      let updatedCustomers = [...db.customers];

      if (checkoutDetails.newCustomer) {
        const newCustId = generateId();
        const newCustObj: Customer = {
          id: newCustId,
          name: checkoutDetails.newCustomer.name,
          phone: checkoutDetails.newCustomer.phone,
          email: checkoutDetails.newCustomer.email || '',
          address: checkoutDetails.newCustomer.address || '',
          createdAt: new Date().toISOString(),
        };
        updatedCustomers.push(newCustObj);
        finalCreditCustId = newCustId;
        finalCustomerName = newCustObj.name;
        finalCustomerPhone = newCustObj.phone;
        finalCustomerAddress = newCustObj.address;
      } else {
        const matchedCustomer = db.customers.find(c => c.id === checkoutDetails.creditCustId);
        if (matchedCustomer) {
          finalCustomerName = matchedCustomer.name;
          finalCustomerPhone = matchedCustomer.phone || '';
          finalCustomerAddress = matchedCustomer.address || '';
        }
      }

      // Construct Sale JSON
      const sale: Sale = {
        id: generateId(),
        billNo: billNumber,
        date: today,
        time: timeStr,
        customer: finalCustomerName || 'Walk-In Customer',
        customerPhone: finalCustomerPhone,
        customerAddress: finalCustomerAddress,
        staffId: checkoutDetails.staffId,
        staffName: checkoutDetails.staffName,
        items: cart,
        subtotal: cart.reduce((sum, item) => sum + item.price * item.qty, 0),
        discount: checkoutDetails.discount,
        gst: checkoutDetails.gst,
        gstPct: checkoutDetails.gstPct,
        total: checkoutDetails.total,
        profit: checkoutDetails.profit,
        paymentMethod: checkoutDetails.paymentMethod,
        splitDetails: checkoutDetails.splitDetails,
        creditPaid: false,
        voided: false,
        creditCustId: finalCreditCustId,
        pointsRedeemed: checkoutDetails.pointsRedeemed || 0,
      };

      // Deduct stock levels indices matched
      const updatedProducts = db.products.map(p => {
        const cartItem = cart.find(i => i.id === p.id);
        if (cartItem) {
          return { ...p, qty: Math.max(0, p.qty - cartItem.qty) };
        }
        return p;
      });

      const updated = {
        ...db,
        customers: updatedCustomers,
        products: updatedProducts,
        sales: [...db.sales, sale],
        meta: { ...db.meta, billNo: db.meta.billNo } // Preserve meta just in case
      };

      await triggerSave(updated);
      
      // Reset Cart
      setCart([]);
      setCheckoutCustInfo(null);
      setIsCheckoutOpen(false);

      // Open receipts preview thermal model
      setActiveReceiptSale(sale);
      setIsReceiptOpen(true);
    } finally {
      isCheckingOutRef.current = false;
    }
  };

  // ════════════════════════════════════════
  // SETTINGS & LOGISTICS DIRECTORY SAVES
  // ════════════════════════════════════════
  const handleSaveShopInfo = async (info: Partial<Settings>) => {
    const updated = {
      ...db,
      settings: { ...db.settings, ...info } as Settings
    };
    await triggerSave(updated);
    await showAlert('Shop settings updated.', 'Settings Saved');
  };

  const handleChangeCredentials = async (nid: string, currentPw: string, newPw: string) => {
    const currentHashed = await hashPassword(currentPw);
    if (currentHashed !== db.auth.pwHash) {
      await showAlert('Wrong current password passcode verification failed.', 'Error');
      return;
    }

    const nextHashed = await hashPassword(newPw);
    const updated = {
      ...db,
      auth: {
        ...db.auth,
        userId: nid ? nid : db.auth.userId,
        pwHash: nextHashed,
      }
    };
    await triggerSave(updated);
    await showAlert('Login Passcode updated.', 'Success');
  };

  const handleRegisterBiometric = async () => {
    try {
      const rpId = window.location.hostname || 'localhost';
      const chall = crypto.getRandomValues(new Uint8Array(32));
      const uId = crypto.getRandomValues(new Uint8Array(16));

      if (!window.PublicKeyCredential) {
        const confirmSim = await showConfirm(
          "Hardware biometric sensors (WebAuthn) are not supported in this Android WebView environment.\n\nWould you like to enable a Non-Secure Virtual Touch Bypass (for demo / quick testing only)?",
          "Enable Non-Secure Touch Bypass"
        );
        if (confirmSim) {
          const updated = {
            ...db,
            auth: { ...db.auth, fpId: 'simulated_biometric', rpId }
          };
          await triggerSave(updated);
          await showAlert('Virtual Touch Bypass enabled (Non-Secure). This will be clearly labeled as non-secure on the login screen.', 'Touch Bypass Active');
        }
        return;
      }

      try {
        const cr = await navigator.credentials.create({
          publicKey: {
            challenge: chall,
            rp: { name: 'ShopPOS Pro', id: rpId },
            user: { id: uId, name: db.auth.userId, displayName: db.auth.userId },
            pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
            authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
            timeout: 60000,
            attestation: 'none'
          }
        });

        if (cr) {
          const rawId = new Uint8Array((cr as any).rawId);
          const b64Id = btoa(String.fromCharCode(...rawId));
          const updated = {
            ...db,
            auth: { ...db.auth, fpId: b64Id, rpId }
          };
          await triggerSave(updated);
          await showAlert('Platform Biometrics fingerprint linked successfully.', 'Biometrics Linked');
        }
      } catch (innerErr: any) {
        console.warn('Physical biometric registration blocked/failed, setting up simulated:', innerErr);
        const confirmSim = await showConfirm(
          "Hardware biometrics was blocked or interrupted (e.g. inside sandboxed WebView).\n\nWould you like to enable a Non-Secure Virtual Touch Bypass for testing instead?",
          "Enable Non-Secure Touch Bypass"
        );
        if (confirmSim) {
          const updated = {
            ...db,
            auth: { ...db.auth, fpId: 'simulated_biometric', rpId }
          };
          await triggerSave(updated);
          await showAlert('Virtual Touch Bypass enabled (Non-Secure). This will be clearly labeled as non-secure on the login screen.', 'Touch Bypass Active');
        }
      }
    } catch (err: any) {
      await showAlert(`Aborted: ${err.message || 'Biometric cancelled.'}`, 'Biometrics');
    }
  };

  const handleSaveSupplier = async (data: Partial<Supplier>) => {
    let updatedSuppliers = [...db.suppliers];
    if (data.id) {
      updatedSuppliers = updatedSuppliers.map(s => s.id === data.id ? { ...s, ...data } as Supplier : s);
    } else {
      updatedSuppliers.push({
        id: generateId(),
        ...data,
      } as Supplier);
    }
    await triggerSave({ ...db, suppliers: updatedSuppliers });
  };

  const handleDeleteSupplier = async (id: string) => {
    if (await showConfirm('Delete this wholesale distributor profile?', 'Delete Supplier')) {
      await triggerSave({
        ...db,
        suppliers: db.suppliers.filter(s => s.id !== id),
        // Remove supplier links from products
        products: db.products.map(p => p.supplierId === id ? { ...p, supplierId: null } : p)
      });
    }
  };

  const handleSavePurchaseOrder = async (po: { supplierId: string; items: PurchaseItem[]; total: number }) => {
    const today = getTodayDateString();
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const newPO = {
      id: generateId(),
      supplierId: po.supplierId,
      items: po.items,
      total: po.total,
      date: today,
      time: timeStr,
    };

    // Increment stocks
    const updatedProducts = db.products.map(p => {
      const addedItem = po.items.find(i => i.id === p.id);
      if (addedItem) {
        return { ...p, qty: p.qty + addedItem.qty, buyPrice: addedItem.buyPrice };
      }
      return p;
    });

    await triggerSave({
      ...db,
      purchases: [...db.purchases, newPO],
      products: updatedProducts,
    });
    await showAlert('Merchandise PO successfully logged. Product stock quantities added.', 'PO Logged');
  };

  const handleSaveStaff = async (data: Partial<Staff>) => {
    let list = [...db.staff];
    if (data.id) {
      list = list.map(s => s.id === data.id ? { ...s, ...data } as Staff : s);
    } else {
      list.push({
        id: generateId(),
        ...data,
      } as Staff);
    }
    await triggerSave({ ...db, staff: list });
  };

  const handleDeleteStaff = async (id: string) => {
    if (await showConfirm('Remove staff operator from catalog?', 'Remove Staff')) {
      await triggerSave({ ...db, staff: db.staff.filter(s => s.id !== id) });
    }
  };

  const handleSaveExpense = async (exp: { desc: string; amount: number; category: string }) => {
    const today = getTodayDateString();
    const timeStr = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    const newExp = {
      id: generateId(),
      desc: exp.desc,
      amount: exp.amount,
      category: exp.category,
      date: today,
      time: timeStr,
    };
    await triggerSave({ ...db, expenses: [...db.expenses, newExp] });
  };

  const handleDeleteExpense = async (id: string) => {
    await triggerSave({ ...db, expenses: db.expenses.filter(e => e.id !== id) });
  };

  // ════════════════════════════════════════
  // PRODUCT CRUD SAVES
  // ════════════════════════════════════════
  const handleSaveProduct = async (data: Partial<Product>) => {
    let list = [...db.products];
    if (activeProductId) {
      list = list.map(p => p.id === activeProductId ? { ...p, ...data } as Product : p);
    } else {
      list.push({
        id: generateId(),
        ...data,
        createdAt: new Date().toISOString(),
      } as Product);
    }
    await triggerSave({ ...db, products: list });
    setIsProductModalOpen(false);
    setActiveProductId(null);
  };

  const handleDeleteProduct = async (id: string) => {
    if (await showConfirm('Permanently remove product SKU from inventory?', 'Remove Product')) {
      await triggerSave({
        ...db,
        products: db.products.filter(p => p.id !== id)
      });
      setIsProductModalOpen(false);
      setActiveProductId(null);
    }
  };

  const handleImportProducts = async (importedProducts: Product[]) => {
    if (!Array.isArray(importedProducts)) {
      await showAlert('Invalid products file format. Please upload a valid JSON backup list of products.', 'Import Error');
      return;
    }

    const isValid = importedProducts.every(p => p && typeof p === 'object' && p.name);
    if (!isValid) {
      await showAlert('Some imported products are missing names or are invalid.', 'Import Error');
      return;
    }

    let merged = [...db.products];
    const existingIds = new Set<string>(merged.map(p => p.id));
    let inserted = 0;
    let updated = 0;

    importedProducts.forEach(ip => {
      // Find matches by exact ID match, barcode match, or case-insensitive name match
      const idx = merged.findIndex(p => 
        (p.id && ip.id && p.id === ip.id) ||
        (p.barcode && ip.barcode && p.barcode.trim() && p.barcode.trim() === ip.barcode.trim()) ||
        (p.name.toLowerCase().trim() === ip.name.toLowerCase().trim())
      );

      if (idx !== -1) {
        merged[idx] = {
          ...merged[idx],
          ...ip,
          id: merged[idx].id, // Retain existing guaranteed non-colliding ID
          qty: Number(ip.qty) || 0,
          mrp: Number(ip.mrp) || 0,
          sellPrice: Number(ip.sellPrice) || Number(ip.mrp) || 0,
          buyPrice: Number(ip.buyPrice) || 0,
        };
        updated++;
      } else {
        // Collision-proof ID allocation
        let newId = ip.id && typeof ip.id === 'string' && !existingIds.has(ip.id) ? ip.id : generateId();
        while (existingIds.has(newId)) {
          newId = generateId();
        }
        existingIds.add(newId);

        merged.push({
          id: newId,
          name: ip.name,
          barcode: ip.barcode || '',
          category: ip.category || 'Other',
          supplierId: ip.supplierId || null,
          mrp: Number(ip.mrp) || 0,
          sellPrice: Number(ip.sellPrice) || Number(ip.mrp) || 0,
          buyPrice: Number(ip.buyPrice) || 0,
          qty: Number(ip.qty) || 0,
          unit: ip.unit || 'pcs',
          lowStockAlert: ip.lowStockAlert !== undefined && ip.lowStockAlert !== null ? Number(ip.lowStockAlert) : null,
          expiryDate: ip.expiryDate || '',
          nearExpiryDays: ip.nearExpiryDays !== undefined && ip.nearExpiryDays !== null ? Number(ip.nearExpiryDays) : null,
          hsn: ip.hsn || '',
          createdAt: ip.createdAt || new Date().toISOString()
        });
        inserted++;
      }
    });

    await triggerSave({ ...db, products: merged }, { immediate: true });
    await showAlert(`Inventory merge successful!\nUpdated: ${updated} items\nInserted: ${inserted} new items`, 'Inventory Merged');
  };

  const handleSaveCustomer = async (data: Partial<Customer>) => {
    let list = [...db.customers];
    if (data.id) {
      list = list.map(c => c.id === data.id ? { ...c, ...data } as Customer : c);
    } else {
      list.push({
        id: generateId(),
        ...data,
        createdAt: getTodayDateString(),
      } as Customer);
    }
    await triggerSave({ ...db, customers: list });
    setIsCustomerModalOpen(false);
    setActiveCustomerId(null);
    
    // Toast notification feedback
    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = `👥 Saved customized profile: ${data.name}`;
      toast.classList.add('opacity-100');
      setTimeout(() => toast?.classList.remove('opacity-100'), 1500);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    const customer = db.customers.find(c => c.id === id);
    if (!customer) return;
    
    await triggerSave({
      ...db,
      customers: db.customers.filter(c => c.id !== id),
      sales: db.sales.map(s => s.creditCustId === id ? { ...s, creditCustId: null } : s)
    });
    
    setIsCustomerModalOpen(false);
    setActiveCustomerId(null);

    const toast = document.getElementById('toast');
    if (toast) {
      toast.textContent = `❌ Deleted client profile: ${customer.name}`;
      toast.classList.add('opacity-100');
      setTimeout(() => toast?.classList.remove('opacity-100'), 1500);
    }
  };

  // ════════════════════════════════════════
  // CAM AND FALLBACK SCANNERS ON_SCAN
  // ════════════════════════════════════════
  const handleOnScanBarcode = async (barcode: string, keepOpen?: boolean) => {
    if (!keepOpen) {
      setIsScannerOpen(false);
    }
    
    if (scannerMode === 'return_bill') {
      const matchBill = db.sales.find(s => String(s.billNo) === barcode || s.id === barcode || `BILL_${s.billNo}` === barcode);
      if (matchBill) {
        setIsScannerOpen(false); // Force close
        playBeepSound('success');
        setActiveBillDetailsId(matchBill.id);
        setIsHistoryOpen(false);
      } else {
        setIsScannerOpen(false); // Force close to see alert
        playBeepSound('error');
        await showAlert(`Invoice Bill #${barcode} not found in database history.`, 'Invoice Not Found');
      }
    } else if (scannerMode === 'bill') {
      const match = db.products.find(p => p.barcode === barcode);
      if (match) {
        await handleAddToCart(match);
        playBeepSound('success');
        // Toast message feedback
        const toast = document.getElementById('toast');
        if (toast) {
          toast.textContent = `🛒 Scanned: ${match.name}`;
          toast.classList.add('opacity-100');
          setTimeout(() => toast?.classList.remove('opacity-100'), 1500);
        }
        if (!keepOpen) {
          setIsScannerOpen(false);
        }
      } else {
        // Intelligent automatic fallback: check if they scanned a client invoice barcode instead of a product SKU item
        const matchBill = db.sales.find(s => String(s.billNo) === barcode || s.id === barcode || `BILL_${s.billNo}` === barcode);
        if (matchBill) {
          setIsScannerOpen(false); // Force close
          playBeepSound('success');
          setActiveBillDetailsId(matchBill.id);
          setIsHistoryOpen(false);
          return;
        }
        setIsScannerOpen(false); // Force close to see alert
        playBeepSound('error');
        await showAlert(`SKU ${barcode} not found in inventory. Go to "Stock" tab to register.`, 'Product Not Found');
      }
    } else if (scannerMode === 'restock') {
      const match = db.products.find(p => p.barcode === barcode);
      if (match) {
        setIsScannerOpen(false); // Force close to see product restock modal
        playBeepSound('success');
        // Restock modal triggering helper
        setActiveProductId(match.id);
        setIsProductModalOpen(true);
      } else {
        setIsScannerOpen(false); // Force close to see product creation modal
        playBeepSound('error');
        // Option to add new with scanned code preset
        setIsProductModalOpen(true);
        setActiveProductId(null);
        setScannerField(barcode);
      }
    } else if (scannerMode === 'prod') {
      setIsScannerOpen(false); // Force close
      playBeepSound('success');
      setScannedBarcodeProduct(barcode);
    }
  };

  const handleProcessReturn = async (saleId: string, itemReturns: { itemId: string; name: string; qtyToReturn: number }[]) => {
    const sale = db.sales.find(s => s.id === saleId);
    if (!sale) {
      await showAlert('Invoice not found.', 'Error');
      return;
    }

    let refundAmount = 0;
    let refundCost = 0;
    let caughtError = false;

    // Check if single item type on the invoice and has discount
    const isSingleItemBillWithDiscount = sale.items.length === 1 && (sale.discount || 0) > 0;
    let originalRefundAmount = 0;
    let discountToDeduct = 0;

    const updatedSaleItems = sale.items.map(item => {
      const ret = itemReturns.find(r => r.itemId === item.id);
      if (ret && ret.qtyToReturn > 0) {
        const alreadyReturned = item.returnedQty || 0;
        const totalQtyAllowed = item.qty;
        if (ret.qtyToReturn > (totalQtyAllowed - alreadyReturned)) {
          showAlert(`Cannot return more than remaining purchased quantity for ${item.name}!`, 'Invalid Return Qty');
          caughtError = true;
        }

        const itemRefund = item.price * ret.qtyToReturn;
        originalRefundAmount += itemRefund;
        refundCost += (item.buyPrice || 0) * ret.qtyToReturn;

        return {
          ...item,
          returnedQty: alreadyReturned + ret.qtyToReturn
        };
      }
      return item;
    });

    if (caughtError) return;

    if (isSingleItemBillWithDiscount && originalRefundAmount > 0) {
      discountToDeduct = sale.discount || 0;
      refundAmount = Math.max(0, originalRefundAmount - discountToDeduct);
    } else {
      refundAmount = originalRefundAmount;
    }

    // Update products stock levels
    const updatedProducts = db.products.map(p => {
      const ret = itemReturns.find(r => r.itemId === p.id);
      if (ret && ret.qtyToReturn > 0) {
        return {
          ...p,
          qty: (Number(p.qty) || 0) + ret.qtyToReturn
        };
      }
      return p;
    });

    const nextTotal = Math.max(0, sale.total - refundAmount);
    const nextProfit = Math.max(0, (sale.profit || 0) - (refundAmount - refundCost));

    const updatedSales = db.sales.map(s => s.id === saleId ? {
      ...s,
      items: updatedSaleItems,
      total: nextTotal,
      profit: nextProfit
    } : s);

    await triggerSave({
      ...db,
      products: updatedProducts,
      sales: updatedSales
    });

    if (isSingleItemBillWithDiscount && discountToDeduct > 0) {
      await showAlert(
        `Customer product return successfully logged!\n\n` +
        `Subtotal Return: Rs.${formatCurrency(originalRefundAmount)}\n` +
        `Discount on Bill: Rs.${formatCurrency(sale.discount)}\n` +
        `Discount Deducted (Full): -Rs.${formatCurrency(discountToDeduct)}\n\n` +
        `👉 Total Remaining Return Amount (Refund): Rs.${formatCurrency(refundAmount)}`,
        'Return Logged (Discount Deducted)'
      );
    } else {
      await showAlert(`Customer product return successfully logged!\nTotal Cash Refund: Rs.${formatCurrency(refundAmount)}`, 'Return Logged');
    }
  };

  const handleVoidInvoice = async (id: string) => {
    const sale = db.sales.find(s => s.id === id);
    if (!sale) return;

    if (await showConfirm(`Voiding Bill #${sale.billNo} is irreversible. Item quantities will be restocked. Continue?`, 'Void Bill')) {
      // Restore stocks
      const updatedProducts = db.products.map(p => {
        const item = sale.items.find(i => i.id === p.id);
        if (item) {
          return { ...p, qty: p.qty + item.qty };
        }
        return p;
      });

      const updatedSales = db.sales.map(s => s.id === id ? { ...s, voided: true } : s);

      await triggerSave({
        ...db,
        products: updatedProducts,
        sales: updatedSales,
      });

      setActiveBillDetailsId(null);
      await showAlert(`Bill #${sale.billNo} voided successfully.`, 'Bill Voided');
    }
  };

  const handleMarkCreditPaid = async (billId: string) => {
    const updatedSales = db.sales.map(s => s.id === billId ? { ...s, creditPaid: true } : s);
    await triggerSave({ ...db, sales: updatedSales });
    await showAlert('Credit marked as fully Paid.', 'Credit Repaid');
  };

  // Backup CSV dataset
  const handleExportCSV = async (period: string, periodSales: Sale[]) => {
    if (periodSales.length === 0) {
      await showAlert('No analytical sales recorded in the period.', 'No Data');
      return;
    }

    let csv = 'BillNo,Date,Time,Customer,Staff,Subtotal,Discount,GST,Total,Profit,Settlement,CreditStatus\n';
    periodSales.forEach(s => {
      csv += `${s.billNo},${s.date},${s.time || ''},"${s.customer || ''}","${s.staffName || ''}",${s.subtotal},${s.discount},${s.gst.toFixed(2)},${s.total},${s.profit.toFixed(2)},${s.paymentMethod},${s.creditPaid ? 'Paid' : 'Unpaid'}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `shoppos_dataset_${period}_${getTodayDateString()}.csv`;
    link.click();
  };

  // Restores / updates backup DB via JSON payload with schema & ID collision validation
  const handleImportBackupJSON = (inputEl: HTMLInputElement) => {
    const file = inputEl.files?.[0];
    if (!file) return;

    const r = new FileReader();
    r.onload = async (e) => {
      try {
        const payload = JSON.parse(e.target?.result as string) as AppDatabase;
        if (payload && Array.isArray(payload.products) && payload.settings) {
          // Sanitize IDs across imported collections to prevent duplicate ID collisions
          const ensureUniqueIds = <T extends { id: string }>(items: T[] | undefined): T[] => {
            if (!Array.isArray(items)) return [];
            const seen = new Set<string>();
            return items.map(item => {
              let id = item.id;
              if (!id || seen.has(id)) {
                id = generateId();
                while (seen.has(id)) id = generateId();
              }
              seen.add(id);
              return { ...item, id };
            });
          };

          const sanitizedPayload: AppDatabase = {
            ...payload,
            products: ensureUniqueIds(payload.products),
            sales: ensureUniqueIds(payload.sales),
            customers: ensureUniqueIds(payload.customers),
            suppliers: ensureUniqueIds(payload.suppliers),
            staff: ensureUniqueIds(payload.staff),
            expenses: ensureUniqueIds(payload.expenses),
            purchases: ensureUniqueIds(payload.purchases),
            estimates: ensureUniqueIds(payload.estimates),
            deliveryChallans: ensureUniqueIds(payload.deliveryChallans),
            creditDebitNotes: ensureUniqueIds(payload.creditDebitNotes),
            branches: ensureUniqueIds(payload.branches),
          };

          await triggerSave(sanitizedPayload, { immediate: true });
          await showAlert('Backup restored successfully from JSON with validated record integrity.', 'Restore Success');
        } else {
          await showAlert('Invalid ShopPOS backup JSON schema format.', 'Restore Error');
        }
      } catch (err) {
        await showAlert('Error reading backup JSON payload.', 'Restore Error');
      }
    };
    r.readAsText(file);
    inputEl.value = '';
  };

  const handleClearResetDB = async () => {
    if (await showConfirm('Permanently clear and wipe all sales, inventory products, ledgers, and cash balances?', 'Factory Clear Database')) {
      const empty = await createDefaultDatabase();
      await triggerSave(empty);
      await showAlert('POS databases successfully formatted.', 'Database Formatted');
      setActiveTab('dashboard');
    }
  };

  const lowStockCount = db.products.filter(p => {
    const threshold = p.lowStockAlert !== null && p.lowStockAlert !== undefined ? p.lowStockAlert : (db.settings.lowStockDefault || 10);
    return p.qty <= threshold;
  }).length;

  const lowStockThreshold = db.settings.lowStockDefault || 10;
  const expiryThreshold = db.settings.nearExpiryDefault || 30;
  const today = new Date();
  const predictiveAlerts = computePredictiveAlerts(db.products, db.sales);
  const alertsCount = db.products.reduce((count, p) => {
    const limit = p.lowStockAlert !== null && p.lowStockAlert !== undefined ? p.lowStockAlert : lowStockThreshold;
    let flagged = false;
    if (p.qty <= limit) {
      count++;
      flagged = true;
    }
    if (p.expiryDate) {
      const days = Math.ceil((new Date(p.expiryDate).getTime() - today.getTime()) / 86400000);
      const alertDays = p.nearExpiryDays !== null && p.nearExpiryDays !== undefined ? p.nearExpiryDays : expiryThreshold;
      if (days <= alertDays) {
        if (!flagged) count++;
      }
    }
    return count;
  }, 0) + predictiveAlerts.filter(pa => {
    const p = db.products.find(prod => prod.id === pa.id);
    if (!p) return false;
    const limit = p.lowStockAlert !== null && p.lowStockAlert !== undefined ? p.lowStockAlert : lowStockThreshold;
    return p.qty > limit;
  }).length;

  return (
    <LocalizationProvider activeLanguage={db?.settings?.language}>
      <div className="bg-slate-50 min-h-screen text-slate-800 pb-24 font-sans select-none antialiased dark:bg-slate-950 dark:text-slate-100">
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scanline {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .animate-scanline {
          position: absolute;
          animation: scanline 2.2s ease-in-out infinite;
          z-index: 50 !important;
        }

        /* ALWAYS Guarantee Option Dropdowns have robust text/background visibility across all OS and browsers */
        select option {
          background-color: #ffffff !important;
          color: #0f172a !important;
        }
        select option:hover, select option:focus, select option:active {
          background-color: #f1f5f9 !important;
          color: #0f172a !important;
        }

        /* Fix custom non-standard prior utility class numbers to ensure proper light fallback borders and text colors */
        .border-slate-250, .border-slate-205 {
          border-color: #cbd5e1 !important;
        }
        .border-slate-155 {
          border-color: #e2e8f0 !important;
        }
        .text-slate-305 {
          color: #64748b !important;
        }
        .text-slate-655 {
          color: #475569 !important;
        }
        .text-slate-705 {
          color: #334155 !important;
        }
        .text-slate-755, .text-slate-805 {
          color: #1e293b !important;
        }
        .text-emerald-555 {
          color: #10b981 !important;
        }
        .text-emerald-450 {
          color: #10b981 !important;
        }
        .text-emerald-650 {
          color: #047857 !important;
        }
        .bg-slate-850 {
          background-color: #1e293b !important;
        }
        .border-red-150 {
          border-color: #fee2e2 !important;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in {
          animation: fadeIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards !important;
        }
        .text-indigo-755, .text-indigo-705 {
          color: #4f46e5 !important;
        }
        .bg-indigo-650 {
          background-color: #4f46e5 !important;
        }
        .bg-slate-255 {
          background-color: #cbd5e1 !important;
        }
        .bg-slate-150 {
          background-color: #f1f5f9 !important;
        }

        @media screen {
          ${isDarkMode ? `
            :root {
              color-scheme: dark !important;
            }
            body, html {
              background-color: #020617 !important;
              color: #f8fafc !important;
            }
            /* Override all white paper bg cards with gorgeous dark navy cards, excluding keep-white elements */
            .bg-white:not(.keep-white) {
              background-color: #0f172a !important;
              color: #f8fafc !important;
              border-color: #1e293b !important;
            }
            .bg-slate-50, .bg-slate-100 {
              background-color: #030712 !important;
              color: #f1f5f9 !important;
            }
            .text-slate-800, .text-slate-900, .text-slate-850, .text-slate-750, .text-slate-705, .text-slate-700, .text-slate-950 {
              color: #f1f5f9 !important;
            }
            .text-slate-500, .text-slate-655, .text-slate-650, .text-slate-600, .text-slate-450 {
              color: #94a3b8 !important;
            }
            .border-slate-200, .border-slate-150, .border-slate-100 {
              border-color: #1e293b !important;
            }
            /* Custom overrides for active states in main container to match dark theme beautifully */
            input, select, textarea {
              background-color: #0f172a !important;
              color: #ffffff !important;
              border-color: #334155 !important;
            }
            select option {
              background-color: #0f172a !important;
              color: #ffffff !important;
            }
            select option:hover, select option:focus, select option:active {
              background-color: #1e293b !important;
              color: #ffffff !important;
            }
            /* Standard alert dialogs background colors */
            .bg-rose-50, .bg-rose-100, .bg-rose-955, .bg-rose-900, .text-rose-900, .text-rose-500 {
              background-color: #270e13 !important;
              color: #fecdd3 !important;
              border-color: #4c0519 !important;
            }
            .bg-emerald-50, .bg-emerald-100, .bg-emerald-555, .text-emerald-555 {
              background-color: #022c22 !important;
              color: #a7f3d0 !important;
              border-color: #064e3b !important;
            }
            .bg-amber-50, .bg-amber-100, .bg-amber-805, .text-amber-805, .bg-indigo-150 {
              background-color: #2e1a05 !important;
              color: #fde68a !important;
              border-color: #78350f !important;
            }
            /* Specific buttons styling */
            .bg-indigo-600 {
              background-color: #6366f1 !important;
            }
            .bg-slate-900 {
              background-color: #0f172a !important;
              color: #ffffff !important;
              border-color: #1e293b !important;
            }
            .border-slate-250, .border-slate-205, .border-slate-155 {
              border-color: #1e293b !important;
            }
            .text-slate-305, .text-slate-655, .text-slate-705 {
              color: #94a3b8 !important;
            }
            .text-slate-755, .text-slate-805 {
              color: #f1f5f9 !important;
            }
            .bg-slate-255, .bg-slate-150 {
              background-color: #1e293b !important;
            }
          ` : `
            :root {
              color-scheme: light !important;
            }
            body, html {
              background: linear-gradient(135deg, #f0f4ff 0%, #faf5ff 35%, #fdf2f8 70%, #fef8e6 100%) !important;
              color: #1e1b4b !important;
              background-attachment: fixed !important;
            }
            /* Allow body's beautiful background gradient to show through */
            html:not(.dark) div.min-h-screen.bg-slate-50 {
              background-color: transparent !important;
            }
            /* Make white cards have gorgeous colorful borders, shadows and light pastel backing gradients */
            .bg-white:not(.keep-white) {
              background-color: #ffffff !important;
              border-color: rgba(99, 102, 241, 0.16) !important;
              box-shadow: 0 10px 25px -5px rgba(99, 102, 241, 0.05), 0 8px 10px -6px rgba(99, 102, 241, 0.05), 0 0 1px rgba(99, 102, 241, 0.1) !important;
            }
            
            /* Give all card headers or standard sections some soft, premium colors */
            .bg-slate-50:not(.min-h-screen) {
              background-color: #f5f3ff !important; /* soft lavender-rose tint */
              border-color: rgba(139, 92, 246, 0.15) !important;
            }
            
            .bg-slate-100 {
              background-color: #eef2ff !important; /* soft blue-lavender tint */
              border-color: rgba(99, 102, 241, 0.15) !important;
            }

            .bg-slate-150, .bg-slate-200 {
              background-color: #e0e7ff !important;
              border-color: #c7d2fe !important;
            }

            /* Make text colors incredibly rich and clear with solid slate/charcoal tones for perfect readability */
            html:not(.dark) main .text-slate-900, 
            html:not(.dark) main .text-slate-850, 
            html:not(.dark) main .text-slate-800, 
            html:not(.dark) main .text-slate-950, 
            html:not(.dark) main h1, 
            html:not(.dark) main h2, 
            html:not(.dark) main h3, 
            html:not(.dark) main h4, 
            html:not(.dark) main h5,
            html:not(.dark) .fixed .text-slate-900, 
            html:not(.dark) .fixed .text-slate-850, 
            html:not(.dark) .fixed .text-slate-800, 
            html:not(.dark) .fixed .text-slate-950, 
            html:not(.dark) .fixed h1, 
            html:not(.dark) .fixed h2, 
            html:not(.dark) .fixed h3, 
            html:not(.dark) .fixed h4, 
            html:not(.dark) .fixed h5 {
              color: #0f172a !important; /* deep slate-900 dark gray */
            }

            html:not(.dark) main .text-slate-600, 
            html:not(.dark) main .text-slate-650, 
            html:not(.dark) main .text-slate-700, 
            html:not(.dark) main .text-slate-755,
            html:not(.dark) .fixed .text-slate-600, 
            html:not(.dark) .fixed .text-slate-650, 
            html:not(.dark) .fixed .text-slate-700, 
            html:not(.dark) .fixed .text-slate-755 {
              color: #334155 !important; /* solid slate-700 gray */
            }

            html:not(.dark) main .text-slate-500, 
            html:not(.dark) main .text-slate-450,
            html:not(.dark) .fixed .text-slate-500, 
            html:not(.dark) .fixed .text-slate-450 {
              color: #475569 !important; /* clear slate-600 gray */
            }

            html:not(.dark) main .text-slate-400,
            html:not(.dark) .fixed .text-slate-400 {
              color: #64748b !important; /* clear slate-500 gray */
            }

            /* Ensure all inputs, select boxes, textareas, and options inside modals or main display have strong readability */
            html:not(.dark) input,
            html:not(.dark) select,
            html:not(.dark) textarea {
              background-color: #ffffff !important;
              color: #0f172a !important;
              border-color: #cbd5e1 !important;
            }
            
            html:not(.dark) select option {
              background-color: #ffffff !important;
              color: #0f172a !important;
            }

            html:not(.dark) input::placeholder,
            html:not(.dark) textarea::placeholder {
              color: #94a3b8 !important; /* readable slate-400 placeholder */
              opacity: 1 !important;
            }

            /* Main navigation sidebar (aside.bg-slate-900) - Let's make it a stunning, rich royal deep purple-indigo gradient! */
            aside.bg-slate-900 {
              background: linear-gradient(180deg, #1e1b4b 0%, #2e1065 50%, #4c1d95 100%) !important;
              border-right: 1px solid rgba(139, 92, 246, 0.2) !important;
              box-shadow: 4px 0 25px rgba(30, 27, 75, 0.15) !important;
            }

            /* Header on mobile */
            header.bg-slate-900 {
              background: linear-gradient(135deg, #1e1b4b 0%, #2e1065 100%) !important;
              border-bottom: 1px solid rgba(139, 92, 246, 0.2) !important;
              box-shadow: 0 4px 20px rgba(30, 27, 75, 0.15) !important;
            }

            /* Operator Active Profile Area inside sidebar */
            .bg-slate-950\/20 {
              background-color: rgba(255, 255, 255, 0.06) !important;
              border-color: rgba(255, 255, 255, 0.1) !important;
            }

            /* Active Navigation buttons inside sidebar */
            aside.bg-slate-900 .bg-slate-800\/80 {
              background: linear-gradient(135deg, #059669 0%, #10b981 100%) !important; /* gorgeous emerald gradient */
              color: #ffffff !important;
              border-left: 4px solid #f43f5e !important; /* hot rose accent strip */
              box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3) !important;
            }

            /* Inactive buttons in sidebar hover */
            aside.bg-slate-900 button:hover:not(.bg-slate-800\/80) {
              background-color: rgba(255, 255, 255, 0.12) !important;
              color: #ffffff !important;
            }

            /* Sub-tab navigation in SettingsView specifically - scoped by unique container classes */
            html:not(.dark) .bg-slate-100.border-slate-200\/50 button.bg-white {
              background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%) !important;
              color: #ffffff !important;
              box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3) !important;
              border: 1px solid #4f46e5 !important;
            }

            /* Active state of tab buttons when white background is set */
            html:not(.dark) .bg-slate-100.border-slate-200\/50 button.bg-white * {
              color: #ffffff !important;
            }

            /* All stock filters buttons (like in InventoryView) */
            .bg-slate-900.text-white {
              background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%) !important;
              box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35) !important;
              color: #ffffff !important;
            }

            .bg-amber-600.text-white {
              background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%) !important;
              box-shadow: 0 4px 14px rgba(217, 119, 6, 0.35) !important;
              color: #ffffff !important;
            }

            .bg-rose-600.text-white {
              background: linear-gradient(135deg, #f43f5e 0%, #e11d48 100%) !important;
              box-shadow: 0 4px 14px rgba(225, 29, 72, 0.35) !important;
              color: #ffffff !important;
            }

            .bg-red-700.text-white {
              background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%) !important;
              box-shadow: 0 4px 14px rgba(185, 28, 28, 0.35) !important;
              color: #ffffff !important;
            }

            /* Custom inputs focus colors */
            input:focus, select:focus, textarea:focus {
              border-color: #8b5cf6 !important;
              box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.2) !important;
            }

            /* Stat cards in Dashboard & elsewhere */
            .grid .bg-white:has(.text-emerald-500) {
              background: linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%) !important;
              border-color: rgba(16, 185, 129, 0.2) !important;
            }
            
            .grid .bg-white:has(.text-indigo-500) {
              background: linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%) !important;
              border-color: rgba(99, 102, 241, 0.2) !important;
            }

            .grid .bg-white:has(.text-sky-500) {
              background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%) !important;
              border-color: rgba(14, 165, 233, 0.2) !important;
            }

            .grid .bg-white:has(.text-purple-500) {
              background: linear-gradient(135deg, #ffffff 0%, #faf5ff 100%) !important;
              border-color: rgba(168, 85, 247, 0.2) !important;
            }

            /* Table row stripes & hover */
            tr:nth-child(even) {
              background-color: rgba(245, 243, 255, 0.5) !important; /* subtle lavender stripe */
            }

            tr:hover {
              background-color: rgba(238, 242, 255, 0.8) !important; /* beautiful indigo hover highlight */
            }

            /* Table header area */
            th {
              background-color: #ede9fe !important; /* light purple */
              color: #4c1d95 !important; /* dark violet */
              font-weight: 800 !important;
            }

            /* Custom styling of category list items in BillingView */
            .bg-indigo-50\/40 {
              background-color: rgba(238, 242, 255, 0.7) !important;
              border-color: rgba(99, 102, 241, 0.2) !important;
            }

            /* Progress bars & badges */
            .bg-indigo-50 {
              background-color: #eef2ff !important;
            }
          `}
        }
      ` }} />
      {/* 🔐 FIRST LOGIN SETUP PANE FOR NEW RUNS */}
      {db.auth.firstLogin && isAuthenticated === false && (
        <FirstLoginSetupForm onSave={handleFirstLoginSave} />
      )}

      {/* 🔐 LOGIN FORM UNLOCK SYSTEM SCREEN */}
      {!db.auth.firstLogin && !isAuthenticated && (
        <LoginScreen 
          userId={db.auth.userId}
          loginUserId={loginUserId}
          setLoginUserId={setLoginUserId}
          loginPw={loginPw}
          setLoginPw={setLoginPw}
          onSubmit={handleLoginSubmit}
          error={loginError}
          lockoutMsg={loginLockoutMsg}
          fpReg={db.auth.fpId}
          sessionNotice={sessionLogoutReason}
          onClearNotice={() => setSessionLogoutReason(null)}
          onBiometricLogin={async () => {
            try {
              if (!db.auth.fpId) {
                return;
              }

              // Handle simulated biometric token or virtual mode
              if (db.auth.fpId === 'simulated_biometric' || !window.PublicKeyCredential) {
                setShowBiometricScanOverlay(true);
                return;
              }
              
              try {
                const chall = crypto.getRandomValues(new Uint8Array(32));
                const raw = Uint8Array.from(atob(db.auth.fpId), c => c.charCodeAt(0));
                
                const authCr = await navigator.credentials.get({
                  publicKey: {
                    challenge: chall,
                    rpId: db.auth.rpId || window.location.hostname || 'localhost',
                    allowCredentials: [{ type: 'public-key', id: raw, transports: ['internal'] }],
                    userVerification: 'required',
                    timeout: 60000,
                  }
                });

                if (authCr) {
                  localStorage.setItem('sp_session', '1');
                  setIsAuthenticated(true);
                  setLoginError('');
                }
              } catch (innerErr) {
                console.warn('Physical biometric authentication error, falling back to simulated overlay:', innerErr);
                setShowBiometricScanOverlay(true);
              }
            } catch (err: any) {
              showAlert('Biometric credentials verification failed.', 'Error');
            }
          }}
        />
      )}

      {showBiometricScanOverlay && (
        <div className="fixed inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-[100000] p-4 text-white">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="space-y-1">
              <h3 className="text-base font-black tracking-wide text-white uppercase select-none">
                Virtual Touch Bypass
              </h3>
              <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-amber-950/50 text-amber-400 border border-amber-800/50 select-none">
                ⚠️ Non-Secure Demo Mode
              </span>
            </div>
            
            <div className="relative w-24 h-24 mx-auto bg-slate-950 rounded-full border-4 border-amber-500/20 flex items-center justify-center overflow-hidden" style={{ position: 'relative', backgroundColor: '#020617' }}>
              {/* Glowing scan laser line */}
              <div className="absolute left-0 right-0 h-1 bg-amber-500 animate-scanline shadow-[0_0_10px_#f59e0b]" style={{ zIndex: 50 }} />
              <Fingerprint className="w-14 h-14 text-amber-400 animate-pulse stroke-[1.5]" />
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-200 select-none">Simulating Quick Unlock Bypass</p>
              <p className="text-[10px] text-slate-400 leading-relaxed select-none">
                Hardware biometrics (WebAuthn) is not available in WebView. Logging in without verification...
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowBiometricScanOverlay(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
            >
              Cancel Scan
            </button>
          </div>
        </div>
      )}

      {/* 📱 FULL POS CONTAINER SHELL */}
      {isAuthenticated && (
        <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 font-sans antialiased text-slate-800 dark:text-slate-100">
          
          {/* DESKTOP SIDEBAR NAVIGATION BRANDING */}
          <aside className="hidden md:flex flex-col w-64 bg-slate-950 text-slate-200 fixed inset-y-0 left-0 z-40 select-none border-r border-slate-900 shadow-[2px_0_12px_rgba(0,0,0,0.15)] overflow-y-auto">
            {/* Branding Header Area */}
            <div className="p-6 border-b border-slate-900/75 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg font-extrabold text-indigo-400 tracking-tight flex items-center gap-2.5">
                  <AppLogo size="sm" rounded="rounded-xl" />
                  <span className="truncate max-w-[155px] font-black">{db.settings.shopName || 'ShopPOS'}</span>
                </span>
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-500 font-extrabold uppercase tracking-widest leading-none mt-1 pl-1">
                BILLING & INVENTORY CORE
              </p>
            </div>

            {/* Operator Active Profile Area */}
            <div className="px-6 py-5 border-b border-slate-900/75 bg-slate-900/10">
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2.5 pl-1">
                Active Staff Profile
              </div>
              {db.staff.find(s => s.id === activeStaffId) ? (
                <button
                  type="button"
                  onClick={() => setIsStaffOpen(true)}
                  className="w-full text-left font-black uppercase text-xs text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer border border-indigo-500/15"
                  title="Switch cashier session / Clock out"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="truncate font-bold tracking-wide">{db.staff.find(s => s.id === activeStaffId)?.name}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsStaffOpen(true)}
                  className="w-full text-left font-bold uppercase text-[9px] text-slate-400 hover:text-white px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 transition-all flex items-center gap-2 cursor-pointer border border-dashed border-slate-800 animate-pulse"
                  title="Clock in cashier session"
                >
                  👤 Clock In Cashier
                </button>
              )}
              {/* Localized Date Below Cashier Profile */}
              <div className="mt-3.5 flex items-center gap-2 text-[10px] text-slate-500 font-bold select-none border-t border-slate-900/50 pt-3">
                <Calendar className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                <span className="truncate uppercase tracking-wider font-extrabold">{formatHeaderDate(new Date())}</span>
              </div>
            </div>

            {/* Navigation Tabs Links */}
            <nav className="flex-1 px-4 py-6 space-y-2">
              {(['dashboard', 'billing', 'inventory', 'customers', 'documents', 'reports', 'settings'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all cursor-pointer text-xs font-bold uppercase tracking-wider border ${
                    activeTab === tab 
                      ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20 font-black shadow-inner' 
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50 border-transparent'
                  }`}
                >
                  {tab === 'dashboard' && <Home className="w-4 h-4 flex-shrink-0" />}
                  {tab === 'billing' && (
                    <div className="relative flex items-center gap-3 w-full">
                      <ShoppingCart className="w-4 h-4 flex-shrink-0" />
                      {cart.length > 0 && (
                        <span className="absolute right-0 w-4 h-4 bg-rose-500 text-[8px] font-black justify-center items-center rounded-full text-white flex select-none">
                          {cart.length}
                        </span>
                      )}
                    </div>
                  )}
                  {tab === 'inventory' && (
                    <div className="relative flex items-center gap-3 w-full">
                      <Package className="w-4 h-4 flex-shrink-0" />
                      {lowStockCount > 0 && (
                        <span className="absolute right-0 px-1.5 py-0.5 bg-amber-500 text-slate-950 text-[8px] font-black justify-center items-center rounded-full flex select-none animate-pulse">
                          {lowStockCount} LOW
                        </span>
                      )}
                    </div>
                  )}
                  {tab === 'customers' && <Users className="w-4 h-4 flex-shrink-0" />}
                  {tab === 'documents' && <FileText className="w-4 h-4 flex-shrink-0" />}
                  {tab === 'reports' && <BarChart3 className="w-4 h-4 flex-shrink-0" />}
                  {tab === 'settings' && <SettingsIcon className="w-4 h-4 flex-shrink-0" />}
                  
                  <span className="truncate">{translate(tab, db?.settings?.language)}</span>
                </button>
              ))}
            </nav>

            {/* Sidebar Footer Operations */}
            <div className="p-4 border-t border-slate-900/75 bg-slate-950">
              <div className="flex items-center justify-around bg-slate-900/40 p-2 rounded-xl border border-slate-900/50">
                {/* Notification Button */}
                <button
                  type="button"
                  onClick={() => setIsAlertsOpen(true)}
                  className="relative w-8 h-8 flex items-center justify-center bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-lg transition-all cursor-pointer"
                  title="Alerts & Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {alertsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-[8px] font-black text-white rounded-full flex items-center justify-center animate-bounce">
                      {alertsCount}
                    </span>
                  )}
                </button>

                {/* System Logs Button */}
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(true)}
                  className="w-8 h-8 flex items-center justify-center bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-lg transition-all cursor-pointer"
                  title="System Logs"
                >
                  <History className="w-4 h-4" />
                </button>

                {/* Calculator Button */}
                <button
                  type="button"
                  onClick={() => setIsCalculatorOpen(true)}
                  className="w-8 h-8 flex items-center justify-center bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 rounded-lg transition-all cursor-pointer"
                  title="Calculator"
                >
                  <Calculator className="w-4 h-4" />
                </button>

                {/* Logout Button */}
                {(activeTab === 'settings' || activeTab === 'dashboard') && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-8 h-8 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-350 rounded-lg transition-all cursor-pointer animate-fade-in"
                    title="Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </aside>

          {/* Persistent global top status bar (MOBILE ONLY wide hide) */}
          <header className="md:hidden fixed top-0 left-0 right-0 max-w-md mx-auto bg-slate-950/95 backdrop-blur-md border-b border-slate-900 text-slate-200 flex justify-between items-center px-4 py-2.5 z-40 select-none rounded-b-2xl shadow-lg">
            <div className="flex items-center min-w-0">
              {activeTab !== 'dashboard' && (
                <button
                  type="button"
                  onClick={() => window.history.back()}
                  className="mr-2 w-7 h-7 flex items-center justify-center bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-lg text-slate-300 active:scale-95 transition-all cursor-pointer shrink-0"
                  title="Go Back"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <AppLogo size="xs" rounded="rounded-md" />
                  <span className="text-[11px] font-black uppercase tracking-wider text-indigo-400 truncate">
                    {db.settings.shopName || 'ShopPOS'}
                  </span>
                {db.staff.find(s => s.id === activeStaffId) ? (
                  <button
                    type="button"
                    onClick={() => setIsStaffOpen(true)}
                    className="text-[9px] font-black uppercase text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md hover:bg-indigo-500/20 transition-colors flex items-center gap-1 cursor-pointer truncate border border-indigo-500/15"
                    title="Switch cashier session / Clock out"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                    <span className="truncate">{db.staff.find(s => s.id === activeStaffId)?.name}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsStaffOpen(true)}
                    className="text-[9px] font-bold uppercase text-slate-400 hover:text-white px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-850 transition-colors flex items-center gap-1 cursor-pointer animate-pulse truncate border border-dashed border-slate-800"
                    title="Clock in cashier session"
                  >
                    👤 Cashier
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 text-[8px] text-slate-500 font-extrabold uppercase mt-0.5 select-none">
                <Calendar className="w-2.5 h-2.5 text-indigo-400 flex-shrink-0" />
                <span>{formatHeaderDate(new Date())}</span>
              </div>
            </div>
            </div>
            <div className="flex items-center gap-1.5">
              {/* Notification button */}
              <button
                type="button"
                onClick={() => setIsAlertsOpen(true)}
                className="relative w-7 h-7 flex items-center justify-center bg-slate-900 hover:bg-slate-850 border border-slate-900 rounded-lg transition-all text-slate-450 hover:text-slate-200 cursor-pointer active:scale-95"
                title="Alerts & Notifications"
              >
                <Bell className="w-3.5 h-3.5" />
                {alertsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-[8px] font-black text-white rounded-full flex items-center justify-center">
                    {alertsCount}
                  </span>
                )}
              </button>

              {/* System logs button */}
              <button
                type="button"
                onClick={() => setIsHistoryOpen(true)}
                className="w-7 h-7 flex items-center justify-center bg-slate-900 hover:bg-slate-850 border border-slate-900 rounded-lg transition-all text-slate-450 hover:text-slate-200 cursor-pointer active:scale-95"
                title="System Logs"
              >
                <History className="w-3.5 h-3.5" />
              </button>

              {/* Calculator button */}
              <button
                type="button"
                onClick={() => setIsCalculatorOpen(true)}
                className="w-7 h-7 flex items-center justify-center bg-slate-900 hover:bg-slate-850 border border-slate-900 rounded-lg transition-all text-slate-450 hover:text-slate-200 cursor-pointer active:scale-95"
                title="Calculator"
              >
                <Calculator className="w-3.5 h-3.5" />
              </button>

              {/* Logout button */}
              {(activeTab === 'settings' || activeTab === 'dashboard') && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-7 h-7 flex items-center justify-center bg-rose-500/10 hover:bg-rose-500/20 rounded-lg text-rose-400 hover:text-rose-300 transition-all cursor-pointer active:scale-95 animate-fade-in"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </header>

          {/* Main Stage tabs renders - responsive width */}
          <main className="flex-1 w-full p-4 pt-16 md:pt-6 md:pl-72 md:pr-6 max-w-7xl mx-auto transition-all min-h-screen">
            {activeTab === 'dashboard' && (
              <DashboardView 
                db={db}
                onNavigate={setActiveTab}
                onOpenAlerts={() => setIsAlertsOpen(true)}
                onOpenHistory={() => setIsHistoryOpen(true)}
                onOpenBillDetails={(id) => {
                  setActiveBillDetailsId(id);
                }}
                onLogout={handleLogout}
              />
            )}

            {activeTab === 'billing' && (
              <BillingView 
                products={db.products}
                cart={cart}
                onAddToCart={handleAddToCart}
                onRemoveFromCart={handleRemoveFromCart}
                onChangeCartQty={handleChangeCartQty}
                onClearCart={on_billing_clear_cart}
                onOpenScanner={() => {
                  setScannerMode('bill');
                  setIsScannerOpen(true);
                }}
                onCheckout={(info) => {
                  setCheckoutCustInfo(info);
                  setIsCheckoutOpen(true);
                }}
                suspendedCarts={suspendedCarts}
                onSuspendCart={handleSuspendCart}
                onResumeCart={handleResumeCart}
                onDeleteSuspendedCart={handleDeleteSuspendedCart}
                showConfirm={showConfirm}
                showPrompt={showPrompt}
                onPrintLastBill={db.sales.length > 0 ? () => {
                  const lastBill = db.sales[db.sales.length - 1];
                  setActiveReceiptSale(lastBill);
                  setIsReceiptOpen(true);
                } : undefined}
                settings={db.settings}
              />
            )}

            {activeTab === 'inventory' && (
              <InventoryView 
                products={db.products}
                suppliers={db.suppliers}
                onOpenProductModal={(id) => {
                  setActiveProductId(id);
                  setIsProductModalOpen(true);
                }}
                onOpenScanner={() => {
                  setScannerMode('restock');
                  setIsScannerOpen(true);
                }}
                settings={db.settings}
                onImportProducts={handleImportProducts}
                onBulkUpdateProducts={async (updatedProducts) => {
                  await triggerSave({ ...db, products: updatedProducts });
                }}
              />
            )}

            {activeTab === 'customers' && (
              <CustomersView 
                customers={db.customers}
                sales={db.sales}
                onOpenCustomerModal={() => {
                  setActiveCustomerId(null);
                  setIsCustomerModalOpen(true);
                }}
                onOpenCustomerDetails={(id) => {
                  setActiveCustomerId(id);
                  setIsCustomerModalOpen(true);
                }}
              />
            )}

            {activeTab === 'documents' && (
              <DocumentsView 
                customers={db.customers}
                products={db.products}
                settings={db.settings}
                onSetCart={setCart}
                onChangeTab={setActiveTab}
                onSaveSettings={async (newSettings) => {
                  await triggerSave({ ...db, settings: newSettings });
                }}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView 
                db={db}
                onOpenDayDetails={setDayDetailsDate}
                onExportCSV={handleExportCSV}
                onOpenReturnModal={setReturnBillId}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView 
                db={db}
                onSaveShopInfo={handleSaveShopInfo}
                onChangeCredentials={handleChangeCredentials}
                onRegisterBiometric={handleRegisterBiometric}
                onRemoveBiometric={async () => {
                  const updated = {
                    ...db,
                    auth: { ...db.auth, fpId: null, rpId: undefined }
                  };
                  await triggerSave(updated);
                  await showAlert('Biometric login option removed.', 'Biometrics');
                }}
                onOpenSuppliers={() => setIsSuppliersOpen(true)}
                onOpenStaff={() => setIsStaffOpen(true)}
                onOpenLabels={() => setIsLabelsOpen(true)}
                onOpenExpenses={() => setIsExpensesOpen(true)}
                onExportData={() => {
                  const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
                  const link = document.createElement('a');
                  link.href = URL.createObjectURL(blob);
                  link.download = `shoppos_backup_${getTodayDateString()}.json`;
                  link.click();
                  
                  const nowStr = new Date().toISOString();
                  localStorage.setItem('shoppos_last_backup', nowStr);
                  setLastBackupTime(nowStr);
                  showAlert('Safety database backup successfully exported!', 'Backup Success');
                }}
                onImportData={handleImportBackupJSON}
                onClearAllData={handleClearResetDB}
                storageInfo={storageStats}
                lastBackupTime={lastBackupTime}
                isDarkMode={isDarkMode}
                onToggleDarkMode={setIsDarkMode}
                onTestDayChangeWarning={handleTestDayChangeWarning}
              />
            )}
          </main>

          {/* Day / Date Change Midnight Auto-Logout Notification Banner */}
          {isAuthenticated && isDayChangeWarningOpen && dayChangeCountdownSecs !== null && (
            <DayChangeLogoutBanner 
              countdownSeconds={dayChangeCountdownSecs}
              warningMinutes={db?.settings?.dayChangeWarningMinutes ?? 5}
              cartItemCount={cart.length}
              onSnooze={handleSnoozeDayChangeLogout}
              onLogoutNow={performDayChangeLogout}
              onSuspendCart={cart.length > 0 ? () => handleSuspendCart('Auto-saved before midnight rollover') : undefined}
              isMinimized={isDayChangeBannerMinimized}
              setIsMinimized={setIsDayChangeBannerMinimized}
              isSimulatedTest={isSimulatedWarningTest}
              onCloseTest={() => {
                if (testCountdownTimerRef.current) clearInterval(testCountdownTimerRef.current);
                setIsDayChangeWarningOpen(false);
                setIsSimulatedWarningTest(false);
                setDayChangeCountdownSecs(null);
              }}
            />
          )}

          {/* Toast Notification alert feedback block */}
          <div id="toast" className="fixed bottom-[92px] md:bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-white rounded-full px-5 py-2.5 text-xs font-bold transition-opacity duration-300 pointer-events-none opacity-0 select-none z-[8000]" />

          {/* ════════════════════════════════════════
              TABS BOTTOM NAVIGATION DOCK (MOBILE ONLY wide hide)
              ════════════════════════════════════════ */}
          <nav className="md:hidden fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-950/95 backdrop-blur-md border-t border-slate-900 flex justify-between items-center px-1 py-1 z-40 shadow-2xl pb-5 rounded-t-3xl flex-nowrap overflow-hidden">
            {(['dashboard', 'billing', 'inventory', 'customers', 'documents', 'reports', 'settings'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex flex-col items-center gap-1 py-1.5 px-1 xs:px-2 rounded-2xl transition-all cursor-pointer relative min-w-0 flex-1 border ${
                  activeTab === tab ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/15' : 'text-slate-500 hover:text-slate-300 border-transparent'
                }`}
              >
                {tab === 'dashboard' && <Home className="w-4 h-4" />}
                {tab === 'billing' && (
                  <>
                    <ShoppingCart className="w-4 h-4" />
                    {cart.length > 0 && (
                      <span className="absolute -top-1 right-1 w-3.5 h-3.5 bg-rose-500 text-[8px] font-black justify-center items-center rounded-full text-white flex select-none">
                        {cart.length}
                      </span>
                    )}
                  </>
                )}
                {tab === 'inventory' && (
                  <>
                    <Package className="w-4 h-4" />
                    {lowStockCount > 0 && (
                      <span className="absolute -top-1 right-1 h-3.5 px-1 bg-amber-500 text-slate-950 text-[8px] font-black flex items-center justify-center rounded-full select-none animate-pulse">
                        {lowStockCount}
                      </span>
                    )}
                  </>
                )}
                {tab === 'customers' && <Users className="w-4 h-4" />}
                {tab === 'documents' && <FileText className="w-4 h-4" />}
                {tab === 'reports' && <BarChart3 className="w-4 h-4" />}
                {tab === 'settings' && <SettingsIcon className="w-4 h-4" />}
                
                <span className="text-[8px] xs:text-[9px] font-black uppercase tracking-tight scale-95 truncate max-w-full">{translate(tab, db?.settings?.language)}</span>
              </button>
            ))}
          </nav>

          {/* ════════════════════════════════════════
              AUXILIARY MODAL DIALOGS RENDERS
              ════════════════════════════════════════ */}
          
          {/* PRODUCT CRUD DIALOG */}
          {isProductModalOpen && (
            <ProductFormModal 
              product={activeProductId ? db.products.find(p => p.id === activeProductId) || null : null}
              suppliers={db.suppliers}
              onClose={() => {
                setIsProductModalOpen(false);
                setActiveProductId(null);
                setScannedBarcodeProduct('');
              }}
              onSave={handleSaveProduct}
              onDelete={handleDeleteProduct}
              onOpenScanner={(f) => {
                setScannerField(f);
                setScannerMode('prod');
                setIsScannerOpen(true);
              }}
              scannedBarcode={scannedBarcodeProduct}
              onConsumeScannedBarcode={() => setScannedBarcodeProduct('')}
              defaultSettings={db.settings}
              products={db.products}
            />
          )}

          {/* CHECKOUT MODAL Form details */}
          {isCheckoutOpen && (
            <CheckoutModal 
              cart={cart}
              customers={db.customers}
              staff={db.staff}
              settings={db.settings}
              onClose={() => setIsCheckoutOpen(false)}
              onComplete={handleCompleteCheckout}
              onShowUPIQR={async (amt) => {
                if (!db.settings.upi) {
                  await showAlert('⚠️ UPI Merchant ID is empty. Please set your UPI ID in Settings to generate QR codes.', 'UPI ID Missing');
                  return;
                }
                setQrUpiAmount(amt);
                setIsUpiQrOpen(true);
              }}
              sales={db.sales}
              activeStaffId={activeStaffId}
              showAlert={showAlert}
            />
          )}

          {/* UPI PAYMENT QR STICKER DISPLAY */}
          {isUpiQrOpen && qrUpiAmount && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[8000] flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl w-full max-w-xs p-5 text-center space-y-3.5 relative">
                <button
                  type="button"
                  onClick={() => setIsUpiQrOpen(false)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-1"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="text-sm font-black text-slate-800">Dynamic Payment QR</div>
                <div className="w-48 h-48 mx-auto border-2 border-indigo-100 rounded-xl overflow-hidden shadow-xs flex items-center justify-center bg-indigo-50/20">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                      `upi://pay?pa=${db.settings.upi}&pn=${encodeURIComponent(db.settings.shopName || 'Shop')}&am=${qrUpiAmount.toFixed(2)}&cu=INR`
                    )}`} 
                    alt="Scan UPI QR" 
                  />
                </div>
                <div className="text-lg font-black text-emerald-600">Rs.{formatCurrency(qrUpiAmount)}</div>
                <p className="text-[10px] text-slate-450 font-bold tracking-wider leading-relaxed">
                  Scan utilizing any banking apps (BHIM, PhonePe, GPay, Paytm) to finalize transaction.
                </p>
              </div>
            </div>
          )}

          {/* PRINT SHEET LABELS MODAL DISPLAY */}
          {isLabelsOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1000] flex items-end sm:items-center justify-center p-3 animate-fade-in">
              <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-sm max-h-[85vh] overflow-y-auto">
                <LabelGenerator 
                  products={db.products} 
                  shopName={db.settings.shopName}
                  fssai={db.settings.fssai}
                  onClose={() => setIsLabelsOpen(false)}
                  onQuickUpdateBarcode={async (productId, newBarcode) => {
                    const list = db.products.map(p => p.id === productId ? { ...p, barcode: newBarcode } : p);
                    await triggerSave({ ...db, products: list });
                  }}
                />
              </div>
            </div>
          )}

          {/* SUPPLIERS MODAL DISPLAY */}
          {isSuppliersOpen && (
            <SuppliersViewModal 
              suppliers={db.suppliers}
              products={db.products}
              purchases={db.purchases}
              onClose={() => setIsSuppliersOpen(false)}
              onSaveSupplier={handleSaveSupplier}
              onDeleteSupplier={handleDeleteSupplier}
              onSavePurchaseOrder={handleSavePurchaseOrder}
            />
          )}

          {/* STAFF ROSTER MODAL DISPLAY */}
          {isStaffOpen && (
            <StaffRosterViewModal 
              staff={db.staff}
              sales={db.sales}
              settings={db.settings}
              activityLogs={db.staffActivityLogs || []}
              onClose={() => setIsStaffOpen(false)}
              onSaveStaff={handleSaveStaff}
              onDeleteStaff={handleDeleteStaff} activeStaffId={activeStaffId} onSelectActiveStaff={handleSelectActiveStaff}
              onToggleRequireStaff={(checked) => triggerSave({ ...db, settings: { ...db.settings, requireStaffPin: checked } })}
            />
          )}

          {/* EXPENSES TRACKER MODAL DISPLAY */}
          {isExpensesOpen && (
            <ExpensesModal 
              expenses={db.expenses}
              onClose={() => setIsExpensesOpen(false)}
              onSaveExpense={handleSaveExpense}
              onDeleteExpense={handleDeleteExpense}
            />
          )}

          {/* CUSTOMER FORM MODAL DISPLAY */}
          {isCustomerModalOpen && (
            <CustomerFormModal 
              customer={activeCustomerId ? db.customers.find(c => c.id === activeCustomerId) || null : null}
              sales={db.sales}
              onClose={() => {
                setIsCustomerModalOpen(false);
                setActiveCustomerId(null);
              }}
              onSave={handleSaveCustomer}
              onDelete={handleDeleteCustomer}
              onMarkCreditPaid={handleMarkCreditPaid}
            />
          )}

          {/* QUICK CALCULATOR OVERLAY */}
          {isCalculatorOpen && (
            <CalculatorModal onClose={() => setIsCalculatorOpen(false)} />
          )}

          {/* BILL DETAILS POPUP SHEET */}
          {activeBillDetailsId && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1500] flex items-end sm:items-center justify-center p-3 animate-fade-in">
              <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-xs p-5 relative shadow-2xl space-y-4">
                <button
                  type="button"
                  onClick={() => setActiveBillDetailsId(null)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-655 bg-slate-100 rounded-full p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
                
                {render_bill_details_modal_wrapper()}
              </div>
            </div>
          )}

          {/* DETAILED DAILY SALES LOG SHEETS OVERLAY */}
          {dayDetailsDate && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1000] flex items-end sm:items-center justify-center p-3 animate-fade-in">
              <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-xs max-h-[85vh] overflow-y-auto p-5 relative shadow-2xl space-y-3">
                <button
                  type="button"
                  onClick={() => setDayDetailsDate(null)}
                  className="absolute right-3 top-3 text-slate-450 hover:text-slate-600 bg-slate-100 rounded-full p-1"
                >
                  <X className="w-4 h-4" />
                </button>
                
                {render_day_details_rows(dayDetailsDate)}
              </div>
            </div>
          )}

          {/* CUSTOMER RETURN FORM MODAL */}
          {returnBillId && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[2500] flex items-end sm:items-center justify-center p-3 animate-fade-in">
              <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-sm p-5 relative shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
                <button
                  type="button"
                  onClick={() => setReturnBillId(null)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 bg-slate-100 rounded-full p-1 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>

                <div>
                  <h3 className="text-base font-black text-slate-900">Process Product Return</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Invoice #{db.sales.find(s => s.id === returnBillId)?.billNo}
                  </p>
                </div>

                <div className="space-y-3">
                  {db.sales.find(s => s.id === returnBillId)?.items.map((item, idx) => {
                    const alreadyReturned = item.returnedQty || 0;
                    const maxAllowed = item.qty - alreadyReturned;

                    return (
                      <div key={item.id || idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col gap-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-xs font-black text-slate-800">{item.name}</span>
                            <div className="text-[9px] text-slate-400 mt-0.5">
                              Cost: Rs.{item.price} • Unit: {item.unit}
                            </div>
                          </div>
                          <div className="text-right text-[10px] font-bold text-slate-500">
                            Purchased: {item.qty} <br />
                            Returned: {alreadyReturned}
                          </div>
                        </div>

                        {maxAllowed > 0 ? (
                          <div className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg p-1.5 pt-1 pb-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Qty to Return:</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max={maxAllowed}
                                value={returnQtys[item.id] !== undefined ? returnQtys[item.id] : 0}
                                onChange={(e) => {
                                  const val = Math.min(maxAllowed, Math.max(0, parseInt(e.target.value) || 0));
                                  setReturnQtys(prev => ({ ...prev, [item.id]: val }));
                                }}
                                className="w-16 text-center border border-slate-200 rounded text-xs py-0.5 font-bold focus:outline-none focus:border-indigo-500"
                              />
                              <span className="text-[10px] text-slate-400 font-semibold">Max: {maxAllowed}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-[9px] text-emerald-600 font-extrabold uppercase bg-emerald-50 px-2 py-1 rounded text-center">
                            Fully Returned
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Live Refund Summary Section */}
                {(() => {
                  const sale = db.sales.find(s => s.id === returnBillId);
                  if (!sale) return null;

                  const selectedReturns = sale.items.map(item => {
                    const qty = returnQtys[item.id] || 0;
                    return { item, qty };
                  }).filter(r => r.qty > 0);

                  if (selectedReturns.length === 0) return null;

                  const isSingleItemBillWithDiscount = sale.items.length === 1 && (sale.discount || 0) > 0;

                  let totalRefundSubtotal = 0;
                  let discountDeduction = 0;

                  selectedReturns.forEach(r => {
                    totalRefundSubtotal += r.item.price * r.qty;
                  });

                  if (isSingleItemBillWithDiscount) {
                    discountDeduction = sale.discount || 0;
                  }

                  const finalReturnAmount = Math.max(0, totalRefundSubtotal - discountDeduction);

                  return (
                    <div className="bg-indigo-50/50 border border-indigo-150 rounded-xl p-3.5 space-y-2 animate-in fade-in duration-200">
                      <div className="flex justify-between text-xs text-slate-500 font-bold">
                        <span>Original Item Price Subtotal:</span>
                        <span>Rs.{formatCurrency(totalRefundSubtotal)}</span>
                      </div>
                      
                      {isSingleItemBillWithDiscount && (sale.discount || 0) > 0 && (
                        <>
                          <div className="flex justify-between text-xs text-amber-600 font-extrabold">
                            <span>Original Discount on Bill:</span>
                            <span>Rs.{formatCurrency(sale.discount)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-rose-500 font-extrabold">
                            <span>Discount Deducted (Full):</span>
                            <span>-Rs.{formatCurrency(discountDeduction)}</span>
                          </div>
                        </>
                      )}

                      <div className="border-t border-dashed border-indigo-200 pt-2 flex justify-between items-center">
                        <span className="text-xs font-black text-slate-800 uppercase tracking-wide">Return Remaining Amount:</span>
                        <span className="text-sm font-black text-indigo-600">Rs.{formatCurrency(finalReturnAmount)}</span>
                      </div>
                    </div>
                  );
                })()}

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setReturnBillId(null)}
                    className="flex-1 py-2.5 bg-slate-150 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase rounded-xl border border-slate-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="flex-1 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-xl shadow-md cursor-pointer"
                    onClick={async () => {
                      const sale = db.sales.find(s => s.id === returnBillId);
                      if (!sale) return;

                      const itemReturns = sale.items.map(item => {
                        const qtyToReturn = returnQtys[item.id] || 0;
                        return {
                          itemId: item.id,
                          name: item.name,
                          qtyToReturn
                        };
                      }).filter(r => r.qtyToReturn > 0);

                      if (itemReturns.length === 0) {
                        await showAlert('Select at least one item quantity to return.', 'No Items Selected');
                        return;
                      }

                      handleProcessReturn(returnBillId, itemReturns);
                      setReturnBillId(null);
                    }}
                  >
                    Confirm Return
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ALERT NOTIFICATIONS LISTOVERLAY */}
          {isAlertsOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1000] flex items-end sm:items-center justify-center p-3">
              <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-xs max-h-[85vh] overflow-y-auto p-5 relative shadow-2xl space-y-3">
                <button
                  type="button"
                  onClick={() => setIsAlertsOpen(false)}
                  className="absolute right-3 top-3 text-slate-450 hover:text-slate-600 bg-slate-100 rounded-full p-1"
                >
                  <X className="w-4 h-4" />
                </button>
                
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-1 mb-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 animate-bounce" />
                  Depleted & Expiring Stock
                </h3>

                {db_alerts_renderer()}
              </div>
            </div>
          )}

          {/* TRANSACTION BILLS HISTORIES LIST (RECEIPTS PREVIEWS TAPPED) */}
          {isHistoryOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[1000] flex items-end sm:items-center justify-center p-3 animate-fade-in">
              <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto p-5 relative shadow-2xl space-y-4">
                <button
                  type="button"
                  onClick={() => setIsHistoryOpen(false)}
                  className="absolute right-3 top-3 text-slate-450 hover:text-slate-600 bg-slate-100 rounded-full p-1"
                >
                  <X className="w-4 h-4" />
                </button>

                <div className="flex justify-between items-center pr-8 gap-2">
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 shrink-0 select-none">
                    <History className="w-4 h-4 text-indigo-500" />
                    Closed Bills
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      setScannerMode('return_bill');
                      setIsScannerOpen(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-755 border border-slate-200/60 dark:border-slate-700/60 rounded-xl text-[10px] font-black uppercase text-indigo-650 dark:text-indigo-400 active:scale-95 transition-all cursor-pointer shadow-xs select-none"
                    title="Scan client bill barcode to open bill"
                  >
                    <Scan className="w-3.5 h-3.5" />
                    Scan Bill
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Filter bills by Client date format..."
                  value={searchHistoryQuery}
                  onChange={(e) => setSearchHistoryQuery(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500"
                />

                {/* Sortable Table Header */}
                <div className="flex items-center justify-between px-3 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-450 dark:text-slate-400 tracking-wider">
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (historySortBy === 'date') {
                          setHistorySortOrder(historySortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setHistorySortBy('date');
                          setHistorySortOrder('desc');
                        }
                      }}
                      className={`flex items-center gap-0.5 transition-colors cursor-pointer py-1 ${historySortBy === 'date' ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'hover:text-slate-600 dark:hover:text-slate-300'}`}
                    >
                      Date
                      <ArrowUpDown className={`w-3 h-3 ${historySortBy === 'date' ? 'opacity-100' : 'opacity-45'}`} />
                      {historySortBy === 'date' && (
                        <span className="text-[8px] font-bold">{historySortOrder === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => {
                        if (historySortBy === 'customer') {
                          setHistorySortOrder(historySortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setHistorySortBy('customer');
                          setHistorySortOrder('asc');
                        }
                      }}
                      className={`flex items-center gap-0.5 transition-colors cursor-pointer py-1 ${historySortBy === 'customer' ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'hover:text-slate-600 dark:hover:text-slate-300'}`}
                    >
                      Customer
                      <ArrowUpDown className={`w-3 h-3 ${historySortBy === 'customer' ? 'opacity-100' : 'opacity-45'}`} />
                      {historySortBy === 'customer' && (
                        <span className="text-[8px] font-bold">{historySortOrder === 'asc' ? '▲' : '▼'}</span>
                      )}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (historySortBy === 'amount') {
                        setHistorySortOrder(historySortOrder === 'asc' ? 'desc' : 'asc');
                      } else {
                        setHistorySortBy('amount');
                        setHistorySortOrder('desc');
                      }
                    }}
                    className={`flex items-center gap-0.5 transition-colors cursor-pointer py-1 ${historySortBy === 'amount' ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'hover:text-slate-600 dark:hover:text-slate-300'}`}
                  >
                    Amount
                    <ArrowUpDown className={`w-3 h-3 ${historySortBy === 'amount' ? 'opacity-100' : 'opacity-45'}`} />
                    {historySortBy === 'amount' && (
                      <span className="text-[8px] font-bold">{historySortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </button>
                </div>

                <div className="space-y-1.5 overflow-y-auto max-h-[310px] pr-0.5">
                  {db_history_renderer()}
                </div>
              </div>
            </div>
          )}

          {/* THERMAL RECEIPTS MODAL PRINT-AND-SHARE OVERLAY */}
          {isReceiptOpen && activeReceiptSale && (
            <div 
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[2000] flex items-start sm:items-center justify-center p-3 overflow-y-auto"
              onClick={() => {
                setIsReceiptOpen(false);
                setActiveReceiptSale(null);
              }}
            >
              <div 
                className="w-full max-w-sm my-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <ReceiptView 
                  sale={activeReceiptSale}
                  settings={db.settings}
                  onClose={() => {
                    setIsReceiptOpen(false);
                    setActiveReceiptSale(null);
                  }}
                  onNewBill={() => {
                    setIsReceiptOpen(false);
                    setActiveReceiptSale(null);
                    setCart([]);
                    setActiveTab('billing');
                  }}
                />
              </div>
            </div>
          )}

          {/* DUAL MODE HARDWARE VIDEO CAMERA SCANNERS */}
          {isScannerOpen && (
            <ScannerOverlay 
              products={db.products}
              sales={db.sales}
              mode={scannerMode}
              onClose={() => setIsScannerOpen(false)}
              onScan={handleOnScanBarcode}
            />
          )}

          {/* CUSTOM IFRAME-SAFE DIALOG (ALERT / CONFIRM / PROMPT) */}
          {dialogConfig && (
            <div className="fixed inset-0 bg-slate-950/80 dark:bg-slate-950/90 backdrop-blur-xs z-[99999] flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="space-y-1.5">
                  <h3 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                    {dialogConfig.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-pre-line leading-relaxed">
                    {dialogConfig.message}
                  </p>
                </div>

                {dialogConfig.type === 'prompt' && (
                  <div>
                    <input
                      id="custom-dialog-prompt-input"
                      type="text"
                      defaultValue={dialogConfig.defaultValue || ''}
                      placeholder={dialogConfig.placeholder || 'Type here...'}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 font-medium"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const val = (e.currentTarget as HTMLInputElement).value;
                          dialogConfig.resolve?.(val);
                          setDialogConfig(null);
                        }
                      }}
                      autoFocus
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-1">
                  {dialogConfig.type !== 'alert' && (
                    <button
                      type="button"
                      onClick={() => {
                        dialogConfig.resolve?.(dialogConfig.type === 'prompt' ? null : false);
                        setDialogConfig(null);
                      }}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-850 hover:bg-slate-150 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-black uppercase rounded-xl transition-all cursor-pointer active:scale-95"
                    >
                      Cancel
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (dialogConfig.type === 'prompt') {
                        const inputEl = document.getElementById('custom-dialog-prompt-input') as HTMLInputElement;
                        dialogConfig.resolve?.(inputEl ? inputEl.value : (dialogConfig.defaultValue || ''));
                      } else {
                        dialogConfig.resolve?.(true);
                      }
                      setDialogConfig(null);
                    }}
                    className={`px-4 py-2 text-white text-[11px] font-black uppercase rounded-xl transition-all cursor-pointer active:scale-95 ${
                      dialogConfig.title.toLowerCase().includes('delete') ||
                      dialogConfig.title.toLowerCase().includes('void') ||
                      dialogConfig.title.toLowerCase().includes('wipe') ||
                      dialogConfig.title.toLowerCase().includes('discard') ||
                      dialogConfig.title.toLowerCase().includes('clear') ||
                      dialogConfig.title.toLowerCase().includes('remove')
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </LocalizationProvider>
  );

  function db_alerts_renderer() {
    const today = new Date();
    const lowMark = db.settings.lowStockDefault || 10;
    const expMark = db.settings.nearExpiryDefault || 30;

    const list: React.ReactNode[] = [];

    db.products.forEach(p => {
      const threshold = p.lowStockAlert !== null ? p.lowStockAlert : lowMark;
      if (p.qty <= threshold) {
        list.push(
          <div key={`low-${p.id}`} className="bg-amber-50 p-2.5 rounded-xl border border-amber-100 flex flex-col justify-between animate-fade-in">
            <span className="text-xs font-black text-amber-900">{p.name} - Depleted</span>
            <span className="text-[9px] text-amber-600 font-bold mt-1 uppercase tracking-wide">
              Only {p.qty} left in stock (alert threshold &lt;={threshold})
            </span>
          </div>
        );
      }

      if (p.expiryDate) {
        const days = Math.ceil((new Date(p.expiryDate).getTime() - today.getTime()) / 86400000);
        const refDays = p.nearExpiryDays !== null ? p.nearExpiryDays : expMark;
        
        if (days < 0) {
          list.push(
            <div key={`exp-${p.id}`} className="bg-red-50 p-2.5 rounded-xl border border-red-150 flex flex-col justify-between animate-fade-in">
              <span className="text-xs font-black text-red-900">{p.name} - EXPIRED</span>
              <span className="text-[9px] text-red-600 font-bold mt-1 uppercase tracking-wide">
                Items expired on {formatDate(p.expiryDate)} (remove immediately)
              </span>
            </div>
          );
        } else if (days <= refDays) {
          list.push(
            <div key={`soon-${p.id}`} className="bg-rose-50 p-2.5 rounded-xl border border-rose-100 flex flex-col justify-between animate-fade-in">
              <span className="text-xs font-black text-rose-900">{p.name} - Expiring soon</span>
              <span className="text-[9px] text-rose-650 font-bold mt-1 uppercase tracking-wide">
                Expires in {days} days on {formatDate(p.expiryDate)}
              </span>
            </div>
          );
        }
      }
    });

    // Add Predictive Alerts
    const predictiveAlerts = computePredictiveAlerts(db.products, db.sales);
    predictiveAlerts.forEach(pa => {
      // Avoid double alerting list items if they are already in standard low stock card
      const p = db.products.find(prod => prod.id === pa.id);
      if (p) {
        const threshold = p.lowStockAlert !== null ? p.lowStockAlert : lowMark;
        if (p.qty <= threshold) {
          return;
        }
      }
      list.push(
        <div key={`pred-${pa.id}`} className="bg-indigo-50 p-2.5 rounded-xl border border-indigo-150 flex flex-col justify-between animate-fade-in">
          <div className="flex justify-between items-center pr-1">
            <span className="text-xs font-black text-indigo-950">{pa.name} - Restock forecast</span>
            <span className="text-[8px] bg-indigo-150 text-indigo-755 font-black px-1.5 py-0.5 rounded uppercase tracking-wider select-none">Predictive</span>
          </div>
          <span className="text-[9px] text-indigo-705 font-bold mt-1 uppercase tracking-wide leading-tight">
            Expected Stockout in <strong className="text-indigo-950 font-black">{pa.daysToStockout.toFixed(1)} days</strong> (sales velocity: {pa.velocity.toFixed(2)}/day).
          </span>
          <span className="text-[9.5px] text-indigo-900 font-extrabold mt-2 bg-white/70 px-2.5 py-1.5 rounded-lg border border-indigo-100/60 leading-none">
            Suggested Reordering PO target value: <strong className="font-extrabold text-indigo-950">+{pa.recommendedQty} units</strong>
          </span>
        </div>
      );
    });

    return list.length > 0 ? (
      <div className="space-y-2 max-h-[350px] overflow-y-auto">{list}</div>
    ) : (
      <p className="text-xs text-slate-400 py-6 text-center select-none font-bold">
        ✅ All stocks online inside nominal bounds!
      </p>
    );
  }

  function db_history_renderer() {
    const list = [...db.sales].filter(s => !s.voided);
    const filtered = searchHistoryQuery.trim().toLowerCase()
      ? list.filter(s => String(s.billNo).toLowerCase().includes(searchHistoryQuery.toLowerCase()) || s.customer.toLowerCase().includes(searchHistoryQuery.toLowerCase()) || s.date.includes(searchHistoryQuery))
      : list;

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      if (historySortBy === 'date') {
        const dateA = a.date + ' ' + (a.time || '');
        const dateB = b.date + ' ' + (b.time || '');
        comparison = dateA.localeCompare(dateB);
        if (comparison === 0) {
          // Fallback to billNo comparison
          comparison = String(a.billNo).localeCompare(String(b.billNo));
        }
      } else if (historySortBy === 'amount') {
        comparison = a.total - b.total;
      } else if (historySortBy === 'customer') {
        const nameA = a.customer || 'Walk-in';
        const nameB = b.customer || 'Walk-in';
        comparison = nameA.localeCompare(nameB);
      }

      return historySortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted.length > 0 ? (
      <div className="space-y-2">
        {sorted.map((s, index) => (
          <motion.button
            key={s.id}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-4px" }}
            transition={{ duration: 0.25, delay: Math.min(index * 0.03, 0.18), ease: "easeOut" }}
            type="button"
            onClick={() => {
              setIsHistoryOpen(false);
              setActiveBillDetailsId(s.id);
            }}
            className="w-full text-left bg-slate-50 hover:bg-slate-100/90 rounded-xl p-2.5 border border-slate-150 flex justify-between items-center transition-all cursor-pointer"
          >
            <div>
              <div className="text-xs font-black text-slate-800">
                Invoice #{s.billNo} • <span className="text-slate-500 font-bold">{s.customer || 'Walk-in'}</span>
              </div>
              <p className="text-[9px] text-slate-400 mt-1 font-semibold">
                {formatDate(s.date)} • {s.items.length} units • {s.paymentMethod}
              </p>
            </div>
            <span className="font-black text-xs text-indigo-700 font-mono">Rs.{formatCurrency(s.total)}</span>
          </motion.button>
        ))}
      </div>
    ) : (
      <p className="text-center py-8 text-xs text-slate-400 select-none">No matched transactions found.</p>
    );
  }

  function render_bill_details_modal_wrapper() {
    const bill = db.sales.find(s => s.id === activeBillDetailsId);
    if (!bill) return null;

    return (
      <div className="space-y-4 pt-2">
        <div>
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Transaction Invoice Detail</h4>
          <h3 className="text-lg font-black text-slate-900 mt-1">Invoice #{bill.billNo}</h3>
          <p className="text-[10px] text-slate-400 font-semibold mt-1 flex gap-2">
            <span>{formatDate(bill.date)} {bill.time || ''}</span>
            <span>•</span>
            <span>Customer: {bill.customer || 'Walk-in'}</span>
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-1 max-h-[140px] overflow-y-auto">
          {bill.items.map((i, idx) => (
            <div key={idx} className="flex justify-between text-xs py-1 border-b border-dashed border-slate-200 last:border-none">
              <span>{i.name} × {i.qty}</span>
              <span className="font-bold text-slate-950">Rs.{formatCurrency(i.price * i.qty)}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center bg-slate-900 text-white rounded-xl p-3 text-xs">
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-450 uppercase font-black">Cash checkout Net</span>
            <span className="font-black text-emerald-450 text-sm">Rs.{formatCurrency(bill.total)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[9px] text-slate-450 uppercase font-black">Store Profit</span>
            <span className="font-extrabold text-white text-xs">Rs.{formatCurrency(bill.profit || 0)}</span>
          </div>
        </div>

        {bill.paymentMethod === 'credit' && (
          <div className="bg-amber-50 border border-amber-100 p-2.5 rounded-xl text-center select-none">
            <span className={`text-[10px] font-black uppercase tracking-wider ${bill.creditPaid ? 'text-emerald-700' : 'text-amber-805'}`}>
              {bill.creditPaid ? '✅ Credit fully Paid and Settled' : '📒 Credit Ledger Pending'}
            </span>
            {!bill.creditPaid && !bill.voided && (
              <button
                type="button"
                onClick={() => handleMarkCreditPaid(bill.id)}
                className="mt-2.5 mx-auto bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-transform active:scale-95 cursor-pointer block"
              >
                Clear Ledger Balance
              </button>
            )}
          </div>
        )}

        {!bill.voided && (
          <button
            type="button"
            onClick={() => {
              setActiveBillDetailsId(null);
              setReturnBillId(bill.id);
            }}
            className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase rounded-lg cursor-pointer flex items-center justify-center gap-1.5"
          >
            ↩ Return/Refund Products
          </button>
        )}

        <div className="flex gap-2">
          {!bill.voided && (
            <button
              onClick={() => handleVoidInvoice(bill.id)}
              className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-black uppercase rounded-lg border border-rose-100"
            >
              Void Bill
            </button>
          )}
          <button
            onClick={() => {
              // Open Thermal Invoice preview again
              setActiveBillDetailsId(null);
              setActiveReceiptSale(bill);
              setIsReceiptOpen(true);
            }}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase rounded-lg shadow-sm cursor-pointer"
          >
            Invoice Print
          </button>
        </div>
      </div>
    );
  }

  function render_day_details_rows(date: string) {
    const list = db.sales.filter(s => s.date === date && !s.voided);
    const rev = list.reduce((a, s) => a + s.total, 0);
    const prof = list.reduce((a, s) => a + (s.profit || 0), 0);

    const de = db.expenses.filter(e => e.date === date);
    const te = de.reduce((a, e) => a + e.amount, 0);

    const formattedDate = formatDate(date);

    return (
      <div className="pt-2 space-y-4">
        <div>
          <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">Date Consolidated logs</h4>
          <h3 className="text-sm font-black text-slate-900 mt-1">{formattedDate}</h3>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center text-xs">
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
            <span className="text-[9px] text-slate-400 block font-bold">REVENUE</span>
            <span className="text-sm font-black text-emerald-650 mt-0.5 block">Rs.{formatCurrency(rev)}</span>
          </div>
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5">
            <span className="text-[9px] text-slate-400 block font-bold">GROSS PROFIT</span>
            <span className={`text-sm font-black mt-0.5 block ${prof >= 0 ? 'text-emerald-555' : 'text-rose-500'}`}>
              Rs.{formatCurrency(prof)}
            </span>
          </div>
        </div>

        {/* Expenses outflows in selected date */}
        {te > 0 && (
          <div className="bg-rose-50 border border-rose-100 rounded-xl p-3">
            <span className="text-[10px] text-rose-700 font-extrabold block uppercase whitespace-nowrap">Logged Outflows Expense: Rs.{formatCurrency(te)}</span>
            <div className="mt-1.5 space-y-1 select-all font-semibold text-[9px] text-rose-550 leading-relaxed uppercase">
              {de.map(e => (
                <div key={e.id} className="flex justify-between">
                  <span>• {e.desc}</span>
                  <span>Rs.{formatCurrency(e.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
          Checkout Receipts ({list.length})
        </label>

        <div className="space-y-2 overflow-y-auto max-h-[180px]">
          {list.map(s => (
            <button
              key={s.id}
              onClick={() => {
                setDayDetailsDate(null);
                setActiveBillDetailsId(s.id);
              }}
              className="w-full text-left bg-slate-50 p-2.5 rounded-xl border border-slate-150 flex justify-between transition-all"
            >
              <div>
                <span className="text-xs font-black text-slate-800">Bill #{s.billNo} • {s.customer || 'Walk-in'}</span>
                <span className="text-[9px] text-slate-400 block mt-0.5 font-semibold">{s.items.length} units • {s.time}</span>
              </div>
              <span className="font-extrabold text-xs text-indigo-700">Rs.{formatCurrency(s.total)}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  function on_billing_clear_cart() {
    setCart([]);
  }
}

// ════════════════════════════════════════
// SLEEK WELCOME CONFIG FOR FIRST-TIME RUNS
// ════════════════════════════════════════
interface FirstLoginSetupProps {
  onSave: (nid: string, pw1: string, shopName: string) => void;
}
function FirstLoginSetupForm({ onSave }: FirstLoginSetupProps) {
  const [shopName, setShopName] = useState('');
  const [nid, setNid] = useState('');
  const [pw1, setPw1] = useState('');
  const [pw2, setPw2] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) {
      setErrorMsg('Shop Name is required to personalize your register');
      return;
    }
    if (!pw1 || pw1.length < 6) {
      setErrorMsg('Secure passcode is required (min 6 characters)');
      return;
    }
    if (pw1 !== pw2) {
      setErrorMsg('Passwords do not match');
      return;
    }
    onSave(nid.trim() || 'admin', pw1, shopName.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 flex flex-col justify-center p-4">
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-6 shadow-2xl max-w-sm w-full mx-auto text-white">
        <div className="text-center mb-4 select-none">
          <AppLogo size="xl" rounded="rounded-2xl" className="mx-auto mb-3" />
          <h2 className="text-2xl font-black tracking-tight text-white leading-none">Configure ShopPOS Pro</h2>
          <p className="text-xs text-indigo-400 font-bold mt-1.5 uppercase tracking-wide">First-time register setup</p>
        </div>

        <form onSubmit={handleSetupSubmit} className="space-y-3.5 mt-4">
          <div>
            <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-1">
              Shop Name *
            </label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              required
              placeholder="e.g. My General Store"
              className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500 font-bold text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Operator Username / ID
            </label>
            <input
              type="text"
              value={nid}
              onChange={(e) => setNid(e.target.value)}
              placeholder="Default is 'admin'"
              className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-505 font-bold text-white"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Set Security Passcode *
            </label>
            <input
              type="password"
              placeholder="minimum 6 characters"
              value={pw1}
              onChange={(e) => setPw1(e.target.value)}
              required
              className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 text-white font-bold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Confirm passcode *
            </label>
            <input
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              required
              placeholder="••••••"
              className="w-full bg-slate-950/60 border border-slate-805 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400 text-white font-bold"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-rose-350 bg-rose-950/40 p-2.5 rounded-xl text-center font-bold border border-rose-900/50">
              {errorMsg}
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-colors"
          >
            Create Store & Open Register
          </button>
        </form>
      </div>
    </div>
  );
}

// ════════════════════════════════════════
// Sleek Login screen wrapper
// ════════════════════════════════════════
interface LoginScreenProps {
  userId: string;
  loginUserId: string;
  setLoginUserId: (v: string) => void;
  loginPw: string;
  setLoginPw: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  error: string;
  lockoutMsg: string;
  fpReg: string | null;
  onBiometricLogin: () => void;
  sessionNotice?: string | null;
  onClearNotice?: () => void;
}
function LoginScreen({
  userId,
  loginUserId,
  setLoginUserId,
  loginPw,
  setLoginPw,
  onSubmit,
  error,
  lockoutMsg,
  fpReg,
  onBiometricLogin,
  sessionNotice,
  onClearNotice,
}: LoginScreenProps) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-7 shadow-2xl max-w-sm w-full mx-auto text-white">
        
        <div className="text-center select-none mb-6">
          <AppLogo size="lg" rounded="rounded-2xl" className="mx-auto mb-3" />
          <h2 className="text-xl font-bold text-slate-100 tracking-tight leading-none">ShopPOS</h2>
          <p className="text-[10px] text-slate-400 font-semibold mt-1 tracking-wider uppercase">Billing Station Login</p>
        </div>

        {sessionNotice && (
          <div className="bg-amber-950/40 text-amber-300 p-3.5 rounded-2xl text-[11px] font-semibold border border-amber-800/60 leading-relaxed flex items-start gap-2.5 mb-5 animate-in fade-in zoom-in-95 duration-200">
            <Moon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold text-amber-200 block text-xs mb-0.5">End-of-Day Automatic Rollover</span>
              {sessionNotice}
            </div>
            {onClearNotice && (
              <button
                type="button"
                onClick={onClearNotice}
                className="text-amber-400/70 hover:text-amber-200 p-0.5 rounded cursor-pointer transition-colors"
                title="Dismiss notice"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {lockoutMsg ? (
          <div className="bg-rose-950/40 text-rose-350 p-3.5 tracking-wide rounded-xl text-xs font-bold text-center border border-rose-900/60 leading-relaxed shadow-inner">
            {lockoutMsg}
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-[8px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5 select-none">
                Operator ID
              </label>
              <input
                type="text"
                placeholder={`Operator: ${userId}`}
                value={loginUserId}
                onChange={(e) => setLoginUserId(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 font-semibold text-white"
              />
            </div>

            <div>
              <label className="block text-[8px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5 select-none">
                Passcode
              </label>
              <input
                type="password"
                placeholder="••••••"
                value={loginPw}
                onChange={(e) => setLoginPw(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-3 text-xs outline-none focus:border-indigo-500 text-center font-bold tracking-widest text-white"
              />
            </div>

            {error && (
              <p className="text-[11px] font-semibold text-rose-400 bg-rose-950/20 p-2 rounded-xl text-center border border-rose-950">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-505 text-white text-[11px] font-black uppercase tracking-wider rounded-xl cursor-pointer transition-colors shadow-lg active:scale-95"
            >
              Sign In & Open Register
            </button>

            {fpReg && (
              <div className="space-y-1 pt-1">
                <button
                  type="button"
                  onClick={onBiometricLogin}
                  className={`w-full py-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all active:scale-95 text-[11px] font-bold uppercase ${
                    fpReg === 'simulated_biometric'
                      ? 'bg-amber-950/25 hover:bg-amber-950/40 text-amber-300 border border-amber-900/50'
                      : 'bg-slate-800 hover:bg-slate-755 text-indigo-300 border border-indigo-950'
                  }`}
                >
                  <Unlock className="w-3.5 h-3.5 stroke-[2]" />
                  {fpReg === 'simulated_biometric'
                    ? 'Touch Bypass (Non-Secure Demo)'
                    : 'Biometric Unlock'}
                </button>
                {fpReg === 'simulated_biometric' && (
                  <p className="text-[9px] text-center text-amber-400/80 font-medium">
                    ⚠️ Simulated in WebView — No hardware verification
                  </p>
                )}
              </div>
            )}
          </form>
        )}

        <div className="text-[9px] text-center text-slate-500 mt-6 select-none font-medium">
          Saved offline locally
        </div>
      </div>
    </div>
  );
}
