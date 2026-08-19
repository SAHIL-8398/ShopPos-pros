/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { BarChart3, TrendingUp, DollarSign, Receipt, Sparkles } from 'lucide-react';
import { Sale, Expense } from '../types';
import { formatCurrency, getDateString, isSameDate, computeSaleProfit } from '../utils';

interface DailySalesChartProps {
  sales: Sale[];
  expenses: Expense[];
  currency?: string;
  onNavigate?: (tab: string) => void;
}

export const DailySalesChart: React.FC<DailySalesChartProps> = ({
  sales,
  expenses,
  currency = 'Rs.',
  onNavigate,
}) => {
  const [metric, setMetric] = useState<'revenue' | 'profit' | 'bills'>('revenue');
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');

  // Compute last 7 days metrics
  const chartData = useMemo(() => {
    const data = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = getDateString(d);
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNum = d.getDate();

      const daySales = sales.filter((s) => isSameDate(s.date, dateStr) && !s.voided);
      const dayExpenses = expenses.filter((e) => isSameDate(e.date, dateStr));

      const revenue = daySales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
      const profit = daySales.reduce((sum, s) => sum + computeSaleProfit(s), 0);
      const expenseTotal = dayExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
      const bills = daySales.length;

      data.push({
        date: dateStr,
        day: dayName,
        label: `${dayName} ${dayNum}`,
        revenue: Math.round(revenue),
        profit: Math.round(profit),
        netProfit: Math.round(profit - expenseTotal),
        bills,
      });
    }
    return data;
  }, [sales, expenses]);

  // Aggregate stats
  const total7DayRevenue = useMemo(
    () => chartData.reduce((sum, d) => sum + d.revenue, 0),
    [chartData]
  );
  const total7DayBills = useMemo(
    () => chartData.reduce((sum, d) => sum + d.bills, 0),
    [chartData]
  );
  const avgDailyRevenue = useMemo(
    () => Math.round(total7DayRevenue / 7),
    [total7DayRevenue]
  );

  const bestDay = useMemo(() => {
    let max = chartData[0];
    for (const d of chartData) {
      if (d.revenue > (max?.revenue || 0)) {
        max = d;
      }
    }
    return max;
  }, [chartData]);

  const activeColor =
    metric === 'revenue'
      ? '#6366f1' // indigo
      : metric === 'profit'
      ? '#10b981' // emerald
      : '#f59e0b'; // amber

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80 shadow-[0_1px_3px_rgba(0,0,0,0.02),0_4px_12px_rgba(0,0,0,0.02)] space-y-3.5">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <span>Daily Sales Performance</span>
              <span className="text-[8.5px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold px-1.5 py-0.2 rounded-md">
                7 Days
              </span>
            </h4>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
              Daily revenue, net margin, and invoice volumes
            </p>
          </div>
        </div>

        {/* Metric Selector Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-0.5 rounded-xl self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMetric('revenue')}
            className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              metric === 'revenue'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Revenue
          </button>
          <button
            type="button"
            onClick={() => setMetric('profit')}
            className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              metric === 'profit'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Profit
          </button>
          <button
            type="button"
            onClick={() => setMetric('bills')}
            className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
              metric === 'bills'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            Invoices
          </button>
        </div>
      </div>

      {/* Mini Highlights Row */}
      <div className="grid grid-cols-3 gap-2 py-2 px-2.5 bg-slate-50/70 dark:bg-slate-950/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
        <div>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
            7-Day Total
          </span>
          <span className="text-xs font-black text-slate-800 dark:text-slate-200">
            {currency}
            {formatCurrency(total7DayRevenue)}
          </span>
        </div>
        <div>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
            Avg / Day
          </span>
          <span className="text-xs font-black text-slate-800 dark:text-slate-200">
            {currency}
            {formatCurrency(avgDailyRevenue)}
          </span>
        </div>
        <div>
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">
            Peak Day
          </span>
          <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 truncate block">
            {bestDay ? `${bestDay.day} (${currency}${formatCurrency(bestDay.revenue)})` : 'None'}
          </span>
        </div>
      </div>

      {/* Main Chart Container */}
      <div className="h-44 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'area' ? (
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="dashboardRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={activeColor} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={activeColor} stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.12)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: '#888', fontWeight: 'bold' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: '#888' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (metric === 'bills' ? v : `${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white text-xs p-2.5 rounded-xl shadow-xl border border-slate-800 space-y-1">
                        <div className="font-extrabold text-[11px] text-indigo-300">{d.label}</div>
                        <div className="text-[10px] text-slate-200">
                          Revenue: <strong className="text-white">{currency}{formatCurrency(d.revenue)}</strong>
                        </div>
                        <div className="text-[10px] text-slate-200">
                          Profit: <strong className="text-emerald-400">{currency}{formatCurrency(d.profit)}</strong>
                        </div>
                        <div className="text-[10px] text-slate-200">
                          Invoices: <strong className="text-amber-400">{d.bills}</strong>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey={metric}
                stroke={activeColor}
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#dashboardRevenueGrad)"
              />
            </AreaChart>
          ) : (
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.12)" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 9, fill: '#888', fontWeight: 'bold' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 9, fill: '#888' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (metric === 'bills' ? v : `${v >= 1000 ? `${Math.round(v / 1000)}k` : v}`)}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="bg-slate-900 text-white text-xs p-2.5 rounded-xl shadow-xl border border-slate-800 space-y-1">
                        <div className="font-extrabold text-[11px] text-indigo-300">{d.label}</div>
                        <div className="text-[10px] text-slate-200">
                          Revenue: <strong className="text-white">{currency}{formatCurrency(d.revenue)}</strong>
                        </div>
                        <div className="text-[10px] text-slate-200">
                          Invoices: <strong className="text-amber-400">{d.bills}</strong>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey={metric} fill={activeColor} radius={[6, 6, 0, 0]} />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Footer link to Reports */}
      {onNavigate && (
        <div className="pt-1 border-t border-slate-100 dark:border-slate-800/60 flex justify-between items-center text-[9px] font-bold">
          <div className="flex items-center gap-1.5 text-slate-400">
            <button
              type="button"
              onClick={() => setChartType(chartType === 'area' ? 'bar' : 'area')}
              className="text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 underline cursor-pointer"
            >
              Switch to {chartType === 'area' ? 'Bar Chart' : 'Area Wave'}
            </button>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('reports')}
            className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 uppercase tracking-widest cursor-pointer font-black"
          >
            Detailed Analytics & GSTR →
          </button>
        </div>
      )}
    </div>
  );
};
