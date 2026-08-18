/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Home, Bell, LogOut, ShoppingCart, History, Users, ArrowUpRight, TrendingUp, AlertCircle, Calendar, Sparkles } from 'lucide-react';
import { AppDatabase, Sale } from '../types';
import { formatCurrency, computePredictiveAlerts } from '../utils';
import { useTranslation } from '../context/LocalizationContext';

interface DashboardViewProps {
  db: AppDatabase;
  onNavigate: (tab: string) => void;
  onOpenAlerts: () => void;
  onOpenHistory: () => void;
  onOpenBillDetails: (saleId: string) => void;
  onLogout: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  db,
  onNavigate,
  onOpenAlerts,
  onOpenHistory,
  onOpenBillDetails,
  onLogout,
}) => {
  const { t } = useTranslation();
  const settings = db.settings;
  const todayStr = new Date().toISOString().split('T')[0];
  
  // Filter sales for today
  const todaySales = db.sales.filter(s => s.date === todayStr && !s.voided);
  const totalRevenue = todaySales.reduce((sum, s) => sum + s.total, 0);
  const totalProfit = todaySales.reduce((sum, s) => sum + (s.profit || 0), 0);
  
  // Today's expenses
  const todayExpenses = db.expenses
    .filter(e => e.date === todayStr)
    .reduce((sum, e) => sum + e.amount, 0);

  // Outstanding credit balance calculations
  const creditBills = db.sales.filter(s => s.paymentMethod === 'credit' && !s.creditPaid && !s.voided);
  const outstandingCredit = creditBills.reduce((sum, s) => sum + s.total, 0);
  const pendingCreditsCount = creditBills.length;

  // Alerts
  const lowStockThreshold = db.settings.lowStockDefault || 10;
  const expiryThreshold = db.settings.nearExpiryDefault || 30;
  const today = new Date();
  
  const predictiveAlerts = computePredictiveAlerts(db.products, db.sales);

  const alertsCount = db.products.reduce((count, p) => {
    // Check low stock
    const limit = p.lowStockAlert !== null ? p.lowStockAlert : lowStockThreshold;
    let flagged = false;
    if (p.qty <= limit) {
      count++;
      flagged = true;
    }
    
    // Check expiry
    if (p.expiryDate) {
      const days = Math.ceil((new Date(p.expiryDate).getTime() - today.getTime()) / 86400000);
      const alertDays = p.nearExpiryDays !== null ? p.nearExpiryDays : expiryThreshold;
      if (days <= alertDays) {
        if (!flagged) count++;
      }
    }
    return count;
  }, 0) + predictiveAlerts.filter(pa => {
    const p = db.products.find(prod => prod.id === pa.id);
    if (!p) return false;
    const limit = p.lowStockAlert !== null ? p.lowStockAlert : lowStockThreshold;
    return p.qty > limit;
  }).length;

  // Recent 5 bills
  const recentBills = [...db.sales]
    .filter(s => !s.voided)
    .reverse()
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-4 animate-fade-in-up">
      {/* Notifications Warning Bars */}
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

      {/* Revenue Stats Grid */}
      <div className="grid grid-cols-2 gap-3.5">
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.02)] relative overflow-hidden group hover:border-slate-200 dark:hover:border-slate-700 transition-all">
          <div className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5 select-none">
            <TrendingUp className="w-3 h-3 text-emerald-500" />
            {t('sales_summary')}
          </div>
          <h3 className="text-base font-black text-slate-900 dark:text-slate-100 mt-1 tracking-tight">
            {settings.currency || 'Rs.'}{formatCurrency(totalRevenue)}
          </h3>
          <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
            {todaySales.length} billing sales today
          </p>
          <div className="absolute right-3 bottom-3 text-2xl opacity-15 dark:opacity-10 group-hover:scale-110 transition-transform duration-300 pointer-events-none select-none">💵</div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.02)] relative overflow-hidden group hover:border-slate-200 dark:hover:border-slate-700 transition-all">
          <div className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5 select-none">
            <Home className="w-3 h-3 text-indigo-500" />
            {t('profit')}
          </div>
          <h3 className={`text-base font-black mt-1 tracking-tight ${totalProfit >= 0 ? 'text-emerald-555 dark:text-emerald-400' : 'text-rose-500'}`}>
            {settings.currency || 'Rs.'}{formatCurrency(totalProfit)}
          </h3>
          {todayExpenses > 0 ? (
            <p className="text-[9px] font-bold text-rose-500 dark:text-rose-400 mt-0.5">
              Reflecting {settings.currency || 'Rs.'}{formatCurrency(todayExpenses)} expenses
            </p>
          ) : (
            <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
              Net balance today
            </p>
          )}
          <div className="absolute right-3 bottom-3 text-2xl opacity-15 dark:opacity-10 group-hover:scale-110 transition-transform duration-300 pointer-events-none select-none">📈</div>
        </div>
      </div>

      {/* Primary Shortcut Triggers Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <button
          type="button"
          onClick={() => onNavigate('billing')}
          className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-100 dark:border-slate-800/80 rounded-2xl py-3 px-1.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all text-center shadow-2xs"
        >
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <ShoppingCart className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 tracking-tight">New sale</span>
        </button>

        <button
          type="button"
          onClick={onOpenHistory}
          className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-100 dark:border-slate-800/80 rounded-2xl py-3 px-1.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all text-center shadow-2xs"
        >
          <div className="w-8 h-8 rounded-xl bg-slate-500/10 dark:bg-slate-500/20 text-slate-600 dark:text-slate-300 flex items-center justify-center">
            <History className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 tracking-tight">Bill history</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigate('customers')}
          className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 border border-slate-100 dark:border-slate-800/80 rounded-2xl py-3 px-1.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition-all text-center shadow-2xs"
        >
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 tracking-tight">Customers</span>
        </button>
      </div>

      {/* 🔮 PREDICTIVE STOCKOUT FORECASTING SECTION */}
      {predictiveAlerts.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.02)]">
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
            {predictiveAlerts.slice(0, 3).map(pa => (
              <div key={pa.id} className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/60 rounded-2xl p-3 flex flex-col justify-between hover:border-indigo-500/20 hover:bg-slate-50/80 dark:hover:bg-slate-950/60 transition-all shadow-2xs">
                <div className="flex justify-between items-start gap-2">
                  <span className="text-xs font-extrabold text-slate-800 dark:text-slate-100 line-clamp-1 leading-tight">
                    {pa.name}
                  </span>
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full select-none flex-shrink-0 tracking-wider ${
                    pa.daysToStockout <= 2 ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20' : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20'
                  }`}>
                    {pa.daysToStockout <= 1 ? '⚠️ Out tomorrow' : `Stockout in ${pa.daysToStockout.toFixed(1)} days`}
                  </span>
                </div>

                <div className="text-[9px] text-slate-400 dark:text-slate-500 font-bold mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 uppercase tracking-wider">
                  <span>Stock: <strong className="text-slate-700 dark:text-slate-300 font-extrabold">{pa.qty} units</strong></span>
                  <span>•</span>
                  <span>Velocity: <strong className="text-slate-700 dark:text-slate-300 font-extrabold">{pa.velocity.toFixed(2)} / day</strong></span>
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
      )}

      {/* Recent Ledger Transactions */}
      <div>
        <div className="flex justify-between items-center mb-2 select-none pt-2">
          <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            {t('recent_sales')}
          </span>
          <button
            onClick={onOpenHistory}
            className="text-[9px] font-black text-indigo-650 hover:text-indigo-500 dark:text-indigo-400 uppercase tracking-widest"
          >
            See All Transactions →
          </button>
        </div>

        <div className="space-y-1.5">
          {recentBills.length > 0 ? (
            recentBills.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => onOpenBillDetails(s.id)}
                className="w-full text-left bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-850 hover:border-slate-200 dark:hover:border-slate-700 shadow-2xs rounded-2xl p-3 flex justify-between items-center transition-all cursor-pointer active:scale-[0.995]"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="font-bold text-xs text-slate-850 dark:text-slate-200 flex items-center gap-1.5">
                    <span className="text-slate-900 dark:text-slate-100 font-extrabold">Invoice #{s.billNo}</span>
                    <span className="text-slate-300 dark:text-slate-700 font-medium">•</span>
                    <span className="truncate text-slate-550 dark:text-slate-400 font-semibold">{s.customer || 'Walk-in Client'}</span>
                  </div>
                  <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1.5 uppercase tracking-wider">
                    <span>{s.items.length} units</span>
                    <span>•</span>
                    <span>{s.paymentMethod}</span>
                    <span>•</span>
                    <span>{s.time}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className={`text-xs font-extrabold ${s.paymentMethod === 'credit' && !s.creditPaid ? 'text-amber-500 dark:text-amber-400' : 'text-emerald-555 dark:text-emerald-400'}`}>
                    {settings.currency || 'Rs.'}{formatCurrency(s.total)}
                  </span>
                  {s.paymentMethod === 'credit' && (
                    <span className={`text-[7.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full mt-0.5 ${s.creditPaid ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-455 border border-emerald-500/10' : 'bg-amber-500/10 text-amber-600 dark:text-amber-455 border border-amber-500/10'}`}>
                      {s.creditPaid ? 'Paid' : 'Unpaid'}
                    </span>
                  )}
                </div>
              </button>
            ))
          ) : (
            <div className="text-center py-10 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <span className="text-2xl">🧾</span>
              <h3 className="font-extrabold text-slate-500 dark:text-slate-400 text-xs mt-2 uppercase tracking-wider">No sales recorded today</h3>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                Navigate to "New Sale" to scan items and begin invoice checkout.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
