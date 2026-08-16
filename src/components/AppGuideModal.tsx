/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  BookOpen, 
  Download, 
  Printer, 
  X, 
  ShoppingCart, 
  Package, 
  Users, 
  FileText, 
  BarChart3, 
  Settings as SettingsIcon, 
  Percent, 
  QrCode, 
  ShieldCheck, 
  Printer as PrinterIcon, 
  Scan, 
  Sparkles, 
  CheckCircle2, 
  HelpCircle, 
  ChevronRight, 
  Search, 
  ArrowRight,
  TrendingUp,
  Tag,
  Clock,
  Sliders,
  DollarSign,
  Truck,
  Building2,
  Receipt,
  FileSpreadsheet,
  Layers,
  Archive,
  RefreshCw,
  Share2
} from 'lucide-react';
import { Settings } from '../types';
import { generateAppGuidePdf } from '../services/appGuidePdfService';
import { printPdfDocument, sharePdfDocument } from '../services/printService';

interface AppGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
}

export const AppGuideModal: React.FC<AppGuideModalProps> = ({
  isOpen,
  onClose,
  settings,
}) => {
  const [activeTab, setActiveTab] = useState<
    'workflow' | 'billing_buttons' | 'new_product_fields' | 'documents' | 'gst_math' | 'inventory_ai' | 'customer_khata' | 'suppliers_expenses' | 'staff' | 'hardware'
  >('workflow');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDownloadPdf = async () => {
    try {
      setIsExportingPdf(true);
      const { doc, base64, filename } = generateAppGuidePdf(settings);
      
      const res = await sharePdfDocument({
        pdfBase64: base64,
        filename,
        title: 'ShopPOS Pro Complete User Guide & Manual',
        subfolder: 'Documents',
      });

      if (!res.success) {
        doc.save(filename);
      }
    } catch (err: any) {
      console.error('Failed to export guide PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePrintPdf = async () => {
    try {
      setIsExportingPdf(true);
      const { base64, filename } = generateAppGuidePdf(settings);
      await printPdfDocument(base64, filename, { name: 'ShopPOS Pro User Guide' });
    } catch (err: any) {
      console.error('Failed to print guide PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const guideTabs = [
    { id: 'workflow', label: '1. Store Workflow', icon: Sparkles },
    { id: 'billing_buttons', label: '2. Billing & Buttons', icon: ShoppingCart },
    { id: 'new_product_fields', label: '3. New Product & 4 Fields', icon: Tag },
    { id: 'documents', label: '4. Documents Module', icon: FileSpreadsheet },
    { id: 'gst_math', label: '5. GST & Tax Formulas', icon: Percent },
    { id: 'inventory_ai', label: '6. Inventory & Velocity', icon: Package },
    { id: 'customer_khata', label: '7. Customer Udhaar', icon: FileText },
    { id: 'suppliers_expenses', label: '8. Suppliers & Expenses', icon: Truck },
    { id: 'staff', label: '9. Staff & Security PINs', icon: Users },
    { id: 'hardware', label: '10. Hardware & Printers', icon: PrinterIcon },
  ] as const;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-2 sm:p-4 bg-slate-950/85 backdrop-blur-md select-none animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-5xl w-full h-[92vh] flex flex-col shadow-2xl text-white overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white">ShopPOS Pro — Master User Guide</h3>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
                  v4.5 Enterprise
                </span>
              </div>
              <p className="text-xs text-slate-400">Complete guide for every module, product field, commercial document & POS button</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handlePrintPdf}
              disabled={isExportingPdf}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Print formatted A4 user guide"
            >
              <Printer className="w-4 h-4 text-slate-300" />
              <span>Print Guide</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-wider rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
              title="Download high-resolution PDF guide"
            >
              <Download className="w-4 h-4 text-white" />
              <span>{isExportingPdf ? 'Generating PDF...' : 'Download PDF Guide'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex items-center gap-1.5 p-2 px-4 bg-slate-950/40 border-b border-slate-800 overflow-x-auto scrollbar-none">
          {guideTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30 font-black'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Content Body Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* TAB 1: WORKFLOW */}
          {activeTab === 'workflow' && (
            <div className="space-y-6">
              <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-2xl p-4 sm:p-5 flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-indigo-300">Complete Store Lifecycle Architecture</h4>
                  <p className="text-xs text-slate-300 leading-relaxed mt-1">
                    ShopPOS Pro operates as a full-stack, offline-first Point of Sale running on local SQLite/IndexedDB.
                    Below is the daily flow from initial configuration to closing Z-Report rollover.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {[
                  {
                    num: '01',
                    title: 'First-Time Onboarding & Store Profile',
                    desc: 'Configures Shop Name, Phone, Address, GSTIN (15 digits), FSSAI license (14 digits), UPI ID (for Bharat QR), currency, and admin security passcode. These details automatically populate receipts and tax invoices.',
                    color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30 text-blue-400',
                  },
                  {
                    num: '02',
                    title: 'Inventory Inward & Barcode Label Generation',
                    desc: 'Add products with Selling Price, Cost/Buy Price, MRP, Current Stock Qty, Unit, Expiry Date, HSN/SAC code, and Tax %. Print sticker barcode labels for quick scanning.',
                    color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
                  },
                  {
                    num: '03',
                    title: 'Cashier Clock-in & Shift Authentication',
                    desc: 'Cashier enters staff PIN to clock-in. All subsequent billing transactions, invoice receipts, and cash drawer tallies are stamped with their active operator session.',
                    color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400',
                  },
                  {
                    num: '04',
                    title: 'POS Billing, Barcode Scan & Quick Add',
                    desc: 'Items are added to cart via physical laser barcode scanner, phone camera MLKit scanner, category quick-filter tabs, or manual search. Quantity and custom prices can be edited on the fly.',
                    color: 'from-purple-500/20 to-pink-500/10 border-purple-500/30 text-purple-400',
                  },
                  {
                    num: '05',
                    title: 'Commercial Invoicing & Multi-Payment',
                    desc: 'Select Cash (auto change calculator), dynamic Bharat QR UPI code, Card, Split Payment, or Customer Credit (Udhaar Ledger). One-tap checkout saves the sale to local database.',
                    color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-400',
                  },
                  {
                    num: '06',
                    title: 'Day-End Closing (Z-Report) & Midnight Rollover',
                    desc: 'View Daily Sales Summary, Cash in Register, Total Profit, and Category breakdown. Auto-logout system triggers at midnight to protect session logs.',
                    color: 'from-rose-500/20 to-red-500/10 border-rose-500/30 text-rose-400',
                  },
                ].map((s) => (
                  <div key={s.num} className={`bg-gradient-to-br ${s.color} border rounded-2xl p-4 space-y-2`}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700">
                        PHASE {s.num}
                      </span>
                    </div>
                    <h5 className="text-sm font-bold text-white">{s.title}</h5>
                    <p className="text-xs text-slate-300 leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: BILLING BUTTONS */}
          {activeTab === 'billing_buttons' && (
            <div className="space-y-4">
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
                <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-indigo-400" />
                  POS Billing Register — Dictionary of Every Button & Control
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Click, tap, or scan to control the register. Here is what every button does:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  {
                    btn: '📷 Barcode Scanner (Header)',
                    why: 'Instant hands-free item lookup.',
                    use: 'Activates Camera scanner with Native MLKit acceleration and HTML5 fallback. Beeps on recognition and increments cart item.',
                  },
                  {
                    btn: '🔍 Product Search Bar',
                    why: 'Find items by name, barcode, or SKU.',
                    use: 'Type letters or scan barcode. Live filter updates in under 5 milliseconds across thousands of inventory items.',
                  },
                  {
                    btn: '📁 Category Tabs',
                    why: 'Organized touchscreen navigation.',
                    use: 'Filter catalog by department (Groceries, Dairy, Beverages, Snacks, Electronics, etc.) for rapid 1-tap addition.',
                  },
                  {
                    btn: '➕ / ➖ Qty Adjusters & Unit Dropdown',
                    why: 'Fine-grain quantity control.',
                    use: 'Increase/decrease quantity. For loose items (kg, gm, ltr, mtr), tap quantity to type fractional numbers (e.g. 1.250 kg).',
                  },
                  {
                    btn: '🏷️ Add Custom Item Button',
                    why: 'Sell unlisted / misc goods without catalog setup.',
                    use: 'Opens custom dialog to type a one-off item name, price, and tax % directly into the active cart.',
                  },
                  {
                    btn: '⏸️ Hold / Suspend Cart',
                    why: 'Serve next customer without losing current customer\'s basket.',
                    use: 'Freezes current cart into temporary memory and clears stage. Click "Recall Cart" at any time to resume billing without data loss.',
                  },
                  {
                    btn: '🎁 Discount Button (% or Flat Rs.)',
                    why: 'Apply promotional offers or customer courtesy cuts.',
                    use: 'Toggle between Percentage discount (e.g. 10%) or Flat value (e.g. Rs.50). Automatically recalculates taxable base and GST.',
                  },
                  {
                    btn: '👤 Tag Customer Button',
                    why: 'Link invoice to client phone and credit ledger.',
                    use: 'Select existing client or type new phone/name. Required for Credit (Udhaar) billing and personalized WhatsApp receipts.',
                  },
                  {
                    btn: '⚡ Pay Cash Button',
                    why: 'Fast cash counter settlements.',
                    use: 'Enter cash received (e.g. ₹500 for a ₹340 bill). System immediately computes change to return: ₹160.',
                  },
                  {
                    btn: '📱 UPI Bharat QR Button',
                    why: 'Instant scan-and-pay digital settlement.',
                    use: 'Generates dynamic Bharat QR code with the exact bill amount and merchant VPA for instant customer GPay/PhonePe scan.',
                  },
                  {
                    btn: '💳 Card / POS Swipe Button',
                    why: 'Credit/Debit card machine reconciliation.',
                    use: 'Tags sale as Card payment and records card reference for end-of-day bank settlement reconciliation.',
                  },
                  {
                    btn: '📒 Customer Credit (Udhaar)',
                    why: 'B2B and neighborhood credit trust accounts.',
                    use: 'Debits customer ledger with invoice amount. Auto-updates pending balance without requiring upfront cash.',
                  },
                ].map((b, i) => (
                  <div key={i} className="bg-slate-800/40 border border-slate-700/60 rounded-xl p-3.5 space-y-2">
                    <div className="text-xs font-black text-indigo-400">{b.btn}</div>
                    <div className="text-[11px] text-slate-400">
                      <span className="font-bold text-slate-300">Why added: </span>
                      {b.why}
                    </div>
                    <div className="text-[11px] text-slate-300">
                      <span className="font-bold text-indigo-300">How used: </span>
                      {b.use}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: NEW PRODUCT / STOCK FORM (THE 4 FIELDS EXPLAINED) */}
          {activeTab === 'new_product_fields' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-indigo-950/60 border border-emerald-500/30 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <Tag className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white">Why Product Fields Exist & The 4 Pricing/Stock Fields</h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Understanding how Cost, MRP, Selling Price, and Stock Quantity power your store accounting, profit margins, and inventory alerts.
                    </p>
                  </div>
                </div>
              </div>

              {/* The 4 Core Fields Highlighted */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/60 border-2 border-amber-500/40 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-black text-[10px] uppercase">
                      Field 1
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-400">buyPrice</span>
                  </div>
                  <h5 className="text-sm font-black text-white">1. Buy / Cost Price (Wholesale Purchase Cost)</h5>
                  <p className="text-xs text-amber-200/90 font-medium">
                    <strong>Why added:</strong> To accurately calculate Cost of Goods Sold (COGS), real Gross Margins, Net Profit per receipt, and Total Store Inventory Valuation.
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>Exact Usage:</strong> Enter what you paid the supplier/distributor per unit (e.g. ₹70). When an item sells for ₹100, the system automatically logs ₹30 Gross Profit. Total store assets are calculated as <code className="text-indigo-300">Sum(Buy Price × Stock Qty)</code>.
                  </p>
                </div>

                <div className="bg-slate-800/60 border-2 border-indigo-500/40 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 font-black text-[10px] uppercase">
                      Field 2
                    </span>
                    <span className="text-xs font-mono font-bold text-indigo-400">mrp</span>
                  </div>
                  <h5 className="text-sm font-black text-white">2. Maximum Retail Price (MRP)</h5>
                  <p className="text-xs text-indigo-200/90 font-medium">
                    <strong>Why added:</strong> Statutory maximum price ceiling under Indian legal metrology and consumer protection laws.
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>Exact Usage:</strong> The official price printed on the item package (e.g. ₹100). The POS uses MRP to compute customer discounts (<code className="text-indigo-300">Savings = MRP - Selling Price</code>) printed on thermal receipts and barcode shelf tags.
                  </p>
                </div>

                <div className="bg-slate-800/60 border-2 border-emerald-500/40 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-black text-[10px] uppercase">
                      Field 3
                    </span>
                    <span className="text-xs font-mono font-bold text-emerald-400">sellPrice</span>
                  </div>
                  <h5 className="text-sm font-black text-white">3. Selling / Retail Offer Price</h5>
                  <p className="text-xs text-emerald-200/90 font-medium">
                    <strong>Why added:</strong> The actual price charged to customers at the counter, allowing competitive discounting below MRP.
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>Exact Usage:</strong> Default rate loaded into the POS cart on scan. If you sell at full MRP, set Sell Price = MRP. If offering a discount (e.g. MRP ₹100, Sell Price ₹89), customers immediately see ₹11 savings.
                  </p>
                </div>

                <div className="bg-slate-800/60 border-2 border-cyan-500/40 rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 font-black text-[10px] uppercase">
                      Field 4
                    </span>
                    <span className="text-xs font-mono font-bold text-cyan-400">qty</span>
                  </div>
                  <h5 className="text-sm font-black text-white">4. Current Stock Quantity</h5>
                  <p className="text-xs text-cyan-200/90 font-medium">
                    <strong>Why added:</strong> To maintain real-time physical inventory counts without manual stock audits.
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <strong>Exact Usage:</strong> Represents physical units in your store/godown. Automatically decreases on every sale and increases on supplier Purchase Order inward. Triggers Low Stock Alerts and feeds AI Velocity predictions.
                  </p>
                </div>
              </div>

              {/* Other Important Product Fields */}
              <div className="bg-slate-800/40 border border-slate-700/70 rounded-2xl p-4 space-y-3">
                <h5 className="text-sm font-bold text-indigo-300">Additional Essential Product Attributes</h5>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                    <span className="font-bold text-white">Unit of Measure (unit):</span> pieces, kg, gm, ltr, box, mtr. Controls whether the register allows decimal quantities (e.g. 1.250 kg) or discrete units.
                  </div>
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                    <span className="font-bold text-white">GST Tax Rate & HSN/SAC Code:</span> 0%, 5%, 12%, 18%, 28%. Automatically splits into CGST + SGST on invoice print and GSTR-1 audit export.
                  </div>
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                    <span className="font-bold text-white">Low Stock Threshold:</span> Flags items with warning badges when stock dips below threshold (e.g. &lt; 10 units).
                  </div>
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                    <span className="font-bold text-white">Batch Code & Expiry Date:</span> Tracks batch freshness and locks expired items from accidental billing.
                  </div>
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                    <span className="font-bold text-white">Alternate Units & Factor:</span> Allows inwarding in bulk cartons (1 Box = 12 Pcs) and selling in loose individual units.
                  </div>
                  <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                    <span className="font-bold text-white">BOM / Manufacturing Recipe:</span> Links raw materials to finished goods (e.g. selling 1 Burger auto-deducts Buns, Patty, Cheese).
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DOCUMENTS MODULE */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900 to-blue-950/60 border border-cyan-500/30 rounded-2xl p-4 sm:p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white">Commercial Documents & Invoicing Module</h4>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Comprehensive trade documents covering quotations, supplier orders, goods transport, and sales returns.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    code: 'EST',
                    title: '1. Quotations & Estimates (Proforma Invoices)',
                    why: 'Why it is used: In B2B sales and high-value orders, clients require a formal price proposal before agreeing to purchase.',
                    use: 'How it works: Create an estimate with itemized prices, discounts, and customer details. Click "Share WhatsApp" or "Print PDF". When approved, click "Convert to Cart" to instantly push all items into the POS billing register without retyping.',
                    color: 'text-indigo-400 border-indigo-500/30 bg-indigo-950/20',
                  },
                  {
                    code: 'PO',
                    title: '2. Purchase Orders (PO)',
                    why: 'Why it is used: Formal commercial order issued to suppliers/vendors to request stock replenishment.',
                    use: 'How it works: Generates an official PO with supplier details, required item quantities, and expected buy rates. Tracks order status ("Draft", "Sent", "Received"). Upon goods delivery, click "Receive Goods" to auto-increment inventory stock.',
                    color: 'text-amber-400 border-amber-500/30 bg-amber-950/20',
                  },
                  {
                    code: 'DC',
                    title: '3. Delivery Challans (Dispatch Slips)',
                    why: 'Why it is used: Transport documentation to accompany goods during transit without disclosing financial invoice values to delivery drivers or logistics.',
                    use: 'How it works: Records Vehicle Number, Driver/Transporter, Dispatch Date, and itemized physical quantities. Serves as legal delivery proof signed by the recipient upon handover.',
                    color: 'text-cyan-400 border-cyan-500/30 bg-cyan-950/20',
                  },
                  {
                    code: 'CN',
                    title: '4. Credit Notes & Sales Returns (CN)',
                    why: 'Why it is used: Issued to a customer when they return damaged, expired, or incorrect goods after an invoice has already been punched.',
                    use: 'How it works: Records return amount and reason (e.g. "Expired Batch Return"). Automatically reduces the customer\'s pending Udhaar debt or issues store credit for future billing.',
                    color: 'text-rose-400 border-rose-500/30 bg-rose-950/20',
                  },
                  {
                    code: 'DN',
                    title: '5. Debit Notes (DN)',
                    why: 'Why it is used: Issued to suppliers/vendors when returning damaged inwards or claiming rate discrepancy refunds.',
                    use: 'How it works: Debits the supplier\'s accounts payable ledger, reducing the amount owed to the vendor on the next invoice.',
                    color: 'text-orange-400 border-orange-500/30 bg-orange-950/20',
                  },
                  {
                    code: 'EWB',
                    title: '6. E-Way Bills (Part-A & Part-B)',
                    why: 'Why it is used: Statutory compliance under Indian GST law for commercial goods transport exceeding ₹50,000 consignment value.',
                    use: 'How it works: Generates E-Way Bill format with Transporter ID, Vehicle Number, Consignor/Consignee GSTIN, and HSN summary for highway transport check-posts.',
                    color: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20',
                  },
                  {
                    code: 'IBT',
                    title: '7. Inter-Branch Stock Transfers',
                    why: 'Why it is used: For multi-outlet businesses moving goods between main warehouse/godown and retail branches.',
                    use: 'How it works: Deducts stock from Source Branch and increments stock at Destination Branch with audit tracking.',
                    color: 'text-purple-400 border-purple-500/30 bg-purple-950/20',
                  },
                  {
                    code: 'CAT',
                    title: '8. Digital WhatsApp Product Catalog',
                    why: 'Why it is used: Enables customers to browse your live product catalog, prices, and stock availability on their smartphones.',
                    use: 'How it works: Generates a shareable WhatsApp digital storefront link that customers can open to place orders directly.',
                    color: 'text-teal-400 border-teal-500/30 bg-teal-950/20',
                  },
                ].map((d) => (
                  <div key={d.code} className={`border rounded-2xl p-4 space-y-2.5 ${d.color}`}>
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded-md bg-slate-900/80 border border-slate-700 font-mono font-bold text-xs">
                        {d.code}
                      </span>
                    </div>
                    <h5 className="text-sm font-black text-white">{d.title}</h5>
                    <p className="text-xs text-slate-300">{d.why}</p>
                    <p className="text-xs text-slate-400 leading-relaxed">{d.use}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: GST MATH */}
          {activeTab === 'gst_math' && (
            <div className="space-y-6">
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
                <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-indigo-400" />
                  GST Calculation Rules & Mathematical Proofs
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  How tax splits, inclusive extraction, and net profit margins are calculated in ShopPOS Pro:
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/40 border border-indigo-500/30 rounded-2xl p-4 space-y-3">
                  <h5 className="text-xs font-black text-indigo-400 uppercase tracking-wider">
                    A. Tax Exclusive (Added On Top)
                  </h5>
                  <div className="bg-slate-900/80 rounded-xl p-3 font-mono text-[11px] text-slate-300 space-y-1.5 border border-slate-800">
                    <div>Taxable Base = (Price × Qty) - Discount</div>
                    <div>CGST (9%) = Taxable Base × 9 / 100</div>
                    <div>SGST (9%) = Taxable Base × 9 / 100</div>
                    <div className="text-indigo-300 font-bold">Total Bill = Taxable Base + CGST + SGST</div>
                  </div>
                  <div className="text-xs text-slate-400">
                    <strong>Worked Example (@ ₹1,000 with 18% GST):</strong>
                    <div className="text-emerald-400 font-mono mt-1">
                      Base: ₹1,000 + CGST: ₹90 + SGST: ₹90 = ₹1,180.00
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/40 border border-emerald-500/30 rounded-2xl p-4 space-y-3">
                  <h5 className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                    B. Tax Inclusive (Included in MRP)
                  </h5>
                  <div className="bg-slate-900/80 rounded-xl p-3 font-mono text-[11px] text-slate-300 space-y-1.5 border border-slate-800">
                    <div>Taxable Base = MRP / (1 + (GST% / 100))</div>
                    <div>Total Included Tax = MRP - Taxable Base</div>
                    <div>CGST (Half) = Total Included Tax / 2</div>
                    <div className="text-emerald-300 font-bold">Grand Total = MRP (₹1,000)</div>
                  </div>
                  <div className="text-xs text-slate-400">
                    <strong>Worked Example (MRP ₹1,000 with 18% GST):</strong>
                    <div className="text-emerald-400 font-mono mt-1">
                      Base: ₹847.46 + CGST: ₹76.27 + SGST: ₹76.27 = ₹1,000.00
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-center">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">Net Profit Equation</div>
                <div className="text-sm font-mono font-bold text-white mt-1">
                  Net Profit = (Gross Revenue Excl Tax) - (Cost/Buy Price × Qty) - Discounts - Daily Overhead Expenses
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: INVENTORY AI */}
          {activeTab === 'inventory_ai' && (
            <div className="space-y-4">
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
                <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-400" />
                  Inventory, Barcoding & AI Predictive Stockout Velocity
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-3.5 space-y-2">
                  <h5 className="text-xs font-bold text-white">⚡ AI Predictive Stock Velocity Engine</h5>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Calculates average daily sales rate over the last 30 days:
                    <code className="block bg-slate-900 p-2 rounded-lg font-mono text-indigo-300 mt-1">
                      Daily Velocity = Units Sold in 30 Days / 30<br />
                      Days to Stockout = Current Qty / Daily Velocity
                    </code>
                    Warns store managers days before an item runs out of stock.
                  </p>
                </div>

                <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-3.5 space-y-2">
                  <h5 className="text-xs font-bold text-white">🏷️ Barcode Sticker Label Generator</h5>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Generates Code-128 and EAN-13 barcodes formatted for 50x25mm, 38x25mm thermal sticker rolls or A4 sticker sheets. Prints Store Name, Product Name, MRP, Offer Price, and Barcode.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: CUSTOMER KHATA */}
          {activeTab === 'customer_khata' && (
            <div className="space-y-4">
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
                <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  Customer Credit (Udhaar) & Khata Ledger
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Manage trust accounts, credit ceilings, partial settlements, and WhatsApp reminders.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-700 space-y-1">
                  <span className="font-bold text-white">1. Credit Sale Recording:</span> Selecting payment mode "Credit (Udhaar)" debits customer balance without requiring upfront counter cash.
                </div>
                <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-700 space-y-1">
                  <span className="font-bold text-white">2. Settlement Payments:</span> Tap "Record Payment" in Customer view to log cash/UPI payback and automatically reduce pending debt.
                </div>
                <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-700 space-y-1">
                  <span className="font-bold text-white">3. WhatsApp Balance Statements:</span> Send itemized pending ledger statements with your Bharat QR payment link with 1 click.
                </div>
                <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-700 space-y-1">
                  <span className="font-bold text-white">4. Credit Limits & Security Locks:</span> Set max credit limits (e.g. ₹5,000) to block cashiers from issuing excessive credit.
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: SUPPLIERS & EXPENSES */}
          {activeTab === 'suppliers_expenses' && (
            <div className="space-y-4">
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
                <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-indigo-400" />
                  Suppliers Directory & Daily Petty Cash Overhead
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 space-y-2">
                  <h5 className="text-xs font-bold text-amber-400 uppercase">Suppliers & Accounts Payable</h5>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Maintains vendor directory, GSTIN, payment terms, and unpaid purchase balances. Direct connection to Purchase Orders ensures inward stock matches invoiced rates.
                  </p>
                </div>

                <div className="bg-slate-800/40 border border-slate-700 rounded-xl p-4 space-y-2">
                  <h5 className="text-xs font-bold text-rose-400 uppercase">Daily Expense & Petty Cash Tracker</h5>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Tracks daily store overheads (Shop Rent, Staff Tea, Electricity Bills, Logistics/Freight, Packaging Materials). Automatically deducted from Gross Profit for real Net Store Income calculation.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 9: STAFF & SECURITY */}
          {activeTab === 'staff' && (
            <div className="space-y-4">
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
                <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  Staff Management, Security PINs & Role Access
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-slate-800/40 border border-rose-500/30 rounded-xl p-3.5 space-y-1.5">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 uppercase">Role 1</span>
                  <h5 className="text-xs font-bold text-white">ADMIN (STORE OWNER)</h5>
                  <p className="text-[11px] text-slate-300">Full access to profit reports, database wipe/restore, staff passwords, and tax settings.</p>
                </div>

                <div className="bg-slate-800/40 border border-purple-500/30 rounded-xl p-3.5 space-y-1.5">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 uppercase">Role 2</span>
                  <h5 className="text-xs font-bold text-white">STORE MANAGER</h5>
                  <p className="text-[11px] text-slate-300">Access to inventory stock adjustments, supplier purchases, and credit balances.</p>
                </div>

                <div className="bg-slate-800/40 border border-emerald-500/30 rounded-xl p-3.5 space-y-1.5">
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 uppercase">Role 3</span>
                  <h5 className="text-xs font-bold text-white">CASHIER OPERATOR</h5>
                  <p className="text-[11px] text-slate-300">Restricted access strictly to POS billing, sales returns, and shift clock-in.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 10: HARDWARE */}
          {activeTab === 'hardware' && (
            <div className="space-y-4">
              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
                <h4 className="text-sm font-bold text-indigo-300 flex items-center gap-2">
                  <PrinterIcon className="w-4 h-4 text-indigo-400" />
                  Hardware Peripherals & Thermal Printing Setup
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-700 space-y-1">
                  <span className="font-bold text-indigo-300">Thermal Bluetooth Printers (58mm/80mm):</span> Pair printer in Android Bluetooth Settings, then tap "Print via Bluetooth LE" for instant ESC/POS receipt cuts.
                </div>
                <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-700 space-y-1">
                  <span className="font-bold text-indigo-300">USB Laser / Wireless Scanners:</span> Connect scanner dongle to POS terminal. Works automatically in HID keyboard mode.
                </div>
                <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-700 space-y-1">
                  <span className="font-bold text-indigo-300">Office A4 WiFi Printers:</span> Generates multi-copy GST Tax Invoices via Android Print Spooler or browser print dialog.
                </div>
                <div className="p-3.5 bg-slate-800/40 rounded-xl border border-slate-700 space-y-1">
                  <span className="font-bold text-indigo-300">Offline SQLite / Database Backup:</span> Data is stored 100% locally. Use Settings → "Export JSON Backup" for cloud or offline storage.
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions Bar */}
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/80">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>PDF contains all high-res visual diagrams, mockups & full field reference.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Download Master PDF Guide</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
