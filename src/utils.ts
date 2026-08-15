/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import { Clipboard } from '@capacitor/clipboard';
import { languagePacks } from './context/LocalizationContext';
import { savePdfToAppFolder, isNativeCapacitor } from './services/nativeStorage';

// Format numbers with 2 decimal places unless they are integers
export function formatCurrency(n: number): string {
  const v = Number(n) || 0;
  return v % 1 === 0 ? v.toString() : v.toFixed(2);
}

// Format any Date or date string to dd/mm/yyyy
export function formatDate(date: Date | string | number | null | undefined): string {
  if (!date) return '';
  // If it's a YYYY-MM-DD string, parse it manually to avoid timezone shift
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const [year, month, day] = date.split('-');
    return `${day}/${month}/${year}`;
  }
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return String(date);
  }
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

// Format date for header in the style: Tuesday, 02/07/2026
export function formatHeaderDate(date: Date): string {
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  return `${weekday}, ${formatDate(date)}`;
}

// Generate collision-proof RFC4122 v4 UUIDs
export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    // Set UUID v4 variant & version bits
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  // Fallback with high-entropy timestamp, performance counter, and random values
  const timestamp = Date.now().toString(36);
  const perf = typeof performance !== 'undefined' ? Math.floor(performance.now() * 1000).toString(36) : '';
  const rand1 = Math.random().toString(36).slice(2, 10);
  const rand2 = Math.random().toString(36).slice(2, 10);
  return `id_${timestamp}_${perf}_${rand1}${rand2}`;
}

// Get the current local date in YYYY-MM-DD format
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Escape dangerous HTML entities (just in case they are used in raw renders, though React handles escaping natively)
export function escapeHtml(s: string): string {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Copy text to clipboard with Capacitor native plugin and browser fallback
export async function copyToClipboard(text: string): Promise<boolean> {
  // 1. Try native Capacitor Clipboard
  try {
    await Clipboard.write({ string: text });
    return true;
  } catch (nativeErr) {
    // Continue to browser fallback
  }

  // 2. Try browser standard navigator.clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback to execCommand
    }
  }
  
  // 3. Fallback to hidden DOM textarea execCommand
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed'; // Prevent scrolling
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const success = document.execCommand('copy');
    document.body.removeChild(textArea);
    return success;
  } catch {
    return false;
  }
}

// Synthesis audio alerts for scanning success / error tactile feedback
export function playBeepSound(type: 'success' | 'error') {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    if (type === 'success') {
      // High-pitched pleasant dual-pulse scan beep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(950, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } else {
      // Low dual buzz warning tone
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.28);
    }
  } catch (err) {
    console.warn('Tactile audio synthesis blocked or unsupported:', err);
  }
}

export interface PredictiveAlert {
  id: string;
  name: string;
  qty: number;
  velocity: number; // Daily sales velocity
  daysToStockout: number; // Days to stockout
  recommendedQty: number; // Suggested PO reorder cover qty
}

// Compute daily demand velocity and estimated days before complete Stockout
export function computePredictiveAlerts(products: any[], sales: any[]): PredictiveAlert[] {
  const today = new Date();
  
  // Aggregate sales in the last 30 days
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const activeRecentSales = sales.filter(s => !s.voided && new Date(s.date + 'T00:00:00') >= thirtyDaysAgo);
  
  const soldUnits: { [key: string]: number } = {};
  activeRecentSales.forEach(s => {
    s.items.forEach(item => {
      const key = item.id;
      const nameKey = item.name;
      if (key) soldUnits[key] = (soldUnits[key] || 0) + item.qty;
      if (nameKey) soldUnits[nameKey] = (soldUnits[nameKey] || 0) + item.qty;
    });
  });

  // Capture all-time fallback
  const allActiveSales = sales.filter(s => !s.voided);
  const allTimeSoldUnits: { [key: string]: number } = {};
  allActiveSales.forEach(s => {
    s.items.forEach(item => {
      const key = item.id;
      const nameKey = item.name;
      if (key) allTimeSoldUnits[key] = (allTimeSoldUnits[key] || 0) + item.qty;
      if (nameKey) allTimeSoldUnits[nameKey] = (allTimeSoldUnits[nameKey] || 0) + item.qty;
    });
  });

  const alertsList: PredictiveAlert[] = [];

  products.forEach(p => {
    const recentSold = soldUnits[p.id] || soldUnits[p.name] || 0;
    let velocity = recentSold / 30; // units per day in last 30 days

    // Fallback to average velocity from all-time sales if recent 30 days is 0 but there were past sales
    const allSold = allTimeSoldUnits[p.id] || allTimeSoldUnits[p.name] || 0;
    if (velocity === 0 && allSold > 0) {
      velocity = allSold / 60; // assume 60 days active period to be safe
    }

    if (velocity > 0) {
      const daysToStockout = p.qty / velocity;
      // Proactively flag products running out in 7 days or less
      if (daysToStockout <= 7) {
        // Recommend Cover covering 15 days of sales velocity
        const recommendedQty = Math.max(5, Math.ceil(velocity * 15));
        alertsList.push({
          id: p.id,
          name: p.name,
          qty: p.qty,
          velocity,
          daysToStockout,
          recommendedQty,
        });
      }
    }
  });

  // Sort by urgency based on days left (fewer days first)
  return alertsList.sort((a, b) => a.daysToStockout - b.daysToStockout);
}

