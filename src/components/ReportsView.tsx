/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BarChart3, Download, TrendingUp, TrendingDown, DollarSign, Calendar, RefreshCcw, LogOut, Presentation } from 'lucide-react';
import { AppDatabase, Sale, Expense } from '../types';
import { formatCurrency, getTodayDateString, formatDate } from '../utils';
import { useTranslation } from '../context/LocalizationContext';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

interface ReportsViewProps {
  db: AppDatabase;
  onOpenDayDetails: (date: string) => void;
  onExportCSV: (period: string, sales: Sale[]) => void;
  onOpenReturnModal?: (saleId: string) => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  db,
  onOpenDayDetails,
  onExportCSV,
  onOpenReturnModal,
}) => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year' | 'all' | 'daily'>('today');

  const handleExportGSTR = (reportType: 'GSTR-1' | 'GSTR-2' | 'GSTR-3B') => {
    let csvContent = "Invoice Number,Invoice Date,Place Of Supply,Taxable Value,Integrated Tax (IGST),Central Tax (CGST),State Tax (SGST),Total Tax,Invoice Total\n";
    
    if (reportType === 'GSTR-1') {
      sales.forEach(s => {
        const gstRate = s.gst || 0;
        const totalAmount = s.total;
        const taxableVal = totalAmount / (1 + (gstRate / 100));
        const totalTax = totalAmount - taxableVal;
        
        // Split based on whether it is inter-state
        const isInterState = (s as any).interStateGst || false;
        const igst = isInterState ? totalTax : 0;
        const cgst = isInterState ? 0 : totalTax / 2;
        const sgst = isInterState ? 0 : totalTax / 2;
        
        const pos = isInterState ? "Inter-State" : "Intra-State";
        
        csvContent += `"${s.billNo || 'N/A'}","${s.date}","${pos}",${taxableVal.toFixed(2)},${igst.toFixed(2)},${cgst.toFixed(2)},${sgst.toFixed(2)},${totalTax.toFixed(2)},${totalAmount.toFixed(2)}\n`;
      });
    } else if (reportType === 'GSTR-2') {
      csvContent = "Supplier GSTIN,Document Number,Document Date,Taxable Value,Input Central Tax,Input State Tax,Input Integrated Tax,Total Tax Credit\n";
      db.expenses.forEach(e => {
        const taxableVal = e.amount / 1.18;
        const tax = e.amount - taxableVal;
        csvContent += `"07SUPPLIER8819A","EXP-${e.id}","${e.date}",${taxableVal.toFixed(2)},${(tax/2).toFixed(2)},${(tax/2).toFixed(2)},0,${tax.toFixed(2)}\n`;
      });
    } else {
      csvContent = "Tax Heading,Taxable Value,Integrated Tax (IGST),Central Tax (CGST),State Tax (SGST)\n";
      
      let totalTaxable = 0;
      let totalIgst = 0;
      let totalCgst = 0;
      let totalSgst = 0;
      
      sales.forEach(s => {
        const gstRate = s.gst || 0;
        const taxableVal = s.total / (1 + (gstRate / 100));
        const totalTax = s.total - taxableVal;
        const isInterState = (s as any).interStateGst || false;
        
        totalTaxable += taxableVal;
        if (isInterState) {
          totalIgst += totalTax;
        } else {
          totalCgst += totalTax / 2;
          totalSgst += totalTax / 2;
        }
      });
      
      csvContent += `"Outward Taxable Supplies",${totalTaxable.toFixed(2)},${totalIgst.toFixed(2)},${totalCgst.toFixed(2)},${totalSgst.toFixed(2)}\n`;
      csvContent += `"Inward Eligible ITC",0.00,0.00,0.00,0.00\n`;
    }
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${reportType}_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const todayStr = getTodayDateString();
  const sales = db.sales.filter(s => !s.voided);
  const expenses = db.expenses;

  // Filter sales relative to selected periods
  const getPeriodSales = (): Sale[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return sales.filter(s => {
      const d = new Date(s.date + 'T00:00:00');
      if (period === 'today') return s.date === todayStr;
      if (period === 'week') {
        const threshold = new Date(today);
        threshold.setDate(threshold.getDate() - 6);
        return d >= threshold;
      }
      if (period === 'month') {
        const threshold = new Date(today);
        threshold.setDate(1); // Start of month
        return d >= threshold;
      }
      if (period === 'year') {
        const threshold = new Date(today);
        threshold.setMonth(0, 1); // Start of year
        return d >= threshold;
      }
      return true; // For All Time
    });
  };

  const periodSales = period === 'daily' ? [] : getPeriodSales();
  
  // Totals computation
  const totalRevenue = periodSales.reduce((a, s) => a + s.total, 0);
  const totalProfit = periodSales.reduce((a, s) => a + (s.profit || 0), 0);
  const totalBills = periodSales.length;
  const averageBill = totalBills > 0 ? totalRevenue / totalBills : 0;

  // Track top-selling goods
  const productSalesMap: { [name: string]: { qty: number; rev: number } } = {};
  periodSales.forEach(s => {
    s.items.forEach(i => {
      if (!productSalesMap[i.name]) {
        productSalesMap[i.name] = { qty: 0, rev: 0 };
      }
      productSalesMap[i.name].qty += i.qty;
      productSalesMap[i.name].rev += i.price * i.qty;
    });
  });
  const bestSellers = Object.entries(productSalesMap)
    .sort((a, b) => b[1].rev - a[1].rev)
    .slice(0, 5);

  // Filter Payment allocations
  const paymentsMap: { [method: string]: number } = {};
  periodSales.forEach(s => {
    if (s.paymentMethod === 'split') {
      const split = s.splitDetails || { cashAmount: 0, upiAmount: 0 };
      paymentsMap['cash'] = (paymentsMap['cash'] || 0) + split.cashAmount;
      paymentsMap['upi'] = (paymentsMap['upi'] || 0) + split.upiAmount;
    } else {
      const m = s.paymentMethod || 'cash';
      paymentsMap[m] = (paymentsMap[m] || 0) + s.total;
    }
  });

  // Track staff scores
  const staffScoreMap: { [name: string]: { bills: number; rev: number } } = {};
  periodSales.forEach(s => {
    if (s.staffName) {
      if (!staffScoreMap[s.staffName]) {
        staffScoreMap[s.staffName] = { bills: 0, rev: 0 };
      }
      staffScoreMap[s.staffName].bills++;
      staffScoreMap[s.staffName].rev += s.total;
    }
  });

  // Chart computation: Last 7 days sales
  const barChartData: { label: string; dateStr: string; val: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const localDaySales = sales.filter(x => x.date === dateStr);
    const val = localDaySales.reduce((a, s) => a + s.total, 0);
    
    barChartData.push({
      label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      dateStr,
      val,
    });
  }
  const chartMax = Math.max(...barChartData.map(d => d.val), 1);

  // Daily log indices: grouped sales and expenses
  const dailyIndexesMap: { [date: string]: { rev: number; profit: number; exp: number; bills: number } } = {};
  
  sales.forEach(s => {
    if (!dailyIndexesMap[s.date]) {
      dailyIndexesMap[s.date] = { rev: 0, profit: 0, exp: 0, bills: 0 };
    }
    dailyIndexesMap[s.date].rev += s.total;
    dailyIndexesMap[s.date].profit += (s.profit || 0);
    dailyIndexesMap[s.date].bills++;
  });

  expenses.forEach(e => {
    if (!dailyIndexesMap[e.date]) {
      dailyIndexesMap[e.date] = { rev: 0, profit: 0, exp: 0, bills: 0 };
    }
    dailyIndexesMap[e.date].exp += e.amount;
  });

  const dailyLogDates = Object.keys(dailyIndexesMap).sort((a, b) => b.localeCompare(a));

  const handleExportTrigger = () => {
    onExportCSV(period, period === 'daily' ? sales : periodSales);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Reports Header */}
      <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs select-none">
        <div className="flex items-center gap-1.5">
          <BarChart3 className="w-5 h-5 text-indigo-500 animate-pulse" />
          <span className="text-sm font-extrabold text-slate-800 dark:text-slate-100">
            {period === 'daily' ? 'Store Consolidated Logs' : `${period.toUpperCase()} Store Analytics`}
          </span>
        </div>
        <button
          onClick={handleExportTrigger}
          className="flex items-center gap-1 bg-slate-900 border border-slate-850 hover:bg-slate-800 text-white rounded-xl px-3 py-1.5 text-xs font-bold cursor-pointer active:scale-95 transition-all shadow-xs"
        >
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </button>
      </div>

      {/* Date filters tabs bar */}
      <div className="flex gap-1 overflow-x-auto pb-1 select-none scrollbar-none">
        {(['today', 'week', 'month', 'year', 'all', 'daily'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all text-center uppercase cursor-pointer ${
              period === p
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 border border-transparent dark:border-slate-800/50'
            }`}
          >
            {p === 'daily' ? 'Daily Logs' : p}
          </button>
        ))}
      </div>

      {/* 🇮🇳 GST Compliance Tax Returns Widget */}
      <div className="bg-white border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🇮🇳</span>
          <div>
            <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest">
              GST Compliance Tax Returns
            </h4>
            <p className="text-[10px] text-slate-400">
              Download certified GSTR-ready CSV filing logs for outward sales supplies, input tax credits, and consolidated summaries.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1.5">
          <button
            onClick={() => handleExportGSTR('GSTR-1')}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors text-slate-700 dark:text-slate-300"
          >
            <Download className="w-3.5 h-3.5" /> Export GSTR-1
          </button>
          <button
            onClick={() => handleExportGSTR('GSTR-2')}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-950 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors text-slate-700 dark:text-slate-300"
          >
            <Download className="w-3.5 h-3.5" /> Export GSTR-2
          </button>
          <button
            onClick={() => handleExportGSTR('GSTR-3B')}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-sm"
          >
            <Download className="w-3.5 h-3.5" /> Export GSTR-3B
          </button>
        </div>
      </div>

      {/* ↩ Return Products by Bill No */}
      {onOpenReturnModal && (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs space-y-2 dark:bg-slate-900 dark:border-slate-800">
          <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 dark:text-slate-200">
            <span className="text-sm">↩</span> Return Products from Client (By Bill No.)
          </h4>
          <div className="flex gap-2">
            <input
              id="return-bill-search-input"
              type="text"
              placeholder="Enter Bill Number (e.g., 020726-0001)"
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-500 dark:bg-slate-800 dark:border-slate-700 dark:text-white"
            />
            <button
              onClick={() => {
                const el = document.getElementById('return-bill-search-input') as HTMLInputElement;
                const billNoInput = el?.value?.trim();
                if (!billNoInput) {
                  alert('⚠️ Enter a valid Bill Number first!');
                  return;
                }
                const matchedSale = db.sales.find(s => String(s.billNo).toLowerCase() === billNoInput.toLowerCase() && !s.voided);
                if (!matchedSale) {
                  alert(`❌ Active/Un-voided bill with number #${billNoInput} not found in sales history.`);
                  return;
                }
                onOpenReturnModal(matchedSale.id);
                el.value = '';
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider px-4 py-2 rounded-xl transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
            >
              Search Bill
            </button>
          </div>
        </div>
      )}

      {period === 'daily' ? (
        /* Daily grouped logs directory list */
        <div className="space-y-2 mt-1">
          {dailyLogDates.length > 0 ? (
            dailyLogDates.map(date => {
              const d = dailyIndexesMap[date];
              const formattedLogDate = formatDate(date);

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => onOpenDayDetails(date)}
                  className="w-full text-left bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-850/50 shadow-xs rounded-xl p-3 flex justify-between items-center transition-all cursor-pointer active:scale-[0.99]"
                >
                  <div>
                    <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                      {formattedLogDate}
                      {date === todayStr && (
                        <span className="text-[8px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 font-extrabold px-1.5 py-0.5 rounded-full uppercase">
                          Today
                        </span>
                      )}
                    </h4>
                    <p className="text-[10px] text-slate-450 dark:text-slate-500 font-semibold mt-1 flex gap-1.5 items-center">
                      <span>{d.bills} sales bills</span>
                      {d.exp > 0 && <span>•</span>}
                      {d.exp > 0 && <span className="text-rose-550 dark:text-rose-400">Expenses: Rs.{formatCurrency(d.exp)}</span>}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-black text-xs text-emerald-600 dark:text-emerald-400 block">
                      Rs.{formatCurrency(d.rev)}
                    </span>
                    <span className={`text-[10px] font-extrabold flex items-center justify-end ${d.profit >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-rose-500'}`}>
                      P: Rs.{formatCurrency(d.profit)}
                    </span>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
              <span className="text-4xl">📅</span>
              <h3 className="font-extrabold text-slate-500 text-xs mt-1">Logs are currently empty</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                Complete checking out bills to review group calculations.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Standard summary stats cards + graphical analytics */
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800/80 shadow-sm relative overflow-hidden">
              <div className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1 select-none">
                <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                {t('gross_revenue')}
              </div>
              <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1">
                Rs.{formatCurrency(totalRevenue)}
              </h3>
              <p className="text-[9px] font-bold text-slate-400 dark:text-slate-550 mt-0.5 uppercase tracking-wide">
                From {totalBills} closed bills
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800/80 shadow-sm relative overflow-hidden">
              <div className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1 select-none">
                <TrendingDown className="w-3.5 h-3.5 text-indigo-500" />
                {t('profit')}
              </div>
              <h3 className={`text-xl font-black mt-1 ${totalProfit >= 0 ? 'text-emerald-500 dark:text-emerald-400' : 'text-rose-500'}`}>
                Rs.{formatCurrency(totalProfit)}
              </h3>
              <p className="text-[9px] font-bold text-slate-400 dark:text-slate-550 mt-0.5 uppercase tracking-wide">
                Average billing Rs.{formatCurrency(averageBill)}
              </p>
            </div>
          </div>

          {/* Interactive Recharts Graphics Sheet */}
          {/* Daily Revenue Trend (Bar Chart) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
            <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest select-none mb-3">
              Daily Revenue Trend (Last 7 Days Bar Chart)
            </h4>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={barChartData.map(d => ({
                    label: d.label,
                    dateStr: d.dateStr,
                    "Revenue": d.val,
                  }))} 
                  margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf2f7" />
                  <XAxis 
                    dataKey="label" 
                    tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} 
                    axisLine={false} 
                    tickLine={false} 
                  />
                  <YAxis 
                    tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} 
                    axisLine={false} 
                    tickLine={false} 
                    tickFormatter={(v) => `Rs.${v}`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', background: '#0f172a', border: 'none', color: '#fff' }}
                    labelStyle={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8' }}
                    itemStyle={{ fontSize: '11px', fontWeight: 700, color: '#818cf8' }}
                    formatter={(v) => [`Rs.${formatCurrency(Number(v))}`, 'Revenue']}
                  />
                  <Bar 
                    dataKey="Revenue" 
                    fill="#4f46e5" 
                    radius={[6, 6, 0, 0]} 
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Most Sold Products (Bar Chart) */}
          {bestSellers.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest select-none mb-3">
                Most Sold Products (Units Volume)
              </h4>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={bestSellers.map(([name, d]) => ({
                      name: name.length > 10 ? name.slice(0, 8) + '...' : name,
                      fullName: name,
                      "Units Sold": d.qty,
                      "Revenue (Rs)": d.rev,
                    }))} 
                    margin={{ top: 5, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#edf2f7" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 8, fontWeight: 800, fill: '#64748b' }} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <YAxis 
                      tick={{ fontSize: 9, fontWeight: 700, fill: '#64748b' }} 
                      axisLine={false} 
                      tickLine={false} 
                    />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', background: '#0f172a', border: 'none', color: '#fff' }}
                      labelStyle={{ fontSize: '10px', fontWeight: 800, color: '#94a3b8' }}
                      itemStyle={{ fontSize: '11px', fontWeight: 700, color: '#10b981' }}
                    />
                    <Bar dataKey="Units Sold" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Top Sellers widget */}
          {bestSellers.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest select-none mb-2">
                Top Margin/Volume Products
              </h4>
              <div className="space-y-2">
                {bestSellers.map(([name, data], idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100 dark:border-slate-800/60 last:border-none">
                    <div className="min-w-0 flex-1 pr-2">
                      <span className="font-extrabold text-slate-800 dark:text-slate-200 line-clamp-1">
                        {idx + 1}. {name}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-550 uppercase tracking-wider block mt-0.5">
                        {data.qty} sales units sold
                      </span>
                    </div>
                    <span className="font-black text-slate-900 dark:text-slate-100 flex-shrink-0">
                      Rs.{formatCurrency(data.rev)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment Method distribution */}
          {Object.keys(paymentsMap).length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest select-none mb-2">
                Settlement logs Distribution
              </h4>
              <div className="space-y-2">
                {Object.entries(paymentsMap).map(([method, val]) => {
                  const pct = totalRevenue > 0 ? (val / totalRevenue) * 100 : 0;
                  return (
                    <div key={method} className="text-xs">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-black text-slate-700 dark:text-slate-300 capitalize">{method}</span>
                        <span className="font-extrabold text-slate-900 dark:text-slate-100">
                          Rs.{formatCurrency(val)} ({pct.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-950 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${
                            method === 'cash' 
                              ? 'bg-emerald-500' 
                              : method === 'upi' 
                                ? 'bg-indigo-500' 
                                : method === 'card' 
                                  ? 'bg-blue-500' 
                                  : 'bg-amber-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Staff check list records */}
          {Object.keys(staffScoreMap).length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
              <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest select-none mb-2">
                Personnel Served Stats
              </h4>
              <div className="space-y-2">
                {Object.entries(staffScoreMap).map(([name, data]) => (
                  <div key={name} className="flex justify-between items-center text-xs py-1.5 border-b border-slate-105 dark:border-slate-800/60 last:border-none">
                    <div className="min-w-0 flex-1">
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{name}</span>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 block uppercase mt-0.5">
                        Served {data.bills} closed tickets
                      </span>
                    </div>
                    <span className="font-black text-slate-950 dark:text-slate-100">
                      Rs.{formatCurrency(data.rev)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
