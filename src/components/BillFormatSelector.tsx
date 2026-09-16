/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Check, Building2, Printer, Sparkles, ScrollText, FileText, ShoppingBag } from 'lucide-react';
import { BILL_FORMATS, BillFormatConfig, BillFormatKey } from '../constants/billFormats';

interface BillFormatSelectorProps {
  selectedFormat: BillFormatKey;
  onSelectFormat: (format: BillFormatKey) => void;
  compact?: boolean;
}

const getFormatIcon = (name: string, className = 'w-5 h-5') => {
  switch (name) {
    case 'Building2':
      return <Building2 className={className} />;
    case 'Printer':
      return <Printer className={className} />;
    case 'Sparkles':
      return <Sparkles className={className} />;
    case 'ScrollText':
      return <ScrollText className={className} />;
    case 'FileText':
      return <FileText className={className} />;
    case 'ShoppingBag':
      return <ShoppingBag className={className} />;
    default:
      return <FileText className={className} />;
  }
};

/**
 * Visual Miniature Invoice Mockup SVG / Card
 */
const FormatVisualPreview: React.FC<{ format: BillFormatConfig; isSelected: boolean }> = ({ format, isSelected }) => {
  if (format.id === 'thermal') {
    return (
      <div className="w-full h-24 bg-amber-50/60 dark:bg-slate-950/80 rounded-xl border border-dashed border-amber-300 dark:border-amber-800/80 p-2.5 flex flex-col justify-between font-mono text-[8px] text-slate-700 dark:text-slate-300 select-none overflow-hidden">
        <div className="text-center">
          <div className="font-bold text-[9px] truncate">STORE POS RECEIPT</div>
          <div className="text-[7px] text-slate-400">--- TAX INVOICE ---</div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between text-[7.5px] border-b border-dashed border-slate-300 dark:border-slate-800 pb-0.5">
            <span>Item A x 2</span>
            <span className="font-bold">₹240.00</span>
          </div>
          <div className="flex justify-between text-[7.5px]">
            <span>Item B x 1</span>
            <span className="font-bold">₹90.00</span>
          </div>
        </div>
        <div className="pt-1 border-t border-dashed border-slate-300 dark:border-slate-800 flex justify-between font-bold text-[9px]">
          <span>TOTAL (80mm)</span>
          <span className="text-amber-600 dark:text-amber-400">₹330.00</span>
        </div>
      </div>
    );
  }

  if (format.id === 'stylish') {
    return (
      <div className="w-full h-24 bg-white dark:bg-slate-950 rounded-xl border border-emerald-200/80 dark:border-emerald-900/60 overflow-hidden flex flex-col justify-between select-none shadow-xs">
        <div className="bg-emerald-600 text-white px-2.5 py-1.5 flex items-center justify-between">
          <span className="font-extrabold text-[9px] tracking-wide">STORE POS</span>
          <span className="bg-white text-emerald-700 text-[6.5px] font-bold px-1.5 py-0.5 rounded-full">PAID TAX</span>
        </div>
        <div className="px-2.5 py-1 space-y-1">
          <div className="h-2 w-16 bg-slate-200 dark:bg-slate-800 rounded-sm" />
          <div className="grid grid-cols-3 gap-1">
            <div className="h-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xs" />
            <div className="h-2.5 bg-slate-100 dark:bg-slate-900 rounded-xs" />
            <div className="h-2.5 bg-emerald-50 dark:bg-emerald-950/40 rounded-xs" />
          </div>
        </div>
        <div className="bg-emerald-50/70 dark:bg-emerald-950/30 px-2.5 py-1 border-t border-emerald-100 dark:border-emerald-900/40 flex justify-between items-center text-[8px]">
          <span className="text-emerald-700 dark:text-emerald-400 font-bold">Saved: ₹45</span>
          <span className="font-black text-emerald-800 dark:text-emerald-300">₹580.00</span>
        </div>
      </div>
    );
  }

  if (format.id === 'classic') {
    return (
      <div className="w-full h-24 bg-amber-50/20 dark:bg-slate-950 rounded-xl border-2 border-double border-slate-400 dark:border-slate-700 p-2 flex flex-col justify-between select-none font-serif">
        <div className="text-center border-b border-slate-300 dark:border-slate-800 pb-1">
          <div className="font-bold text-[9px] text-slate-800 dark:text-slate-200 uppercase tracking-wider">STORE TRADERS</div>
          <div className="text-[7px] text-slate-500 italic">~ TAX INVOICE ~</div>
        </div>
        <div className="grid grid-cols-2 gap-1 text-[7px] text-slate-600 dark:text-slate-400">
          <div className="border border-slate-200 dark:border-slate-800 p-0.5 rounded-xs">
            <span className="font-bold block">SUPPLIER:</span>
            <span>GSTIN: 27A...</span>
          </div>
          <div className="border border-slate-200 dark:border-slate-800 p-0.5 rounded-xs">
            <span className="font-bold block">BUYER:</span>
            <span>M/s Retailer</span>
          </div>
        </div>
        <div className="border-t border-slate-300 dark:border-slate-800 pt-0.5 flex justify-between items-center text-[8px]">
          <span className="text-[6.5px] border border-slate-300 dark:border-slate-700 px-1 py-0.2 rounded-xs">[ SEAL BOX ]</span>
          <span className="font-bold text-slate-900 dark:text-slate-100">TOTAL: ₹1,250</span>
        </div>
      </div>
    );
  }

  if (format.id === 'simple') {
    return (
      <div className="w-full h-24 bg-white dark:bg-slate-950 rounded-xl border border-slate-300 dark:border-slate-800 p-2 flex flex-col justify-between select-none font-sans">
        <div className="flex justify-between items-center border-b border-slate-900 dark:border-slate-200 pb-1">
          <span className="font-bold text-[9px] text-black dark:text-white">STORE NAME</span>
          <span className="text-[8px] font-bold text-black dark:text-white">INVOICE</span>
        </div>
        <div className="space-y-1 text-[7.5px] text-slate-600 dark:text-slate-400">
          <div className="flex justify-between border-b border-slate-100 dark:border-slate-900 pb-0.5">
            <span>Product Alpha</span>
            <span>₹150.00</span>
          </div>
          <div className="flex justify-between">
            <span>Product Beta</span>
            <span>₹220.00</span>
          </div>
        </div>
        <div className="border-t-2 border-b-2 border-slate-900 dark:border-slate-200 py-0.5 flex justify-between font-bold text-[8.5px] text-black dark:text-white">
          <span>NET PAYABLE</span>
          <span>₹370.00</span>
        </div>
      </div>
    );
  }

  if (format.id === 'retail') {
    return (
      <div className="w-full h-24 bg-white dark:bg-slate-950 rounded-xl border border-purple-200/80 dark:border-purple-900/60 overflow-hidden flex flex-col justify-between select-none shadow-xs">
        <div className="bg-purple-700 text-white px-2 py-1 flex items-center justify-between text-[8.5px]">
          <span className="font-black truncate">RETAIL SUPERMARKET</span>
          <span className="text-[7px] font-bold">MRP BILL</span>
        </div>
        <div className="px-2 text-[7px] space-y-0.5 text-slate-600 dark:text-slate-300">
          <div className="flex justify-between font-bold bg-slate-100 dark:bg-slate-900 px-1 py-0.5 rounded-xs">
            <span>Item</span>
            <span>MRP</span>
            <span>Disc</span>
            <span>Net</span>
          </div>
          <div className="flex justify-between px-1">
            <span className="truncate w-10">Soap Pack</span>
            <span className="line-through text-slate-400">₹60</span>
            <span className="text-emerald-600 font-bold">-₹10</span>
            <span className="font-bold">₹50</span>
          </div>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 border-t border-emerald-200 dark:border-emerald-800 text-[7px] text-emerald-700 dark:text-emerald-300 font-bold flex justify-between items-center">
          <span>🎉 You Saved ₹10!</span>
          <span className="text-purple-800 dark:text-purple-300 font-black text-[8.5px]">₹50.00</span>
        </div>
      </div>
    );
  }

  // Default: Regular / Standard GST
  return (
    <div className="w-full h-24 bg-white dark:bg-slate-950 rounded-xl border border-indigo-200/80 dark:border-indigo-900/60 overflow-hidden flex flex-col justify-between select-none shadow-xs">
      <div className="bg-indigo-700 h-1.5 w-full" />
      <div className="px-2.5 py-1 flex justify-between items-start">
        <div>
          <div className="font-extrabold text-[9px] text-slate-800 dark:text-slate-200">STORE BUSINESS</div>
          <div className="text-[7px] text-slate-400">GSTIN: 27AAAAA...</div>
        </div>
        <div className="text-right">
          <div className="font-black text-[9px] text-indigo-600 dark:text-indigo-400">TAX INVOICE</div>
          <div className="text-[7px] text-slate-400">#INV-1024</div>
        </div>
      </div>
      <div className="mx-2 bg-indigo-50/60 dark:bg-indigo-950/30 rounded-xs p-1 text-[7px] grid grid-cols-4 font-bold text-slate-600 dark:text-slate-300">
        <span>S.N</span>
        <span className="col-span-2">Item Name</span>
        <span className="text-right">Total</span>
      </div>
      <div className="bg-indigo-700 text-white px-2.5 py-0.5 flex justify-between items-center text-[8px] font-bold">
        <span>GRAND TOTAL</span>
        <span>₹1,420.00</span>
      </div>
    </div>
  );
};

