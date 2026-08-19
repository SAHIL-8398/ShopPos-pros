/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { Product, Sale } from '../types';
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

interface ProductTrendChartProps {
  product: Product;
  sales?: Sale[];
}

interface DayTrendPoint {
  dayLabel: string;
  dateStr: string;
  qty: number;
  sold: number;
}

export const ProductTrendChart: React.FC<ProductTrendChartProps> = ({ product, sales = [] }) => {
  const { trendData, totalSold7d, netChange } = useMemo(() => {
    const today = new Date();
    const days: DayTrendPoint[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Map sales by date for this product
    const salesByDate = new Map<string, number>();
    sales.forEach(sale => {
      if (!sale.date) return;
      const saleDate = sale.date.slice(0, 10);
      
      let itemSold = 0;
      sale.items.forEach(item => {
        const isMatch = 
          (item.id && product.id && item.id === product.id) ||
          (item.name && product.name && item.name.trim().toLowerCase() === product.name.trim().toLowerCase()) ||
          (product.barcode && (item as any).barcode && (item as any).barcode.trim() === product.barcode.trim());
        
        if (isMatch) {
          itemSold += (item.qty || 0) - (item.returnedQty || 0);
        }
      });

      if (itemSold > 0) {
        salesByDate.set(saleDate, (salesByDate.get(saleDate) || 0) + itemSold);
      }
    });

    // Build last 7 days array (from 6 days ago to today)
    const dailySold: number[] = [];
    const dateStrings: string[] = [];
    const labels: string[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const isoDate = d.toISOString().slice(0, 10);
      dateStrings.push(isoDate);

      const label = i === 0 ? 'Today' : (i === 1 ? 'Yest' : dayNames[d.getDay()]);
      labels.push(label);

      const sold = salesByDate.get(isoDate) || 0;
      dailySold.push(sold);
    }

    // Current stock today is product.qty
    const currentStock = Math.max(0, product.qty || 0);
    const calculatedQtys: number[] = new Array(7);
    calculatedQtys[6] = currentStock;

    // Work backwards to reconstruct stock level before daily sales
    for (let i = 5; i >= 0; i--) {
      const soldNextDay = dailySold[i + 1];
      calculatedQtys[i] = calculatedQtys[i + 1] + soldNextDay;
    }

    let totalSold = 0;
    for (let i = 0; i < 7; i++) {
      totalSold += dailySold[i];
      days.push({
        dayLabel: labels[i],
        dateStr: dateStrings[i],
        qty: Math.max(0, calculatedQtys[i]),
        sold: dailySold[i]
      });
    }

    const startStock = calculatedQtys[0];
    const change = currentStock - startStock;

    return { trendData: days, totalSold7d: totalSold, netChange: change };
  }, [product, sales]);

  const chartColor = useMemo(() => {
    if (product.qty <= 0) return '#f43f5e'; // rose-500
    if (product.lowStockAlert !== null && product.qty <= product.lowStockAlert) return '#f59e0b'; // amber-500
    if (totalSold7d > 0) return '#6366f1'; // indigo-500
    return '#10b981'; // emerald-500
  }, [product, totalSold7d]);

  const gradientId = `trend-grad-${product.id.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  return (
    <div 
      className="w-full bg-slate-50/70 dark:bg-slate-950/50 rounded-xl p-2.5 border border-slate-150 dark:border-slate-800/80 mt-2 text-xs select-none"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-1.5 px-0.5">
        <div className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-wider">
            7-Day Movement Trend
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {totalSold7d > 0 ? (
            <span className="text-[9px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 px-2 py-0.5 rounded-full flex items-center gap-1">
              <TrendingDown className="w-3 h-3 text-indigo-500" />
              <span>{totalSold7d} sold (7d)</span>
            </span>
          ) : (
            <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Minus className="w-2.5 h-2.5" />
              <span>Steady Stock</span>
            </span>
          )}

          <span className="text-[9px] font-mono text-slate-400">
            {netChange < 0 ? `${netChange} ${product.unit || 'pcs'}` : `${product.qty} ${product.unit || 'pcs'}`}
          </span>
        </div>
      </div>

      <div className="h-16 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={trendData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.4} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <XAxis 
              dataKey="dayLabel" 
              tickLine={false} 
              axisLine={false} 
              interval={0}
              tick={{ fontSize: 8, fill: '#94a3b8', fontWeight: 700 }}
            />

            <YAxis hide domain={['dataMin - 1', 'dataMax + 1']} />

            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as DayTrendPoint;
                  return (
                    <div className="bg-slate-900 text-white text-[10px] rounded-lg p-2 shadow-xl border border-slate-700 font-sans space-y-0.5">
                      <div className="font-bold text-slate-300">{data.dayLabel} ({data.dateStr})</div>
                      <div className="flex items-center justify-between gap-3 text-indigo-300">
                        <span>Stock Level:</span>
                        <strong className="text-white font-mono">{data.qty} {product.unit || 'pcs'}</strong>
                      </div>
                      {data.sold > 0 && (
                        <div className="flex items-center justify-between gap-3 text-amber-300">
                          <span>Sold:</span>
                          <strong className="text-white font-mono">-{data.sold} {product.unit || 'pcs'}</strong>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />

            <Area
              type="monotone"
              dataKey="qty"
              stroke={chartColor}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#${gradientId})`}
              dot={{ r: 2, fill: chartColor, strokeWidth: 0 }}
              activeDot={{ r: 4, fill: '#ffffff', stroke: chartColor, strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
