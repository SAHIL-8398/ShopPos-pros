/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Sale, Settings } from '../types';
import { BillFormatKey } from '../constants/billFormats';
import { formatCurrency, formatDate } from '../utils';

interface FormattedInvoiceViewProps {
  sale: Sale;
  settings: Settings;
  format: BillFormatKey;
  barcodeDataUrl?: string;
  upiQrDataUrl?: string;
}

export const FormattedInvoiceView: React.FC<FormattedInvoiceViewProps> = ({
  sale,
  settings,
  format,
  barcodeDataUrl,
  upiQrDataUrl,
}) => {
  const cur = settings.currency || '₹';

  // 1. MODERN STYLISH FORMAT
  if (format === 'stylish') {
    return (
      <div className="bg-white text-slate-900 rounded-2xl shadow-lg border border-emerald-100 overflow-hidden text-xs max-w-2xl mx-auto select-none print:shadow-none print:border-none">
        {/* Emerald Header Banner */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-xl font-black tracking-wide uppercase">{settings.shopName || 'ShopPOS Store'}</h2>
            <p className="text-[10px] text-emerald-100 mt-0.5">
              {settings.address && <span>{settings.address.replace(/\n/g, ', ')} • </span>}
              {settings.phone && <span>Ph: {settings.phone} • </span>}
              {settings.gstin && <span>GSTIN: {settings.gstin}</span>}
            </p>
          </div>
          <div className="text-left sm:text-right shrink-0">
            <span className="inline-block bg-white text-emerald-800 font-extrabold text-[9px] uppercase px-2.5 py-0.5 rounded-full shadow-xs mb-1">
              Tax Invoice
            </span>
            <div className="text-[11px] font-bold">INV #{sale.billNo}</div>
            <div className="text-[9px] text-emerald-100">{formatDate(sale.date)} {sale.time || ''}</div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <span className="text-[9px] font-black uppercase tracking-wider text-emerald-800 block mb-0.5">Customer / Billed To</span>
              <div className="font-bold text-slate-800 text-xs">{sale.customer || 'Guest / Walk-In Customer'}</div>
              {sale.customerPhone && <div className="text-[10px] text-slate-500 mt-0.5">Mobile: {sale.customerPhone}</div>}
              {sale.customerAddress && <div className="text-[10px] text-slate-500">Address: {sale.customerAddress}</div>}
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-between">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block mb-0.5">Payment Details</span>
                <div className="font-bold text-slate-800 text-xs uppercase">Mode: {sale.paymentMethod || 'cash'}</div>
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                Billed By: <span className="font-semibold text-slate-700">{sale.staffName || 'Cashier'}</span> • Status: <span className="text-emerald-600 font-bold">Settled</span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="rounded-xl overflow-hidden border border-emerald-100">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-emerald-600 text-white text-[10px] font-black uppercase tracking-wider">
                  <th className="py-2 px-3 text-center w-10">#</th>
                  <th className="py-2 px-3">Item Description</th>
                  <th className="py-2 px-3 text-right">Qty</th>
                  <th className="py-2 px-3 text-right">Unit Rate</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-50 text-[11px]">
                {sale.items.map((it, idx) => (
                  <tr key={idx} className={idx % 2 === 1 ? 'bg-emerald-50/30' : 'bg-white'}>
                    <td className="py-2 px-3 text-center text-slate-400 font-bold text-[10px]">{idx + 1}</td>
                    <td className="py-2 px-3 font-semibold text-slate-800">{it.name}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{it.qty} {it.unit || 'pcs'}</td>
                    <td className="py-2 px-3 text-right text-slate-600">{cur}{formatCurrency(it.price)}</td>
                    <td className="py-2 px-3 text-right font-black text-slate-800">{cur}{formatCurrency(it.qty * it.price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Financials Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-2">
            <div className="flex-1 space-y-2">
              {sale.discount > 0 && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[10.5px] font-bold flex items-center gap-2">
                  <span>✨</span>
                  <span>Total Discount Saved: {cur}{formatCurrency(sale.discount)}</span>
                </div>
              )}
              {barcodeDataUrl && (
                <div className="pt-1">
                  <img src={barcodeDataUrl} alt="Barcode" className="h-9 object-contain" />
                </div>
              )}
            </div>

            <div className="w-full sm:w-64 bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-1.5 text-[11px]">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-700">{cur}{formatCurrency(sale.subtotal)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Discount:</span>
                  <span>-{cur}{formatCurrency(sale.discount)}</span>
                </div>
              )}
              {sale.gst > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>GST ({sale.gstPct}%):</span>
                  <span className="font-semibold text-slate-700">{cur}{formatCurrency(sale.gst)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-black text-emerald-700">
                <span>Total Amount:</span>
                <span>{cur}{formatCurrency(sale.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. CLASSIC ELEGANT FORMAT (Serif, Double-bordered)
  if (format === 'classic') {
    return (
      <div className="bg-amber-50/10 text-slate-900 p-6 rounded-2xl shadow-lg border-4 border-double border-slate-400 font-serif text-xs max-w-2xl mx-auto select-none print:shadow-none print:border-none">
        {/* Header */}
        <div className="text-center pb-3 border-b-2 border-slate-300">
          <h2 className="text-2xl font-bold tracking-wider uppercase text-slate-900">{settings.shopName || 'ShopPOS Store'}</h2>
          <p className="text-[10px] text-slate-600 mt-0.5">
            {settings.address && <span>{settings.address.replace(/\n/g, ', ')} • </span>}
            {settings.phone && <span>Tel: {settings.phone} • </span>}
            {settings.gstin && <span>GSTIN: {settings.gstin}</span>}
          </p>
          <div className="mt-2 text-xs font-bold tracking-widest text-slate-800 uppercase">~ TAX INVOICE ~</div>
        </div>

        {/* Consignor & Consignee boxes */}
        <div className="grid grid-cols-2 gap-3 my-3 text-[10.5px]">
          <div className="border border-slate-400 p-2.5 rounded-sm">
            <span className="font-bold block text-[9px] text-slate-700 uppercase mb-1">SUPPLIER / BILLED BY:</span>
            <div className="font-bold text-slate-900">{settings.shopName || 'Store'}</div>
            <div className="text-slate-600 text-[10px]">GSTIN: {settings.gstin || 'Unregistered'}</div>
            {settings.fssai && <div className="text-slate-600 text-[10px]">FSSAI: {settings.fssai}</div>}
          </div>
          <div className="border border-slate-400 p-2.5 rounded-sm">
            <span className="font-bold block text-[9px] text-slate-700 uppercase mb-1">BUYER / BILLED TO:</span>
            <div className="font-bold text-slate-900">{sale.customer || 'Cash Customer'}</div>
            {sale.customerPhone && <div className="text-slate-600 text-[10px]">Mobile: {sale.customerPhone}</div>}
            <div className="text-slate-600 text-[10px]">Invoice #{sale.billNo} • Date: {formatDate(sale.date)}</div>
          </div>
        </div>

        {/* Table */}
        <table className="w-full border-collapse border border-slate-400 text-left my-3 text-[11px]">
          <thead>
            <tr className="bg-slate-100 font-bold border-b border-slate-400 text-[10px]">
              <th className="p-1.5 border-r border-slate-400 text-center w-8">S.N</th>
              <th className="p-1.5 border-r border-slate-400">Description of Goods</th>
              <th className="p-1.5 border-r border-slate-400 text-right">Qty</th>
              <th className="p-1.5 border-r border-slate-400 text-right">Rate</th>
              <th className="p-1.5 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
            {sale.items.map((it, idx) => (
              <tr key={idx}>
                <td className="p-1.5 border-r border-slate-400 text-center text-slate-600">{idx + 1}</td>
                <td className="p-1.5 border-r border-slate-400 font-semibold">{it.name}</td>
                <td className="p-1.5 border-r border-slate-400 text-right">{it.qty} {it.unit || 'pcs'}</td>
                <td className="p-1.5 border-r border-slate-400 text-right">{cur}{formatCurrency(it.price)}</td>
                <td className="p-1.5 text-right font-bold">{cur}{formatCurrency(it.qty * it.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary & Stamp */}
        <div className="flex justify-between items-end pt-2 gap-4">
          <div className="flex-1 border border-slate-400 p-2.5 text-[9.5px] text-slate-600">
            <span className="font-bold block text-slate-800 mb-0.5">DECLARATION:</span>
            <span>We declare that this invoice shows the actual price of goods described. {settings.termsTextOnBill ? settings.termsTextOnBill.split('\n')[0] : ''}</span>
          </div>

          <div className="w-60 space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>{cur}{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-rose-700">
                <span>Less Discount:</span>
                <span>-{cur}{formatCurrency(sale.discount)}</span>
              </div>
            )}
            {sale.gst > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>GST Tax ({sale.gstPct}%):</span>
                <span>{cur}{formatCurrency(sale.gst)}</span>
              </div>
            )}
            <div className="border-t-2 border-b-2 border-slate-900 py-1 flex justify-between font-bold text-sm">
              <span>TOTAL AMOUNT:</span>
              <span>{cur}{formatCurrency(sale.total)}</span>
            </div>
            <div className="pt-2 text-center">
              <div className="text-[9px] font-bold text-slate-700">For {settings.shopName || 'Store'}</div>
              <div className="text-[9px] italic text-slate-400 mt-3">[ AUTHORIZED SIGNATORY ]</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. SIMPLE MINIMALIST (Eco Ink-Saver)
  if (format === 'simple') {
    return (
      <div className="bg-white text-black p-6 rounded-2xl shadow-lg border border-slate-300 font-sans text-xs max-w-2xl mx-auto select-none print:shadow-none print:border-none">
        <div className="flex justify-between items-start border-b-2 border-black pb-3">
          <div>
            <h2 className="text-xl font-black uppercase tracking-tight">{settings.shopName || 'ShopPOS Store'}</h2>
            <div className="text-[10px] text-slate-600 mt-0.5">
              {settings.phone && <span>Phone: {settings.phone} • </span>}
              {settings.gstin && <span>GSTIN: {settings.gstin}</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-black uppercase">TAX INVOICE</div>
            <div className="text-[10px] text-slate-600">Bill #{sale.billNo} • {formatDate(sale.date)}</div>
          </div>
        </div>

        <div className="py-2 border-b border-slate-200 flex justify-between text-[10px]">
          <span>Client: <strong className="text-black">{sale.customer || 'Walk-In Customer'}</strong></span>
          <span>Payment: <strong className="text-black uppercase">{sale.paymentMethod || 'cash'}</strong></span>
        </div>

        <table className="w-full text-left my-3 border-collapse text-[11px]">
          <thead>
            <tr className="border-b-2 border-black font-bold text-[10px] uppercase">
              <th className="py-1.5 w-8">#</th>
              <th className="py-1.5">Item Description</th>
              <th className="py-1.5 text-right">Qty</th>
              <th className="py-1.5 text-right">Price</th>
              <th className="py-1.5 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sale.items.map((it, idx) => (
              <tr key={idx}>
                <td className="py-1.5 text-slate-500">{idx + 1}</td>
                <td className="py-1.5 font-medium">{it.name}</td>
                <td className="py-1.5 text-right">{it.qty}</td>
                <td className="py-1.5 text-right">{cur}{formatCurrency(it.price)}</td>
                <td className="py-1.5 text-right font-bold">{cur}{formatCurrency(it.qty * it.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end pt-2">
          <div className="w-56 space-y-1 text-[11px]">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span>{cur}{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Discount:</span>
                <span>-{cur}{formatCurrency(sale.discount)}</span>
              </div>
            )}
            {sale.gst > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>GST:</span>
                <span>{cur}{formatCurrency(sale.gst)}</span>
              </div>
            )}
            <div className="border-t-2 border-b-2 border-black py-1 flex justify-between font-black text-sm">
              <span>TOTAL:</span>
              <span>{cur}{formatCurrency(sale.total)}</span>
            </div>
          </div>
        </div>

        <div className="pt-6 text-[10px] text-slate-500 text-center">
          Thank you! Visit again.
        </div>
      </div>
    );
  }

  // 4. RETAIL SUPERMARKET FORMAT (MRP & Savings)
  if (format === 'retail') {
    let totalSavings = sale.discount || 0;
    return (
      <div className="bg-white text-slate-900 rounded-2xl shadow-lg border border-purple-200 overflow-hidden text-xs max-w-2xl mx-auto select-none print:shadow-none print:border-none">
        <div className="bg-purple-700 h-2 w-full" />
        <div className="p-5 pb-3">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-xl font-black text-purple-950 uppercase">{settings.shopName || 'ShopPOS Supermarket'}</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {settings.address && <span>{settings.address.replace(/\n/g, ', ')} • </span>}
                {settings.phone && <span>Ph: {settings.phone} • </span>}
                {settings.gstin && <span>GSTIN: {settings.gstin}</span>}
              </p>
            </div>
            <div className="text-right">
              <span className="inline-block bg-purple-100 text-purple-800 font-extrabold text-[9px] uppercase px-2 py-0.5 rounded-full mb-1">
                Retail Tax Invoice
              </span>
              <div className="text-xs font-black">BILL #{sale.billNo}</div>
              <div className="text-[10px] text-slate-400">{formatDate(sale.date)} {sale.time || ''}</div>
            </div>
          </div>

          <div className="py-2 border-y border-slate-200 my-3 flex justify-between text-[10px] text-slate-600">
            <span>Customer: <strong className="text-slate-800">{sale.customer || 'Walk-In Guest'}</strong></span>
            <span>Cashier: <strong className="text-slate-800">{sale.staffName || 'POS Terminal'}</strong></span>
          </div>

          {/* Supermarket Table */}
          <div className="rounded-xl overflow-hidden border border-slate-200">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead>
                <tr className="bg-purple-700 text-white text-[9.5px] font-black uppercase">
                  <th className="py-2 px-2.5 text-center w-8">#</th>
                  <th className="py-2 px-2">Product Description</th>
                  <th className="py-2 px-2 text-right">MRP</th>
                  <th className="py-2 px-2 text-right">Rate</th>
                  <th className="py-2 px-2 text-right">Qty</th>
                  <th className="py-2 px-2 text-right">Disc</th>
                  <th className="py-2 px-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sale.items.map((it, idx) => {
                  const mrpVal = (it as any).mrp ? (it as any).mrp : it.price;
                  const itemDisc = Math.max(0, (mrpVal - it.price) * it.qty);
                  if (itemDisc > 0) totalSavings += itemDisc;

                  return (
                    <tr key={idx} className={idx % 2 === 1 ? 'bg-purple-50/20' : 'bg-white'}>
                      <td className="py-2 px-2.5 text-center text-slate-400 text-[10px]">{idx + 1}</td>
                      <td className="py-2 px-2 font-semibold text-slate-800">{it.name}</td>
                      <td className="py-2 px-2 text-right line-through text-slate-400">{cur}{formatCurrency(mrpVal)}</td>
                      <td className="py-2 px-2 text-right font-medium text-slate-700">{cur}{formatCurrency(it.price)}</td>
                      <td className="py-2 px-2 text-right text-slate-600">{it.qty}</td>
                      <td className="py-2 px-2 text-right text-emerald-600 font-bold">{itemDisc > 0 ? `-${cur}${formatCurrency(itemDisc)}` : '-'}</td>
                      <td className="py-2 px-2.5 text-right font-black text-slate-900">{cur}{formatCurrency(it.qty * it.price)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Savings Delight Box */}
          {totalSavings > 0 && (
            <div className="my-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-black text-center flex items-center justify-center gap-2">
              <span>🎉</span>
              <span>TOTAL SAVINGS ON THIS BILL: {cur}{formatCurrency(totalSavings)} (You saved big!)</span>
            </div>
          )}

          {/* Totals & Barcode */}
          <div className="flex justify-between items-end pt-2">
            <div>
              {barcodeDataUrl && (
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Return Scan Barcode</span>
                  <img src={barcodeDataUrl} alt="Barcode" className="h-8 object-contain" />
                </div>
              )}
            </div>

            <div className="w-60 bg-purple-50/50 p-3 rounded-xl border border-purple-100 space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span className="font-semibold text-slate-700">{cur}{formatCurrency(sale.subtotal)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-semibold">
                  <span>Bill Discount:</span>
                  <span>-{cur}{formatCurrency(sale.discount)}</span>
                </div>
              )}
              {sale.gst > 0 && (
                <div className="flex justify-between text-slate-500">
                  <span>GST Tax ({sale.gstPct}%):</span>
                  <span className="font-semibold text-slate-700">{cur}{formatCurrency(sale.gst)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-purple-200 flex justify-between items-center text-sm font-black text-purple-900">
                <span>NET PAYABLE:</span>
                <span>{cur}{formatCurrency(sale.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 5. REGULAR / STANDARD GST FORMAT (Vyapar Default)
  return (
    <div className="bg-white text-slate-900 rounded-2xl shadow-lg border border-slate-200 overflow-hidden text-xs max-w-2xl mx-auto select-none print:shadow-none print:border-none">
      <div className="bg-indigo-700 h-2.5 w-full" />
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase">{settings.shopName || 'ShopPOS Store'}</h2>
            <div className="text-[10px] text-slate-500 mt-1 space-y-0.5">
              {settings.address && <div>{settings.address.replace(/\n/g, ', ')}</div>}
              {settings.phone && <div>Phone: {settings.phone}</div>}
              {settings.gstin && <div className="font-bold text-slate-700">GSTIN: {settings.gstin}</div>}
              {settings.fssai && <div>FSSAI Lic. No: {settings.fssai}</div>}
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block bg-indigo-50 text-indigo-700 font-black text-[9px] uppercase px-2.5 py-0.5 rounded-full border border-indigo-200 mb-1">
              Original Tax Invoice
            </span>
            <div className="text-sm font-black text-slate-900">INVOICE #{sale.billNo}</div>
            <div className="text-[10px] text-slate-500">{formatDate(sale.date)} {sale.time || ''}</div>
            <div className="text-[10px] text-slate-500 uppercase font-semibold mt-0.5">Payment: {sale.paymentMethod || 'cash'}</div>
          </div>
        </div>

        {/* Customer box */}
        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex justify-between items-center text-[10.5px]">
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Billed To Client</span>
            <div className="font-bold text-slate-800 text-xs mt-0.5">{sale.customer || 'Walk-In Customer / Guest'}</div>
            {sale.customerPhone && <div className="text-slate-500 text-[10px]">Mobile: {sale.customerPhone}</div>}
          </div>
          <div className="text-right">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">Invoice Meta</span>
            <div className="text-slate-700 text-[10px] mt-0.5">Handled By: <span className="font-bold">{sale.staffName || 'Operator'}</span></div>
            <div className="text-emerald-600 font-bold text-[10px]">Status: Settled</div>
          </div>
        </div>

        {/* Items Table */}
        <div className="rounded-xl overflow-hidden border border-slate-200">
          <table className="w-full text-left border-collapse text-[11px]">
            <thead>
              <tr className="bg-indigo-700 text-white text-[10px] font-black uppercase tracking-wider">
                <th className="py-2.5 px-3 text-center w-10">S.No</th>
                <th className="py-2.5 px-3">Items & Description</th>
                <th className="py-2.5 px-3 text-right">Qty</th>
                <th className="py-2.5 px-3 text-right">Unit Price</th>
                <th className="py-2.5 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sale.items.map((it, idx) => (
                <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/50' : 'bg-white'}>
                  <td className="py-2 px-3 text-center text-slate-400 font-bold text-[10px]">{idx + 1}</td>
                  <td className="py-2 px-3 font-semibold text-slate-800">{it.name}</td>
                  <td className="py-2 px-3 text-right text-slate-600">{it.qty} {it.unit || 'pcs'}</td>
                  <td className="py-2 px-3 text-right text-slate-600">{cur}{formatCurrency(it.price)}</td>
                  <td className="py-2 px-3 text-right font-black text-slate-900">{cur}{formatCurrency(it.qty * it.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & Signatory */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pt-1">
          <div className="flex-1 space-y-2 text-[10px] text-slate-500">
            <div>
              <span className="font-bold text-slate-700 block uppercase mb-0.5">Terms & Conditions:</span>
              <p>{settings.termsTextOnBill || 'Goods once sold will not be returned without original bill.'}</p>
            </div>
            {barcodeDataUrl && (
              <div className="pt-1">
                <img src={barcodeDataUrl} alt="Barcode" className="h-8 object-contain" />
              </div>
            )}
          </div>

          <div className="w-full sm:w-64 bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-[11px]">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal:</span>
              <span className="font-semibold text-slate-700">{cur}{formatCurrency(sale.subtotal)}</span>
            </div>
            {sale.discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-semibold">
                <span>Discount:</span>
                <span>-{cur}{formatCurrency(sale.discount)}</span>
              </div>
            )}
            {sale.gst > 0 && (
              <div className="flex justify-between text-slate-500">
                <span>GST Tax ({sale.gstPct}%):</span>
                <span className="font-semibold text-slate-700">{cur}{formatCurrency(sale.gst)}</span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-black text-indigo-700">
              <span>Grand Total:</span>
              <span>{cur}{formatCurrency(sale.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