export const BillFormatSelector: React.FC<BillFormatSelectorProps> = ({
  selectedFormat,
  onSelectFormat,
  compact = false,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <div>
          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            Vyapar-Style Bill & Invoice Formats (6 Presets)
          </h4>
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">
            Select your preferred invoice design layout. All printed PDFs, receipts and WhatsApp shares automatically adapt.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {BILL_FORMATS.map((fmt) => {
          const isSelected = selectedFormat === fmt.id;

          return (
            <div
              key={fmt.id}
              onClick={() => onSelectFormat(fmt.id)}
              className={`group relative p-3.5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between text-left select-none ${
                isSelected
                  ? 'bg-indigo-50/30 dark:bg-indigo-950/20 border-indigo-600 dark:border-indigo-500 shadow-md shadow-indigo-500/10'
                  : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800/90 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
              }`}
            >
              {/* Top Header info */}
              <div>
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950 group-hover:text-indigo-600'
                      }`}
                    >
                      {getFormatIcon(fmt.iconName, 'w-4 h-4')}
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {fmt.name}
                      </div>
                      <div className="text-[9px] text-slate-400 dark:text-slate-500 font-semibold">
                        {fmt.subtitle}
                      </div>
                    </div>
                  </div>

                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${fmt.tagClass}`}>
                    {fmt.tag}
                  </span>
                </div>

                {/* Miniature Visual Mockup */}
                <div className="my-2.5">
                  <FormatVisualPreview format={fmt} isSelected={isSelected} />
                </div>

                {/* Description */}
                <p className="text-[10.5px] text-slate-600 dark:text-slate-400 font-medium leading-relaxed line-clamp-2">
                  {fmt.description}
                </p>

                {/* Feature bullets */}
                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/70 space-y-1">
                  {fmt.highlights.slice(0, 2).map((hi, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-[9.5px] text-slate-500 dark:text-slate-400">
                      <div className="w-1 h-1 rounded-full bg-indigo-500" />
                      <span className="truncate">{hi}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bottom selection indicator */}
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/70 flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 truncate max-w-[150px]">
                  Best for: {fmt.bestFor.split(',')[0]}
                </span>

                <div
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-slate-700'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <Check className="w-3 h-3 stroke-[3]" />
                      <span>Active</span>
                    </>
                  ) : (
                    <span>Choose</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