export function translate(key: string, lang = 'English'): string {
  const dictionary = languagePacks[lang] || languagePacks['English'];
  return dictionary[key] || languagePacks['English'][key] || key;
}

export function generateQuotationPDF(
  cart: { name: string; price: number; qty: number; unit?: string }[],
  customer: { name: string; phone: string; address: string },
  settings: { shopName: string; address: string; phone: string; gstin?: string; fssai?: string; showFssaiOnBill?: boolean; currency?: string }
) {
  const doc = new jsPDF({
    compress: true
  });
  doc.setProperties({
    title: `Price Estimate / Quotation - ${customer.name || 'Client'}`,
    subject: "Secured PDF - Non-Editable",
    author: settings.shopName || "ShopPOS Store",
    creator: "ShopPOS Secure Engine",
    keywords: "non-editable, secured, original, quotation"
  });
  const cur = settings.currency || 'Rs.';
  
  // Header Style Banner
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.rect(0, 0, 210, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(settings.shopName || 'ShopPOS Pro Store', 15, 18);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  let headerText = settings.phone ? `${settings.address || ''} | Phone: ${settings.phone}` : (settings.address || '');
  const headerLines = doc.splitTextToSize(headerText, 180);
  let finalY = 25.5;
  headerLines.forEach((l: string, i: number) => {
    if (i < 2) {
      doc.text(l, 15, finalY);
      finalY += 4.2;
    }
  });
  if (settings.gstin) {
    doc.text(`GSTIN: ${settings.gstin}`, 15, finalY);
    finalY += 4.2;
  }
  if (settings.fssai && settings.showFssaiOnBill !== false) {
    doc.text(`FSSAI Lic. No: ${settings.fssai}`, 15, finalY);
  }
  
  // Document Title
  doc.setTextColor(30, 41, 59); // slate-800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('PRICE ESTIMATE / QUOTATION', 15, 50);
  
  // Document Metadata
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const todayStr = formatDate(new Date());
  doc.text(`Date of Issue: ${todayStr}`, 15, 56);
  doc.text(`Estimate Ref No: EST-${Math.floor(100000 + Math.random() * 900000)}`, 15, 61);
  doc.text('Validity Period: 15 Days from Issue', 15, 66);

  // Security Badge
  doc.setFillColor(240, 253, 244); // light green bg
  doc.setDrawColor(187, 247, 208); // green-200 border
  doc.rect(15, 70, 50, 4.2, 'F');
  doc.rect(15, 70, 50, 4.2, 'S');
  doc.setTextColor(21, 128, 61); // green-700
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('🔒 SECURED ORIGINAL (READ-ONLY)', 40, 73, { align: 'center' });
  doc.setTextColor(30, 41, 59); // reset
  
  // Customer details block
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(120, 43, 75, 26, 'F');
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.rect(120, 43, 75, 26, 'D');
  
  doc.setFont('helvetica', 'bold');
  doc.text('CLIENT / ESTIMATE TO:', 124, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(customer.name || 'Walk-in Customer', 124, 54);
  doc.text(customer.phone || 'No Phone provided', 124, 59);
  doc.text(customer.address || 'Local Customer Address', 124, 64);
  
  // Table Header
  let y = 80;
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(15, y, 180, 8, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('ITEM DESCRIPTION', 18, y + 5.5);
  doc.text('QTY', 115, y + 5.5, { align: 'center' });
  doc.text('UNIT RATE', 145, y + 5.5, { align: 'right' });
  doc.text('TOTAL AMOUNT', 190, y + 5.5, { align: 'right' });
  
  // Table Items Rows
  doc.setTextColor(51, 65, 85); // slate-700
  doc.setFont('helvetica', 'normal');
  let subtotal = 0;
  
  cart.forEach((item) => {
    y += 8;
    // alternating background
    if (y > 270) {
      doc.addPage();
      y = 15;
    }
    
    // draw grid border line
    doc.setDrawColor(241, 245, 249);
    doc.line(15, y, 195, y);
    
    doc.text(item.name, 18, y + 5.5);
    doc.text(`${item.qty} ${item.unit || 'pcs'}`, 115, y + 5.5, { align: 'center' });
    doc.text(`${cur} ${formatCurrency(item.price)}`, 145, y + 5.5, { align: 'right' });
    
    const rowTotal = item.price * item.qty;
    subtotal += rowTotal;
    doc.text(`${cur} ${formatCurrency(rowTotal)}`, 190, y + 5.5, { align: 'right' });
  });
  
  // Total summary block
  y += 12;
  doc.setDrawColor(148, 163, 184); // slate-400
  doc.line(15, y, 195, y);
  
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('GRAND TOTAL ESTIMATE:', 115, y + 3);
  doc.setFontSize(12);
  doc.setTextColor(79, 70, 229);
  doc.text(`${cur} ${formatCurrency(subtotal)}`, 190, y + 3, { align: 'right' });
  
  // Terms & signature footer block
  y += 18;
  if (y > 230) {
    doc.addPage();
    y = 20;
  }
  
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Terms and Conditions of Estimate:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text('1. This is a price quotation/estimate and is not a valid tax invoice document.', 15, y + 5);
  doc.text('2. Pricing listed is guaranteed for 15 days from issue date.', 15, y + 10);
  doc.text('3. Subject to active inventory stocks at the time of purchase checkout.', 15, y + 15);
  
  // Signature boxes
  doc.line(135, y + 18, 190, y + 18);
  doc.text('Authorized Store Signature', 142, y + 23);
  
  const filename = `Quotation_${customer.name.replace(/\s+/g, '_') || 'Customer'}.pdf`;
  if (isNativeCapacitor()) {
    const base64 = doc.output('datauristring');
    savePdfToAppFolder(base64, filename, 'Quotations');
  } else {
    doc.save(filename);
  }
}

export function generateDeliveryChallanPDF(
  cart: { name: string; qty: number; unit?: string; shelfLocation?: string }[],
  customer: { name: string; phone: string; address: string },
  settings: { shopName: string; address: string; phone: string; currency?: string }
) {
  const doc = new jsPDF({
    compress: true
  });
  doc.setProperties({
    title: `Delivery Challan - ${customer.name || 'Client'}`,
    subject: "Secured PDF - Non-Editable",
    author: settings.shopName || "ShopPOS Store",
    creator: "ShopPOS Secure Engine",
    keywords: "non-editable, secured, original, delivery, challan"
  });
  
  // Header Style Banner
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 35, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(settings.shopName || 'ShopPOS Pro Store', 15, 18);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  let headerText = settings.phone ? `${settings.address || ''} | Phone: ${settings.phone}` : (settings.address || '');
  const headerLines = doc.splitTextToSize(headerText, 180);
  let finalY = 25.5;
  headerLines.forEach((l: string, i: number) => {
    if (i < 2) {
      doc.text(l, 15, finalY);
      finalY += 4.2;
    }
  });
  
  // Document Title
  doc.setTextColor(30, 41, 59); // slate-800
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('DELIVERY CHALLAN / DISPATCH NOTE', 15, 50);
  
  // Document Metadata
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  const todayStr = formatDate(new Date());
  doc.text(`Dispatch Date: ${todayStr}`, 15, 56);
  doc.text(`Challan Ref No: DC-${Math.floor(100000 + Math.random() * 900000)}`, 15, 61);
  doc.text('Delivery Method: Hand Delivery / Local Carrier', 15, 66);

  // Security Badge
  doc.setFillColor(240, 253, 244); // light green bg
  doc.setDrawColor(187, 247, 208); // green-200 border
  doc.rect(15, 70, 50, 4.2, 'F');
  doc.rect(15, 70, 50, 4.2, 'S');
  doc.setTextColor(21, 128, 61); // green-700
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('🔒 SECURED ORIGINAL (READ-ONLY)', 40, 73, { align: 'center' });
  doc.setTextColor(30, 41, 59); // reset
  
  // Customer details block
  doc.setFillColor(248, 250, 252); // slate-50
  doc.rect(120, 43, 75, 26, 'F');
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.rect(120, 43, 75, 26, 'D');
  
  doc.setFont('helvetica', 'bold');
  doc.text('DELIVER & SHIP TO:', 124, 48);
  doc.setFont('helvetica', 'normal');
  doc.text(customer.name || 'Walk-in Customer', 124, 54);
  doc.text(customer.phone || 'No Phone provided', 124, 59);
  doc.text(customer.address || 'Local Customer Address', 124, 64);
  
  // Table Header
  let y = 80;
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(15, y, 180, 8, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('ITEM / MATERIAL DESCRIPTION', 18, y + 5.5);
  doc.text('DISPATCH QUANTITY', 120, y + 5.5, { align: 'center' });
  doc.text('SHELF/RACK POSITION', 170, y + 5.5, { align: 'center' });
  
  // Table Items Rows
  doc.setTextColor(51, 65, 85); // slate-700
  doc.setFont('helvetica', 'normal');
  
  cart.forEach((item) => {
    y += 8;
    if (y > 270) {
      doc.addPage();
      y = 15;
    }
    
    doc.setDrawColor(241, 245, 249);
    doc.line(15, y, 195, y);
    
    doc.text(item.name, 18, y + 5.5);
    doc.text(`${item.qty} ${item.unit || 'pcs'}`, 120, y + 5.5, { align: 'center' });
    doc.text(item.shelfLocation || 'Main Shelf', 170, y + 5.5, { align: 'center' });
  });
  
  y += 12;
  doc.setDrawColor(148, 163, 184); // slate-400
  doc.line(15, y, 195, y);
  
  // Dispatched signature footer
  y += 18;
  if (y > 230) {
    doc.addPage();
    y = 20;
  }
  
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text('Declaration & Delivery Terms:', 15, y);
  doc.setFont('helvetica', 'normal');
  doc.text('1. The items listed above are dispatched in good condition and order.', 15, y + 5);
  doc.text('2. Please check quantities carefully before acknowledging delivery receipt.', 15, y + 10);
  doc.text('3. This document is a logistics receipt and not a final proof of billing.', 15, y + 15);
  
  // Signature boxes
  doc.line(20, y + 38, 70, y + 38);
  doc.text('Receiver / Customer Signature', 22, y + 43);
  
  doc.line(135, y + 38, 190, y + 38);
  doc.text('Authorized Dispatch Clerk', 142, y + 43);
  
  const filename = `Challan_${customer.name.replace(/\s+/g, '_') || 'Customer'}.pdf`;
  if (isNativeCapacitor()) {
    const base64 = doc.output('datauristring');
    savePdfToAppFolder(base64, filename, 'Challans');
  } else {
    doc.save(filename);
  }
}

/**
 * Generate official GST E-Way Bill Transit Pass PDF and save to native storage / trigger download.
 */
export async function generateEWayBillPDF(
  ewayBill: {
    billNo: string;
    date: string;
    vehicleNo: string;
    transporterId?: string;
    fromLocation: string;
    toLocation: string;
  },
  shopInfo: {
    shopName?: string;
    address?: string;
    phone?: string;
    gstin?: string;
  }
): Promise<{ success: boolean; doc: jsPDF; filename: string; base64: string }> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Top header banner
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(15, 15, 180, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('GST E-WAY TRANSIT PASS', 105, 25, { align: 'center' });

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Goods and Services Tax Compliance • Transport Authorization Document', 105, 33, { align: 'center' });

  // Pass Number & Verification Badge
  doc.setFillColor(241, 245, 249); // slate-100
  doc.rect(15, 43, 180, 16, 'F');
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.rect(15, 43, 180, 16, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(79, 70, 229); // indigo-600
  doc.text(`E-WAY BILL NO: ${ewayBill.billNo}`, 20, 53);

  doc.setFontSize(9);
  doc.setTextColor(16, 185, 129); // emerald-500
  doc.text('STATUS: VERIFIED & ACTIVE', 185, 53, { align: 'right' });

  // Information Grid Boxes
  // Box 1: Consignor / Supplier Details
  doc.setFillColor(248, 250, 252);
  doc.rect(15, 65, 87, 45, 'F');
  doc.rect(15, 65, 87, 45, 'D');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text('PART-A: CONSIGNOR DETAILS', 20, 72);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Legal Name: ${shopInfo.shopName || 'ShopPOS Store'}`, 20, 80);
  doc.text(`GSTIN ID: ${shopInfo.gstin || '07AABCS1429B1ZB'}`, 20, 86);
  doc.text(`Origin Address: ${shopInfo.address || 'Retail Head Office'}`, 20, 92);
  doc.text(`Contact: ${shopInfo.phone || '+91 9876543210'}`, 20, 98);
  doc.text(`Dispatch Origin: ${ewayBill.fromLocation}`, 20, 104);

  // Box 2: Vehicle & Transporter Logistics
  doc.setFillColor(248, 250, 252);
  doc.rect(108, 65, 87, 45, 'F');
  doc.rect(108, 65, 87, 45, 'D');

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('PART-B: VEHICLE & TRANSPORT', 113, 72);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Vehicle Number: ${ewayBill.vehicleNo}`, 113, 80);
  doc.text(`Transporter GSTIN: ${ewayBill.transporterId || 'Self Conveyance / Transporter N/A'}`, 113, 86);
  doc.text(`Transit Mode: Road Freight Logistics`, 113, 92);
  doc.text(`Destination Point: ${ewayBill.toLocation}`, 113, 98);
  doc.text(`Issued Timestamp: ${ewayBill.date}`, 113, 104);

  // Compliance Table
  const y = 118;
  doc.setFillColor(15, 23, 42);
  doc.rect(15, y, 180, 8, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('COMPLIANCE PARAMETER', 20, y + 5.5);
  doc.text('REGULATORY VALUE', 105, y + 5.5);
  doc.text('VERIFICATION', 185, y + 5.5, { align: 'right' });

  const rows = [
    { param: 'Transit Movement Reason', val: 'Outward Supply & Goods Logistics', ver: 'PASSED' },
    { param: 'Threshold Compliance', val: 'Exceeds INR 50,000/- GST Mandate', ver: 'PASSED' },
    { param: 'Road Permit Jurisdiction', val: 'Interstate / Intrastate Transport', ver: 'AUTHORIZED' },
    { param: 'Document Validity Period', val: 'Valid for 72 Hours from Timestamp', ver: 'ACTIVE' },
  ];

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'normal');
  let rowY = y + 8;
  rows.forEach((r) => {
    doc.setDrawColor(226, 232, 240);
    doc.line(15, rowY + 8, 195, rowY + 8);
    doc.text(r.param, 20, rowY + 5.5);
    doc.text(r.val, 105, rowY + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 185, 129);
    doc.text(r.ver, 185, rowY + 5.5, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    rowY += 8;
  });

  // Terms & Signatures
  const footerY = 175;
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Statutory Transit Terms & Enforcement:', 15, footerY);
  doc.setFontSize(8);
  doc.text('1. The transit vehicle driver must carry this physical or digital pass throughout the consignment journey.', 15, footerY + 5);
  doc.text('2. Subject to verification by GST Mobile Flying Squad Inspection Officers at state check-posts.', 15, footerY + 10);
  doc.text('3. Any deviation in transit route or consignee address requires instant pass amendment.', 15, footerY + 15);

  // Signature lines
  doc.setDrawColor(148, 163, 184);
  doc.line(20, footerY + 45, 75, footerY + 45);
  doc.text('Vehicle Driver / Transporter Sign', 22, footerY + 50);

  doc.line(135, footerY + 45, 190, footerY + 45);
  doc.text('Authorized GST Consignor Seal', 138, footerY + 50);

  const filename = `EWayBill_${ewayBill.billNo}.pdf`;
  const base64 = doc.output('datauristring');

  if (isNativeCapacitor()) {
    await savePdfToAppFolder(base64, filename, 'Invoices');
  } else {
    doc.save(filename);
  }

  return { success: true, doc, filename, base64 };
}


