/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Home,
  Bell,
  LogOut,
  ShoppingCart,
  History,
  Users,
  ArrowUpRight,
  TrendingUp,
  AlertCircle,
  Calendar,
  Sparkles,
  Store,
  CheckCircle2,
  X,
  SlidersHorizontal,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  RotateCcw,
  BarChart3,
  Zap,
  Receipt,
  Package,
  FileText,
  CreditCard,
  Check,
  LayoutGrid,
} from 'lucide-react';
import { AppDatabase, Sale, DashboardWidgetConfig, DashboardWidgetId } from '../types';
import { formatCurrency, computePredictiveAlerts, getTodayDateString, parseDateString, isSameDate, computeSaleProfit, formatDate, compareSales } from '../utils';
import { useTranslation } from '../context/LocalizationContext';
import { DailySalesChart } from './DailySalesChart';

export { type DashboardWidgetId, type DashboardWidgetConfig };

export const WIDGET_STORAGE_KEY = 'shoppos_dashboard_widgets_v2';

export const DEFAULT_WIDGET_CONFIGS: DashboardWidgetConfig[] = [
  {
    id: 'store_profile',
    name: 'Store Profile Setup',
    description: 'Onboarding setup banner for store contact, GSTIN & UPI details',
    iconName: 'Store',
    visible: true,
  },
  {
    id: 'alerts_banners',
    name: 'Alerts & Credit Badges',
    description: 'Urgent stock, expiry warnings, and customer credit balance badges',
    iconName: 'AlertCircle',
    visible: true,
  },
  {
    id: 'summary_cards',
    name: 'Revenue & Profit Cards',
    description: "Today's total revenue, net margin, and expense overview",
    iconName: 'TrendingUp',
    visible: true,
  },
  {
    id: 'daily_sales_chart',
    name: 'Daily Sales Chart',
    description: '7-day daily sales revenue, net profit & invoice count interactive graph',
    iconName: 'BarChart3',
    visible: true,
  },
  {
    id: 'quick_actions',
    name: 'Quick Actions',
    description: 'Direct shortcuts to New Sale, Bill History, Customers & Inventory',
    iconName: 'Zap',
    visible: true,
  },
  {
    id: 'predictive_alerts',
    name: 'Predictive Alerts',
    description: 'Smart stockout forecasting & demand velocity reorder targets',
    iconName: 'Sparkles',
    visible: true,
  },
  {
    id: 'recent_transactions',
    name: 'Recent Transactions',
    description: 'Live feed of latest customer invoices and receipts',
    iconName: 'Receipt',
    visible: true,
  },
];

export const loadDashboardWidgets = (): DashboardWidgetConfig[] => {
  try {
    const saved = localStorage.getItem(WIDGET_STORAGE_KEY);
    if (saved) {
      const parsed: DashboardWidgetConfig[] = JSON.parse(saved);
      const existingIds = new Set(parsed.map((w) => w.id));
      const merged = [...parsed];
      for (const def of DEFAULT_WIDGET_CONFIGS) {
        if (!existingIds.has(def.id)) {
          merged.push(def);
        }
      }
      return merged;
    }
  } catch (e) {
    console.error('Failed to load dashboard widgets configuration:', e);
  }
  return DEFAULT_WIDGET_CONFIGS;
};

