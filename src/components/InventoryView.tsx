/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Package, Search, Plus, Calendar, AlertTriangle, BadgePercent, Scan, Download, Upload, ArrowUpDown } from 'lucide-react';
import { Product, Supplier } from '../types';
import { formatCurrency, formatDate } from '../utils';
import { useTranslation } from '../context/LocalizationContext';
import { useDialog } from '../context/DialogContext';

interface InventoryViewProps {
  products: Product[];
  suppliers: Supplier[];
  onOpenProductModal: (productId: string | null) => void;
  onOpenScanner: () => void;
  settings: {
    lowStockDefault: number;
    nearExpiryDefault: number;
  };
  onImportProducts?: (imported: Product[]) => void;
  onBulkUpdateProducts?: (modifiedProducts: Product[]) => void;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  suppliers,
  onOpenProductModal,
  onOpenScanner,
  settings,
  onImportProducts,
  onBulkUpdateProducts,
}) => {
  const { t } = useTranslation();
  const { showAlert } = useDialog();
  const [search, setSearch] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'all' | 'low' | 'exp' | 'xpd'>('all');
  const [showOnlyLowStock, setShowOnlyLowStock] = useState<boolean>(false);

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkAction, setBulkAction] = useState<'category' | 'discount' | null>(null);
  const [bulkCategory, setBulkCategory] = useState<string>('');
  const [bulkDiscountType, setBulkDiscountType] = useState<'percentage' | 'flat'>('percentage');
  const [bulkDiscountValue, setBulkDiscountValue] = useState<number>(0);
  const [sortBy, setSortBy] = useState<'a-z' | 'z-a' | 'expiry' | 'expiry-desc' | 'qty' | 'qty-desc' | 'price-asc' | 'price-desc' | 'default'>('default');

  const today = new Date();
  const lowLimit = settings.lowStockDefault || 10;
  const expLimit = settings.nearExpiryDefault || 30;

  // O(1) supplier lookup map
  const suppliersMap = React.useMemo(() => {
    const map = new Map<string, Supplier>();
    suppliers.forEach(s => map.set(s.id, s));
    return map;
  }, [suppliers]);

  // Filter products by tab and search
  const filteredProducts = products.filter(p => {
    // Search filter
    const qLine = search.toLowerCase().trim();
    if (qLine) {
      const matchSearch =
        p.name.toLowerCase().includes(qLine) ||
        (p.barcode && p.barcode.toLowerCase().includes(qLine)) ||
        (p.category && p.category.toLowerCase().includes(qLine)) ||
        (p.hsn && p.hsn.toLowerCase().includes(qLine));
      if (!matchSearch) return false;
    }

    // Low stock toggle filter override
    if (showOnlyLowStock) {
      const threshold = p.lowStockAlert !== null ? p.lowStockAlert : lowLimit;
      if (p.qty > threshold) return false;
    }

    // Tab filter
    if (filterTab === 'low') {
      const threshold = p.lowStockAlert !== null ? p.lowStockAlert : lowLimit;
      return p.qty <= threshold;
    }
    if (filterTab === 'exp') {
      if (!p.expiryDate) return false;
      const days = Math.ceil((new Date(p.expiryDate).getTime() - today.getTime()) / 86400000);
      const alertDays = p.nearExpiryDays !== null ? p.nearExpiryDays : expLimit;
      return days >= 0 && days <= alertDays;
    }
    if (filterTab === 'xpd') {
      if (!p.expiryDate) return false;
      const expiry = new Date(p.expiryDate);
      expiry.setHours(23, 59, 59, 999);
      return expiry.getTime() < today.getTime();
    }
    return true;
  });

  // Sort products based on sortBy selection
  const sortedAndFilteredProducts = React.useMemo(() => {
    const list = [...filteredProducts];
    if (sortBy === 'a-z') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'z-a') {
      list.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sortBy === 'expiry') {
      list.sort((a, b) => {
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      });
    } else if (sortBy === 'expiry-desc') {
      list.sort((a, b) => {
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime();
      });
    } else if (sortBy === 'qty') {
      list.sort((a, b) => a.qty - b.qty);
    } else if (sortBy === 'qty-desc') {
      list.sort((a, b) => b.qty - a.qty);
    } else if (sortBy === 'price-asc') {
      list.sort((a, b) => (a.sellPrice || a.mrp) - (b.sellPrice || b.mrp));
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => (b.sellPrice || b.mrp) - (a.sellPrice || a.mrp));
    }
    return list;
  }, [filteredProducts, sortBy]);

  // List Virtualization Engine for large inventory datasets (1,000 - 50,000 items)
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [viewportHeight, setViewportHeight] = useState<number>(typeof window !== 'undefined' ? window.innerHeight : 800);
  const ITEM_ESTIMATED_HEIGHT = 126; // Approximate average height of product card in pixels including gap
  const OVERSCAN = 8; // Number of extra cards to render above & below viewport

  React.useEffect(() => {
    let ticking = false;
    const handleScrollOrResize = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrollTop(window.scrollY);
          setViewportHeight(window.innerHeight);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScrollOrResize, { passive: true });
    window.addEventListener('resize', handleScrollOrResize, { passive: true });
    handleScrollOrResize();

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, []);

  // Compute virtual slice indices
  const totalItems = sortedAndFilteredProducts.length;
  const isVirtualizing = totalItems > 40;

  const { startIndex, endIndex, topSpacerHeight, bottomSpacerHeight } = React.useMemo(() => {
    if (!isVirtualizing) {
      return { startIndex: 0, endIndex: totalItems, topSpacerHeight: 0, bottomSpacerHeight: 0 };
    }

    const containerOffsetTop = containerRef.current
      ? containerRef.current.getBoundingClientRect().top + window.scrollY
      : 250;

    const relativeScroll = Math.max(0, scrollTop - containerOffsetTop);
    const visibleStart = Math.floor(relativeScroll / ITEM_ESTIMATED_HEIGHT);
    const visibleEnd = Math.ceil((relativeScroll + viewportHeight) / ITEM_ESTIMATED_HEIGHT);

    const start = Math.max(0, visibleStart - OVERSCAN);
    const end = Math.min(totalItems, visibleEnd + OVERSCAN);

    const topHeight = start * ITEM_ESTIMATED_HEIGHT;
    const bottomHeight = Math.max(0, (totalItems - end) * ITEM_ESTIMATED_HEIGHT);

    return {
      startIndex: start,
      endIndex: end,
      topSpacerHeight: topHeight,
      bottomSpacerHeight: bottomHeight
    };
  }, [isVirtualizing, totalItems, scrollTop, viewportHeight, ITEM_ESTIMATED_HEIGHT, OVERSCAN]);

  const visibleProducts = isVirtualizing
    ? sortedAndFilteredProducts.slice(startIndex, endIndex)
    : sortedAndFilteredProducts;

  return (
    <div className="flex flex-col gap-3">
      {/* Search and Camera scanning quick anchors */}
      <div className="flex gap-2 relative">
        <div className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2.5 flex items-center gap-2 shadow-xs focus-within:border-indigo-500">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={t('search_products')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm bg-transparent border-none outline-none focus:ring-0 text-slate-800"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              Clear
            </button>
          )}
        </div>
        <button
          onClick={onOpenScanner}
          className="px-3 bg-slate-900 border border-slate-850 hover:bg-slate-800 rounded-xl text-white flex items-center justify-center cursor-pointer font-bold active:scale-95 transition-all shadow-xs"
          title="Stock Intake Camera Scanner"
        >
          <Scan className="w-5 h-5" />
        </button>
      </div>

      {/* Standalone Low-stock threshold filter toggle */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl p-3 shadow-xs hover:border-slate-300 transition-colors">
        <div className="flex items-center gap-2.5">
          <input
            type="checkbox"
            id="low-stock-toggle"
            checked={showOnlyLowStock}
            onChange={(e) => setShowOnlyLowStock(e.target.checked)}
            className="w-4.5 h-4.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
          />
          <label htmlFor="low-stock-toggle" className="text-xs font-bold text-slate-700 cursor-pointer select-none flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-bounce" />
            Show only low stock items
          </label>
        </div>
        <span className="text-[10px] bg-amber-50 text-amber-700 font-extrabold px-2 py-0.5 rounded-full uppercase border border-amber-100">
          Threshold Alert
        </span>
      </div>

      {/* Expiry / Low stock categorizations tabs & Bulk Export option */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/60 shadow-xs">
        <div className="flex gap-1 overflow-x-auto pb-1 lg:pb-0 select-none scrollbar-none flex-1">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all duration-150 text-center cursor-pointer ${
              filterTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-transparent text-slate-600 hover:bg-slate-200/50'
            }`}
          >
            All Stock ({products.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('low')}
            className={`px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all duration-150 text-center flex items-center gap-1 cursor-pointer ${
              filterTab === 'low'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-transparent text-amber-650 hover:bg-amber-100/50'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Low Threshold
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('exp')}
            className={`px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all duration-150 text-center flex items-center gap-1 cursor-pointer ${
              filterTab === 'exp'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-transparent text-rose-650 hover:bg-rose-100/50'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            Expiring Soon
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('xpd')}
            className={`px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap transition-all duration-150 text-center flex items-center gap-1 cursor-pointer ${
              filterTab === 'xpd'
                ? 'bg-red-700 text-white shadow-xs'
                : 'bg-transparent text-red-700 hover:bg-red-150/50'
            }`}
          >
            Expired
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 justify-start lg:justify-end">
          <button
            type="button"
            onClick={() => {
              const escaped = (txt: string) => {
                if (!txt) return '';
                return '"' + txt.replace(/"/g, '""') + '"';
              };
              const headers = [
                'Product SKU Barcode',
                'Product Name',
                'Stock Quantity',
                'Unit',
                'Cost Buy Price (Rs)',
                'Selling Price (Rs)',
                'MRP Reference (Rs)',
                'Category Group',
                'Low Stock Alert Threshold',
                'Expiration Date',
                'HSN Tax Reference'
              ];
              const rows = products.map(p => [
                escaped(p.barcode || ''),
                escaped(p.name || ''),
                p.qty || 0,
                escaped(p.unit || 'pcs'),
                p.buyPrice || 0,
                p.sellPrice || p.mrp || 0,
                p.mrp || 0,
                escaped(p.category || 'Other'),
                p.lowStockAlert !== null ? p.lowStockAlert : settings.lowStockDefault,
                p.expiryDate || '',
                escaped(p.hsn || '')
              ]);
              const csvContent = [
                headers.join(','),
                ...rows.map(r => r.join(','))
              ].join('\r\n');

              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.setAttribute('href', url);
              link.setAttribute('download', `shoppos_inventory_audit_${new Date().toISOString().slice(0, 10)}.csv`);
              link.style.visibility = 'hidden';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95 shrink-0 border border-slate-200"
            title="Export total current inventory to CSV"
          >
            <Download className="w-3 h-3 text-slate-500" />
            <span>CSV List</span>
          </button>

          <button
            type="button"
            onClick={() => {
              const dataStr = JSON.stringify(products, null, 2);
              const blob = new Blob([dataStr], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.setAttribute('href', url);
              link.setAttribute('download', `shoppos_inventory_data_backup_${new Date().toISOString().slice(0, 10)}.json`);
              link.style.display = 'none';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100/90 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95 shrink-0 border border-indigo-250"
            title="Download complete raw inventory database file for offline restore"
          >
            <Download className="w-3 h-3 text-indigo-600" />
            <span>Download All Data</span>
          </button>

          {onImportProducts && (
            <label className="flex items-center justify-center gap-1 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer active:scale-95 shrink-0 shadow-xs relative">
              <Upload className="w-3 h-3" />
              <span>Import Data File</span>
              <input
                type="file"
                accept=".json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const data = JSON.parse(event.target?.result as string);
                      onImportProducts(data);
                    } catch (err) {
                      showAlert('Invalid JSON data file uploaded.', 'Import Error');
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>



      {/* Select All or Bulk Actions Toolbar */}
      {sortedAndFilteredProducts.length > 0 && (
        <div className="flex justify-between items-center bg-slate-100/60 dark:bg-slate-950/60 border border-slate-200/50 dark:border-slate-850/50 p-2.5 rounded-xl text-xs font-bold leading-none mb-1 select-none">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="bulk-select-all"
              checked={sortedAndFilteredProducts.length > 0 && sortedAndFilteredProducts.every(p => selectedIds.includes(p.id))}
              onChange={(e) => {
                if (e.target.checked) {
                  const toAdd = sortedAndFilteredProducts.map(p => p.id);
                  setSelectedIds(prev => Array.from(new Set([...prev, ...toAdd])));
                } else {
                  const filteredIds = sortedAndFilteredProducts.map(p => p.id);
                  setSelectedIds(prev => prev.filter(id => !filteredIds.includes(id)));
                }
              }}
              className="w-4.5 h-4.5 rounded border-slate-300 text-indigo-605 focus:ring-indigo-500 cursor-pointer"
            />
            <label htmlFor="bulk-select-all" className="text-slate-700 dark:text-slate-300 cursor-pointer font-black uppercase text-[10px] tracking-wider">
              {sortedAndFilteredProducts.every(p => selectedIds.includes(p.id)) ? 'Deselect All' : 'Select All Filtered'} ({sortedAndFilteredProducts.length} items)
            </label>
          </div>
          {selectedIds.length > 0 && (
            <button
              onClick={() => setSelectedIds([])}
              className="text-[10px] font-black uppercase tracking-wider text-rose-550 hover:underline cursor-pointer"
            >
              Clear Selected ({selectedIds.length})
            </button>
          )}
        </div>
      )}

      {/* Sortable Table Header */}
      {sortedAndFilteredProducts.length > 0 && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-xl text-[10px] font-black uppercase text-slate-450 dark:text-slate-400 tracking-wider select-none">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                if (sortBy === 'a-z') {
                  setSortBy('z-a');
                } else {
                  setSortBy('a-z');
                }
              }}
              className={`flex items-center gap-0.5 transition-colors cursor-pointer py-1 ${
                (sortBy === 'a-z' || sortBy === 'z-a') ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              Product Name
              <ArrowUpDown className={`w-3 h-3 ${(sortBy === 'a-z' || sortBy === 'z-a') ? 'opacity-100' : 'opacity-45'}`} />
              {(sortBy === 'a-z' || sortBy === 'z-a') && (
                <span className="text-[8px] font-bold">{sortBy === 'a-z' ? '▲' : '▼'}</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (sortBy === 'qty') {
                  setSortBy('qty-desc');
                } else {
                  setSortBy('qty');
                }
              }}
              className={`flex items-center gap-0.5 transition-colors cursor-pointer py-1 ${
                (sortBy === 'qty' || sortBy === 'qty-desc') ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              Quantity
              <ArrowUpDown className={`w-3 h-3 ${(sortBy === 'qty' || sortBy === 'qty-desc') ? 'opacity-100' : 'opacity-45'}`} />
              {(sortBy === 'qty' || sortBy === 'qty-desc') && (
                <span className="text-[8px] font-bold">{sortBy === 'qty' ? '▲' : '▼'}</span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                if (sortBy === 'expiry') {
                  setSortBy('expiry-desc');
                } else {
                  setSortBy('expiry');
                }
              }}
              className={`flex items-center gap-0.5 transition-colors cursor-pointer py-1 ${
                (sortBy === 'expiry' || sortBy === 'expiry-desc') ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              Expiry
              <ArrowUpDown className={`w-3 h-3 ${(sortBy === 'expiry' || sortBy === 'expiry-desc') ? 'opacity-100' : 'opacity-45'}`} />
              {(sortBy === 'expiry' || sortBy === 'expiry-desc') && (
                <span className="text-[8px] font-bold">{sortBy === 'expiry' ? '▲' : '▼'}</span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              if (sortBy === 'price-asc') {
                setSortBy('price-desc');
              } else {
                setSortBy('price-asc');
              }
            }}
            className={`flex items-center gap-0.5 transition-colors cursor-pointer py-1 ${
              (sortBy === 'price-asc' || sortBy === 'price-desc') ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'hover:text-slate-600 dark:hover:text-slate-300'
            }`}
          >
            Price
            <ArrowUpDown className={`w-3 h-3 ${(sortBy === 'price-asc' || sortBy === 'price-desc') ? 'opacity-100' : 'opacity-45'}`} />
            {(sortBy === 'price-asc' || sortBy === 'price-desc') && (
              <span className="text-[8px] font-bold">{sortBy === 'price-asc' ? '▲' : '▼'}</span>
            )}
          </button>
        </div>
      )}

      {/* Stock listings list with Virtualized Windowing */}
      <div ref={containerRef} className="space-y-2 mt-1 relative">
        {isVirtualizing && (
          <div className="flex justify-between items-center px-1 text-[10px] text-slate-400 font-bold select-none">
            <span>Showing products {startIndex + 1}–{Math.min(endIndex, totalItems)} of {totalItems}</span>
            <span className="bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-mono text-[9px] border border-indigo-200/50">
              ⚡ Virtualized Scroll
            </span>
          </div>
        )}

        {/* Top virtualization spacer */}
        {isVirtualizing && topSpacerHeight > 0 && (
          <div style={{ height: `${topSpacerHeight}px` }} aria-hidden="true" />
        )}

        {sortedAndFilteredProducts.length > 0 ? (
          visibleProducts.map(p => {
            const definedThreshold = p.lowStockAlert !== null ? p.lowStockAlert : lowLimit;
            const isLowStock = p.qty <= definedThreshold;
            const isOutOfStock = p.qty <= 0;

            // Expiry state calculation
            let expiryState: 'none' | 'soon' | 'expired' = 'none';
            let daysToExpiry = 0;
            if (p.expiryDate) {
              daysToExpiry = Math.ceil((new Date(p.expiryDate).getTime() - today.getTime()) / 86400000);
              const definedExpiryThreshold = p.nearExpiryDays !== null ? p.nearExpiryDays : expLimit;
              
              if (daysToExpiry < 0) {
                expiryState = 'expired';
              } else if (daysToExpiry <= definedExpiryThreshold) {
                expiryState = 'soon';
              }
            }

            // Margin percentage computation
            const sellPrice = p.sellPrice || p.mrp;
            const marginAmount = sellPrice - p.buyPrice;
            const marginPct = sellPrice > 0 ? (marginAmount / sellPrice) * 100 : 0;

            const supplier = p.supplierId ? suppliersMap.get(p.supplierId) : undefined;

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onOpenProductModal(p.id)}
                className={`w-full text-left bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-xl p-3 shadow-xs flex flex-col justify-between transition-all cursor-pointer active:scale-[0.99] hover:bg-slate-50 dark:hover:bg-slate-850/50 ${
                  isOutOfStock
                    ? 'border-l-rose-500 border-l-4'
                    : isLowStock
                      ? 'border-l-amber-500 border-l-4'
                      : expiryState === 'expired'
                        ? 'border-l-red-600 border-l-4'
                        : expiryState === 'soon'
                          ? 'border-l-rose-455 border-l-4'
                          : 'border-l-slate-200 dark:border-l-slate-800'
                }`}
              >
                <div className="flex items-start gap-3 w-full">
                  {/* Card Select Checkbox */}
                  <div className="pt-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(prev => [...prev, p.id]);
                        } else {
                          setSelectedIds(prev => prev.filter(id => id !== p.id));
                        }
                      }}
                      className="w-4.5 h-4.5 rounded border-slate-300 dark:border-slate-700 text-indigo-605 focus:ring-indigo-500 cursor-pointer block"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2 w-full">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-extrabold uppercase border border-slate-200 dark:border-slate-800/80">
                          {p.category || 'Other'}
                        </span>
                        <h4 className="text-sm font-black text-slate-850 dark:text-slate-100 truncate mt-1.5">
                          {p.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5 flex flex-wrap gap-1.5 items-center">
                          {p.barcode && <span>SKU: {p.barcode}</span>}
                          {p.barcode && p.hsn && <span>•</span>}
                          {p.hsn && <span>HSN: {p.hsn}</span>}
                          {supplier && <span>•</span>}
                          {supplier && <span>From: {supplier.name}</span>}
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="text-base font-black text-slate-900 dark:text-white block font-mono">
                          Rs.{formatCurrency(sellPrice)}
                        </span>
                        {p.buyPrice > 0 && (
                          <span className={`text-[9px] font-extrabold flex items-center gap-0.5 justify-end mt-0.5 ${marginPct >= 0 ? 'text-emerald-600 dark:text-emerald-450' : 'text-rose-500'}`}>
                            <BadgePercent className="w-3.5 h-3.5" />
                            {marginPct.toFixed(0)}% margin
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 w-full items-center">
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    isOutOfStock
                      ? 'bg-rose-50 text-rose-600 border border-rose-100'
                      : isLowStock
                        ? 'bg-amber-50 text-amber-700 border border-amber-100'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  }`}>
                    {isOutOfStock ? '⚠️ Out of Stock' : isLowStock ? `Low stock alert: ${p.qty} left` : `Stock: ${p.qty} ${p.unit || 'pcs'}`}
                  </span>

                  {expiryState === 'expired' && (
                    <span className="text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full">
                      💀 Expired on {formatDate(p.expiryDate)}
                    </span>
                  )}

                  {expiryState === 'soon' && (
                    <span className="text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-150 px-2 py-0.5 rounded-full">
                      ⏰ Expires in {daysToExpiry} days
                    </span>
                  )}

                  {expiryState === 'none' && p.expiryDate && (
                    <span className="text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-150 px-2 py-0.5 rounded-full">
                      Exp: {formatDate(p.expiryDate)}
                    </span>
                  )}
                </div>
              </button>
            );
          })
        ) : (
          <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
            <span className="text-4xl">📦</span>
            <h3 className="font-extrabold text-slate-550 dark:text-slate-400 text-xs mt-1">No products fit this filter</h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
              Clear your searches or tap the floating blue "+" trigger below to create inventory.
            </p>
          </div>
        )}

        {/* Bottom virtualization spacer */}
        {isVirtualizing && bottomSpacerHeight > 0 && (
          <div style={{ height: `${bottomSpacerHeight}px` }} aria-hidden="true" />
        )}
      </div>

      {/* BULK ACTIONS STICKY FLOATING PANEL */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-[88px] left-1/2 -translate-x-1/2 w-[calc(100%-1.5rem)] max-w-xs bg-slate-900 border border-slate-800 text-white rounded-2xl p-3 shadow-2xl flex items-center justify-between z-45 animate-fade-in gap-3">
          <div className="flex flex-col min-w-0 select-none">
            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none">Bulk Stock Manager</span>
            <span className="text-xs font-black truncate mt-1">{selectedIds.length} items select</span>
          </div>
          <div className="flex gap-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                setBulkCategory('');
                setBulkAction('category');
              }}
              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-lg transition-transform active:scale-95 cursor-pointer"
            >
              Category
            </button>
            <button
              type="button"
              onClick={() => {
                setBulkDiscountValue(0);
                setBulkAction('discount');
              }}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-[10px] font-black uppercase tracking-wider rounded-lg transition-transform active:scale-95 cursor-pointer"
            >
              Discount
            </button>
          </div>
        </div>
      )}

      {/* BULK CATEGORY MODAL DIALOG */}
      {bulkAction === 'category' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[3000] flex items-center justify-center p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-xs p-5 relative shadow-2xl space-y-4 text-slate-800 animate-fade-in">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Bulk Apply Category</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Updating {selectedIds.length} items</p>
            </div>

            <div className="space-y-3">
              {(() => {
                const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
                if (uniqueCategories.length > 0) {
                  return (
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Existing:</span>
                      <div className="flex flex-wrap gap-1 max-h-[100px] overflow-y-auto">
                        {uniqueCategories.map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setBulkCategory(cat)}
                            className={`px-2 py-0.5 text-[9px] font-bold rounded-lg border transition-all ${
                              bulkCategory === cat
                                ? 'bg-indigo-600 text-white border-indigo-605'
                                : 'bg-slate-50 text-slate-650 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">New/Custom Category:</label>
                <input
                  type="text"
                  placeholder="Enter custom category..."
                  value={bulkCategory}
                  onChange={(e) => setBulkCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-205 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-505 font-bold"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setBulkAction(null);
                  setBulkCategory('');
                }}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-150 text-slate-700 text-[10px] font-black uppercase rounded-xl border border-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const finalCat = bulkCategory.trim();
                  if (!finalCat) {
                    showAlert('Please select or type a Category group.', 'Category Required');
                    return;
                  }
                  
                  const updatedProducts = products.map(p => {
                    if (selectedIds.includes(p.id)) {
                      return { ...p, category: finalCat };
                    }
                    return p;
                  });

                  if (onBulkUpdateProducts) {
                    onBulkUpdateProducts(updatedProducts);
                  }
                  setSelectedIds([]);
                  setBulkAction(null);
                  setBulkCategory('');
                }}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase rounded-xl shadow-md cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK DISCOUNT MODAL DIALOG */}
      {bulkAction === 'discount' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[3000] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-xs p-5 relative shadow-2xl space-y-4 text-slate-800">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Bulk Apply Discount</h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Updates price on {selectedIds.length} items</p>
            </div>

            <div className="space-y-3.5">
              <div className="flex border border-slate-200 rounded-xl overflow-hidden text-[10px] font-black p-0.5 bg-slate-50">
                <button
                  type="button"
                  onClick={() => setBulkDiscountType('percentage')}
                  className={`flex-1 py-1.5 rounded-lg text-center ${
                    bulkDiscountType === 'percentage' ? 'bg-white shadow-3xs text-indigo-700' : 'text-slate-500'
                  }`}
                >
                  Percentage (%)
                </button>
                <button
                  type="button"
                  onClick={() => setBulkDiscountType('flat')}
                  className={`flex-1 py-1.5 rounded-lg text-center ${
                    bulkDiscountType === 'flat' ? 'bg-white shadow-3xs text-indigo-700' : 'text-slate-500'
                  }`}
                >
                  Flat (Rs.)
                </button>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                  Discount Value ({bulkDiscountType === 'percentage' ? '%' : 'Rs.'}):
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder={bulkDiscountType === 'percentage' ? 'e.g. 10' : 'e.g. 50'}
                  value={bulkDiscountValue || ''}
                  onChange={(e) => setBulkDiscountValue(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-indigo-505 font-bold"
                />
              </div>

              <p className="text-[9px] leading-relaxed text-indigo-655 font-bold bg-indigo-50/55 p-2 rounded-lg border border-indigo-100/50">
                💡 Updates the <strong className="font-extrabold">Selling Price</strong> of selection based on their recorded <strong className="font-extrabold">MRP</strong> (or fallback to current Selling Price if MRP is missing).
              </p>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setBulkAction(null);
                  setBulkDiscountValue(0);
                }}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-150 text-slate-700 text-[10px] font-black uppercase rounded-xl border border-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (bulkDiscountValue < 0) {
                    showAlert('Discount amount cannot be negative.', 'Invalid Discount');
                    return;
                  }
                  if (bulkDiscountType === 'percentage' && bulkDiscountValue > 100) {
                    showAlert('Discount cannot exceed 100%.', 'Invalid Discount');
                    return;
                  }

                  const updatedProducts = products.map(p => {
                    if (selectedIds.includes(p.id)) {
                      const basis = p.mrp || p.sellPrice || 0;
                      let newSell = p.sellPrice;
                      if (bulkDiscountType === 'percentage') {
                        newSell = basis * (1 - bulkDiscountValue / 100);
                      } else {
                        newSell = basis - bulkDiscountValue;
                      }
                      return {
                        ...p,
                        sellPrice: Math.max(0, parseFloat(newSell.toFixed(2)))
                      };
                    }
                    return p;
                  });

                  if (onBulkUpdateProducts) {
                    onBulkUpdateProducts(updatedProducts);
                  }
                  setSelectedIds([]);
                  setBulkAction(null);
                  setBulkDiscountValue(0);
                }}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase rounded-xl shadow-md cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky floating trigger action to register a product */}
      <button
        onClick={() => onOpenProductModal(null)}
        className="fixed bottom-[96px] right-4 bg-indigo-600 hover:bg-indigo-700 text-white w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-100 active:scale-90 transition-transform cursor-pointer z-50 text-xl font-extrabold"
        title="Add Product Stock"
      >
        <Plus className="w-5 h-5 stroke-[3px]" />
      </button>
    </div>
  );
};