interface DashboardViewProps {
  db: AppDatabase;
  onNavigate: (tab: string) => void;
  onOpenAlerts: () => void;
  onOpenHistory: () => void;
  onOpenBillDetails: (saleId: string) => void;
  onLogout: () => void;
  onOpenStoreSetup?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  db,
  onNavigate,
  onOpenAlerts,
  onOpenHistory,
  onOpenBillDetails,
  onLogout,
  onOpenStoreSetup,
}) => {
  const { t } = useTranslation();
  const settings = db.settings;
  const todayStr = getTodayDateString();
  const [summaryPeriod, setSummaryPeriod] = useState<'today' | 'week' | 'month' | 'all'>('today');

  const [hideProfileBanner, setHideProfileBanner] = useState<boolean>(() => {
    return localStorage.getItem('shoppos_hide_profile_banner') === '1';
  });

  // Widget layout & visibility configuration
  const [widgets, setWidgets] = useState<DashboardWidgetConfig[]>(() => loadDashboardWidgets());

  useEffect(() => {
    const handleSync = () => {
      setWidgets(loadDashboardWidgets());
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('shoppos_dashboard_widgets_changed', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('shoppos_dashboard_widgets_changed', handleSync);
    };
  }, []);

  // Calculate missing profile items
  const isProfileIncomplete = !settings.phone || !settings.address || !settings.upi;

  // Filter sales for summary metrics
  const activeSales = db.sales.filter((s) => !s.voided);
  const filteredSales = activeSales.filter((s) => {
    if (summaryPeriod === 'all') return true;
    const cleanDate = parseDateString(s.date);
    if (summaryPeriod === 'today') return cleanDate === todayStr;
    
    const [y, m, d] = cleanDate.split('-').map(Number);
    if (!y || !m || !d) return false;
    const saleDate = new Date(y, m - 1, d);
    saleDate.setHours(0, 0, 0, 0);

    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);

    if (summaryPeriod === 'week') {
      const threshold = new Date(todayObj);
      threshold.setDate(threshold.getDate() - 6);
      return saleDate >= threshold;
    }
    if (summaryPeriod === 'month') {
      const threshold = new Date(todayObj.getFullYear(), todayObj.getMonth(), 1);
      return saleDate >= threshold;
    }
    return true;
  });

  const totalRevenue = filteredSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  const grossProfit = filteredSales.reduce((sum, s) => sum + computeSaleProfit(s), 0);

  // Filter expenses for summary metrics
  const filteredExpenses = db.expenses.filter((e) => {
    if (summaryPeriod === 'all') return true;
    const cleanDate = parseDateString(e.date);
    if (summaryPeriod === 'today') return cleanDate === todayStr;

    const [y, m, d] = cleanDate.split('-').map(Number);
    if (!y || !m || !d) return false;
    const expDate = new Date(y, m - 1, d);
    expDate.setHours(0, 0, 0, 0);

    const todayObj = new Date();
    todayObj.setHours(0, 0, 0, 0);

    if (summaryPeriod === 'week') {
      const threshold = new Date(todayObj);
      threshold.setDate(threshold.getDate() - 6);
      return expDate >= threshold;
    }
    if (summaryPeriod === 'month') {
      const threshold = new Date(todayObj.getFullYear(), todayObj.getMonth(), 1);
      return expDate >= threshold;
    }
    return true;
  });

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  const netProfit = grossProfit - totalExpenses;

  // Outstanding credit balance calculations
  const creditBills = db.sales.filter(
    (s) => s.paymentMethod === 'credit' && !s.creditPaid && !s.voided
  );
  const outstandingCredit = creditBills.reduce((sum, s) => sum + s.total, 0);
  const pendingCreditsCount = creditBills.length;

  // Alerts
  const lowStockThreshold = db.settings.lowStockDefault || 10;
  const expiryThreshold = db.settings.nearExpiryDefault || 30;
  const today = new Date();

  const predictiveAlerts = computePredictiveAlerts(db.products, db.sales);

  const alertsCount =
    db.products.reduce((count, p) => {
      const limit = p.lowStockAlert !== null ? p.lowStockAlert : lowStockThreshold;
      let flagged = false;
      if (p.qty <= limit) {
        count++;
        flagged = true;
      }

      if (p.expiryDate) {
        const days = Math.ceil((new Date(p.expiryDate).getTime() - today.getTime()) / 86400000);
        const alertDays = p.nearExpiryDays !== null ? p.nearExpiryDays : expiryThreshold;
        if (days <= alertDays) {
          if (!flagged) count++;
        }
      }
      return count;
    }, 0) +
    predictiveAlerts.filter((pa) => {
      const p = db.products.find((prod) => prod.id === pa.id);
      if (!p) return false;
      const limit = p.lowStockAlert !== null ? p.lowStockAlert : lowStockThreshold;
      return p.qty > limit;
    }).length;

  // Recent 5 bills strictly ordered by latest transaction first (chronological & invoice sequence, never by bill total)
  const recentBills = useMemo(() => {
    return [...db.sales]
      .filter((s) => !s.voided)
      .sort((a, b) => compareSales(a, b, 'date', 'desc'))
      .slice(0, 5);
  }, [db.sales]);

  // RENDER WIDGET DISPATCHER
  const renderWidget = (widget: DashboardWidgetConfig) => {
    if (!widget.visible) return null;

    switch (widget.id) {
      case 'store_profile':
        if (!isProfileIncomplete || hideProfileBanner) return null;
        return (
          <div
            key={widget.id}
            className="bg-indigo-500/10 dark:bg-indigo-950/40 border border-indigo-500/20 dark:border-indigo-800/60 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-fade-in"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-500 dark:text-indigo-400 shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Complete Store Profile</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                    Quick Setup
                  </span>
                </h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium mt-0.5">
                  Add your Phone, Address, GSTIN & UPI ID to personalize receipts & dynamic Bharat QR codes.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (onOpenStoreSetup) {
                    onOpenStoreSetup();
                  } else {
                    onNavigate('settings');
                  }
                }}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1 cursor-pointer"
              >
                <span>Setup Details</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setHideProfileBanner(true);
                  localStorage.setItem('shoppos_hide_profile_banner', '1');
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Dismiss for now"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );

      case 'alerts_banners':
        if (alertsCount === 0 && outstandingCredit === 0) return null;
        return (
          <div key={widget.id} className="space-y-2.5 animate-fade-in">
            {alertsCount > 0 && (
              <button
                type="button"
                onClick={onOpenAlerts}
                className="flex items-center gap-3 bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-left hover:bg-red-500/10 dark:hover:bg-red-500/15 transition-all w-full cursor-pointer group shadow-sm"
              >
                <div className="w-9 h-9 rounded-xl bg-red-500/10 dark:bg-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 flex-shrink-0 animate-pulse">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-extrabold text-red-950 dark:text-red-200 flex items-center gap-1.5">
                    <span>{alertsCount} Stock & Expiry Alert{alertsCount > 1 ? 's' : ''} Pending</span>
                  </h4>
                  <p className="text-[10px] text-red-700/80 dark:text-red-300/80 font-medium mt-0.5">
                    Products have depleted or are expiring shortly. Restock directly now.
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-red-550 dark:text-red-400 ml-auto group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            )}

            {outstandingCredit > 0 && (
              <button
                type="button"
                onClick={() => onNavigate('customers')}
                className="flex items-center gap-3 bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 text-left hover:bg-amber-500/10 dark:hover:bg-amber-500/15 transition-all w-full cursor-pointer group shadow-sm"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 flex items-center justify-center text-amber-700 dark:text-amber-400 flex-shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-extrabold text-amber-950 dark:text-amber-200">
                    {settings.currency || 'Rs.'}{formatCurrency(outstandingCredit)} Outstanding Credit
                  </h4>
                  <p className="text-[10px] text-amber-700/80 dark:text-amber-300/80 font-medium mt-0.5">
                    Awaiting payment balances over {pendingCreditsCount} customer accounts.
                  </p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-amber-600 dark:text-amber-400 ml-auto group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </button>
            )}
          </div>
        );

      case 'summary_cards':
        return (
          <div key={widget.id} className="space-y-2.5 animate-fade-in">
            <div className="flex items-center justify-between px-0.5">
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5 select-none">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                Live Revenue & Margins
              </span>
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-xl text-[9px] font-bold">
                {(['today', 'week', 'month', 'all'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setSummaryPeriod(p)}
                    className={`px-2 py-0.5 rounded-lg uppercase tracking-wider transition-all cursor-pointer ${
                      summaryPeriod === p
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
                    }`}
                  >
                    {p === 'today' ? 'Today' : p === 'week' ? '7 Days' : p === 'month' ? 'Month' : 'All'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.02)] relative overflow-hidden group hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                <div className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5 select-none">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  {t('sales_summary')}
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 mt-1 tracking-tight">
                  {settings.currency || 'Rs.'}{formatCurrency(totalRevenue)}
                </h3>
                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                  {filteredSales.length} closed bill{filteredSales.length === 1 ? '' : 's'} {summaryPeriod === 'today' ? 'today' : `(${summaryPeriod})`}
                </p>
                <div className="absolute right-3 bottom-3 text-2xl opacity-15 dark:opacity-10 group-hover:scale-110 transition-transform duration-300 pointer-events-none select-none">
                  💵
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.02)] relative overflow-hidden group hover:border-slate-200 dark:hover:border-slate-700 transition-all">
                <div className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5 select-none">
                  <Home className="w-3 h-3 text-indigo-500" />
                  {t('profit')}
                </div>
                <h3
                  className={`text-base sm:text-lg font-black mt-1 tracking-tight ${
                    netProfit >= 0 ? 'text-emerald-555 dark:text-emerald-400' : 'text-rose-500'
                  }`}
                >
                  {settings.currency || 'Rs.'}{formatCurrency(netProfit)}
                </h3>
                {totalExpenses > 0 ? (
                  <p className="text-[9px] font-bold text-rose-500 dark:text-rose-400 mt-0.5">
                    Gross: {settings.currency || 'Rs.'}{formatCurrency(grossProfit)} • Exp: {settings.currency || 'Rs.'}{formatCurrency(totalExpenses)}
                  </p>
                ) : (
                  <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                    {totalRevenue > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(1)}% net margin` : 'Net profit balance'}
                  </p>
                )}
                <div className="absolute right-3 bottom-3 text-2xl opacity-15 dark:opacity-10 group-hover:scale-110 transition-transform duration-300 pointer-events-none select-none">
                  📈
                </div>
              </div>
            </div>
          </div>
        );

      case 'daily_sales_chart':
        return (
          <div key={widget.id} className="animate-fade-in">
            <DailySalesChart
              sales={db.sales}
              expenses={db.expenses}
              currency={settings.currency || 'Rs.'}
              onNavigate={onNavigate}
            />
          </div>
        );

      case 'quick_actions':
        return (
          <div key={widget.id} className="space-y-2 animate-fade-in">
            <div className="flex justify-between items-center px-1 select-none">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-500" />
                Quick Actions
              </span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              <button
                type="button"
                onClick={() => onNavigate('billing')}
                className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-100 dark:border-slate-800/80 rounded-2xl py-3 px-1.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all text-center shadow-2xs group"
              >
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 tracking-tight">
                  New sale
                </span>
              </button>

              <button
                type="button"
                onClick={onOpenHistory}
                className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-100 dark:border-slate-800/80 rounded-2xl py-3 px-1.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all text-center shadow-2xs group"
              >
                <div className="w-8 h-8 rounded-xl bg-slate-500/10 dark:bg-slate-500/20 text-slate-600 dark:text-slate-300 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <History className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 tracking-tight">
                  Bill history
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('customers')}
                className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-100 dark:border-slate-800/80 rounded-2xl py-3 px-1.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all text-center shadow-2xs group"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 tracking-tight">
                  Customers
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('inventory')}
                className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-100 dark:border-slate-800/80 rounded-2xl py-3 px-1.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all text-center shadow-2xs group"
              >
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Package className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 tracking-tight">
                  Inventory
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('documents')}
                className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-100 dark:border-slate-800/80 rounded-2xl py-3 px-1.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all text-center shadow-2xs group"
              >
                <div className="w-8 h-8 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 tracking-tight">
                  E-Way Bills
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNavigate('reports')}
                className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-100 dark:border-slate-800/80 rounded-2xl py-3 px-1.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all text-center shadow-2xs group"
              >
                <div className="w-8 h-8 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200 tracking-tight">
                  Reports
                </span>
              </button>
            </div>
          </div>
        );

      case 'predictive_alerts':
        if (predictiveAlerts.length === 0) return null;
        return (
          <div
            key={widget.id}
            className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.02)] animate-fade-in"
          >
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-[9px] font-bold text-indigo-605 dark:text-indigo-400 uppercase tracking-widest flex items-center gap-1.5 select-none">
                <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
                <span>Smart Stockout Forecasting</span>
              </h4>
              <span className="text-[8px] bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                Sales Demand Velocity
              </span>
            </div>

            <div className="space-y-2">
              {predictiveAlerts.slice(0, 3).map((pa) => (
                <div
                  key={pa.id}
                  className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-3 flex flex-col justify-between hover:border-indigo-500/20 hover:bg-slate-50/80 dark:hover:bg-slate-950/60 transition-all shadow-2xs"
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 line-clamp-1 leading-tight">
                      {pa.name}
                    </span>
                    <span
                      className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full select-none flex-shrink-0 tracking-wider ${
                        pa.daysToStockout <= 2
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                          : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {pa.daysToStockout <= 1
                        ? '⚠️ Out tomorrow'
                        : `Stockout in ${pa.daysToStockout.toFixed(1)} days`}
                    </span>
                  </div>

                  <div className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 uppercase tracking-wider">
                    <span>
                      Stock: <strong className="text-slate-700 dark:text-slate-300 font-extrabold">{pa.qty} units</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Velocity: <strong className="text-slate-700 dark:text-slate-300 font-extrabold">{pa.velocity.toFixed(2)} / day</strong>
                    </span>
                  </div>

                  <div className="mt-2 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 rounded-xl p-2 flex justify-between items-center">
                    <span className="text-[8.5px] text-indigo-600 dark:text-indigo-455 font-black uppercase tracking-wider">
                      Suggested PO Target Cover
                    </span>
                    <span className="text-[10px] font-black text-indigo-900 dark:text-indigo-200 bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950 px-2 py-0.5 shadow-2xs rounded-lg">
                      +{pa.recommendedQty} units
                    </span>
                  </div>
                </div>
              ))}

              {predictiveAlerts.length > 3 && (
                <button
                  type="button"
                  onClick={onOpenAlerts}
                  className="w-full text-center py-1 mt-0.5 text-[9px] font-black text-indigo-650 hover:text-indigo-500 dark:text-indigo-400 uppercase tracking-widest cursor-pointer"
                >
                  See all {predictiveAlerts.length} predictive reordering suggestions →
                </button>
              )}
            </div>
          </div>
        );

      case 'recent_transactions':
        return (
          <div key={widget.id} className="space-y-2 animate-fade-in">
            <div className="flex justify-between items-center mb-1 select-none pt-1">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1">
                <Receipt className="w-3 h-3 text-indigo-500" />
                {t('recent_sales')}
              </span>
              <button
                type="button"
                onClick={onOpenHistory}
                className="text-[9px] font-black text-indigo-650 hover:text-indigo-500 dark:text-indigo-400 uppercase tracking-widest cursor-pointer"
              >
                See All Transactions →
              </button>
            </div>

            <div className="space-y-1.5">
              {recentBills.length > 0 ? (
                recentBills.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onOpenBillDetails(s.id)}
                    className="w-full text-left bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-slate-200 dark:hover:border-slate-700 shadow-2xs rounded-2xl p-3 flex justify-between items-center transition-all cursor-pointer active:scale-[0.995]"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="font-bold text-xs text-slate-850 dark:text-slate-200 flex items-center gap-1.5">
                        <span className="text-slate-900 dark:text-slate-100 font-extrabold">
                          Invoice #{s.billNo}
                        </span>
                        <span className="text-slate-300 dark:text-slate-700 font-medium">•</span>
                        <span className="truncate text-slate-550 dark:text-slate-400 font-semibold">
                          {s.customer || 'Walk-in Client'}
                        </span>
                      </div>
                      <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1.5 uppercase tracking-wider">
                        <span>{s.items.length} {s.items.length === 1 ? 'item' : 'items'}</span>
                        <span>•</span>
                        <span className="capitalize">{s.paymentMethod}</span>
                        <span>•</span>
                        <span>{isSameDate(s.date, todayStr) ? (s.time || 'Today') : `${formatDate(s.date)}${s.time ? ` ${s.time}` : ''}`}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span
                        className={`text-xs font-extrabold ${
                          s.paymentMethod === 'credit' && !s.creditPaid
                            ? 'text-amber-500 dark:text-amber-400'
                            : 'text-emerald-555 dark:text-emerald-400'
                        }`}
                      >
                        {settings.currency || 'Rs.'}{formatCurrency(s.total)}
                      </span>
                      {s.paymentMethod === 'credit' && (
                        <span
                          className={`text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full mt-0.5 ${
                            s.creditPaid
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-455 border border-emerald-500/10'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-455 border border-amber-500/10'
                          }`}
                        >
                          {s.creditPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-8 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
                  <span className="text-2xl">🧾</span>
                  <h3 className="font-extrabold text-slate-500 dark:text-slate-400 text-xs mt-2 uppercase tracking-wider">
                    No sales recorded today
                  </h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                    Navigate to "New Sale" to scan items and begin invoice checkout.
                  </p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const visibleCount = widgets.filter((w) => w.visible).length;

  return (
    <div className="flex flex-col gap-4 animate-fade-in-up">
      {/* Render All Ordered Dashboard Widgets */}
      {widgets.map((widget) => renderWidget(widget))}

      {/* If all widgets are hidden */}
      {visibleCount === 0 && (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-6 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 flex items-center justify-center mx-auto">
            <LayoutGrid className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-wide">
            All Dashboard Widgets Are Hidden
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto">
            You have hidden all dashboard widgets. You can configure widget visibility and order in Settings → Dashboard Layout.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('settings')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-md"
          >
            Configure in Settings
          </button>
        </div>
      )}
    </div>
  );
};
