/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Product {
  id: string;
  name: string;
  barcode: string;
  category: string;
  supplierId: string | null;
  mrp: number;
  sellPrice: number;
  buyPrice: number;
  qty: number;
  unit: string;
  lowStockAlert: number | null;
  expiryDate: string; // YYYY-MM-DD
  nearExpiryDays: number | null;
  hsn: string;
  createdAt?: string;
  subcategory?: string;
  brand?: string;
  variant?: string;
  wholesalePrice?: number;
  mfgDate?: string; // YYYY-MM-DD
  notes?: string;
  tags?: string;
  isFavorite?: boolean;
  image?: string; // base64 image data
  gstPct?: number; // product-specific GST rate (e.g. 5, 12, 18)
  batchCode?: string;
  shelfLocation?: string; // Shelf/Rack/Bin management
  hasAltUnit?: boolean;
  altUnitName?: string;
  altUnitFactor?: number;
  bomItems?: { productId: string; qtyNeeded: number }[];
}

export interface SaleItem {
  id: string;
  name: string;
  price: number;
  mrp: number;
  buyPrice: number;
  qty: number;
  unit: string;
  returnedQty?: number;
}

export interface Sale {
  id: string;
  billNo: string | number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM AM/PM
  customer: string;
  customerPhone: string;
  customerAddress: string;
  staffId: string;
  staffName: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  gst: number;
  gstPct: number;
  total: number;
  profit: number;
  paymentMethod: 'cash' | 'upi' | 'card' | 'credit' | 'split';
  splitDetails?: { 
    cashAmount: number; 
    upiAmount: number; 
    cardAmount?: number; 
    creditAmount?: number; 
  };
  creditPaid: boolean;
  voided: boolean;
  creditCustId: string | null;
  pointsRedeemed?: number;
  interStateGst?: boolean; // toggle to split CGST/SGST or apply full IGST
}

export interface KhataEntry {
  id: string;
  date: string;
  desc: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  createdAt: string;
  khataBalance?: number; // running balance (positive = they owe)
  khataLedger?: KhataEntry[];
  loyaltyPoints?: number;
}

export interface Expense {
  id: string;
  desc: string;
  amount: number;
  category: string;
  date: string; // YYYY-MM-DD
  time: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
}

export interface PurchaseItem {
  id: string;
  name: string;
  qty: number;
  buyPrice: number;
  unit: string;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  items: PurchaseItem[];
  total: number;
  date: string; // YYYY-MM-DD
  time: string;
}

export interface Staff {
  id: string;
  name: string;
  role: string;
  phone: string;
  pin?: string;
}

export interface StaffActivityLog {
  id: string;
  staffId: string;
  staffName: string;
  loginTime: string; // ISO string or locales
  logoutTime: string | null; // ISO string, or null if active
  durationMs: number | null; // null if active
}

export interface Settings {
  shopName: string;
  address: string;
  phone: string;
  gstin: string;
  fssai?: string;
  upi: string;
  footer: string;
  lowStockDefault: number;
  nearExpiryDefault: number;
  requireStaffPin: boolean;
  autoLockSession?: boolean;
  autoLogoutOnDayChange?: boolean; // Automatic logout on date/day change at midnight
  dayChangeWarningMinutes?: number; // Advance warning before midnight (default 5 min)
  logo?: string; // base64 brand logo
  currency?: string; // currency symbol or code e.g. Rs. or ₹ or $
  language?: string; // Active UI language e.g. English, Hindi
  financialYear?: string; // e.g. 2026-27
  gstEnabled?: boolean;
  defaultGstPct?: number;

  // Bill Format Settings
  showShopNameOnBill?: boolean;
  showAddressOnBill?: boolean;
  showPhoneOnBill?: boolean;
  showGstinOnBill?: boolean;
  showFssaiOnBill?: boolean;
  showDateOnBill?: boolean;
  showCustomerOnBill?: boolean;
  showStaffOnBill?: boolean;
  showBarcodeOnBill?: boolean;
  showUpiQrOnBill?: boolean;
  showFooterOnBill?: boolean;
  showTermsOnBill?: boolean;
  termsTextOnBill?: string;
}

export interface Auth {
  userId: string;
  pwHash: string;
  fpId: string | null;
  rpId: string | null;
  firstLogin: boolean;
  attempts: number;
  lockUntil: number;
}

export interface Estimate {
  id: string;
  estimateNo: string;
  date: string;
  customer: string;
  customerPhone: string;
  customerAddress: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  gst: number;
  total: number;
  convertedToInvoice?: boolean;
  convertedInvoiceId?: string;
}

export interface DeliveryChallan {
  id: string;
  challanNo: string;
  date: string;
  customer: string;
  customerPhone: string;
  items: SaleItem[];
  total: number;
  vehicleNo?: string;
}

export interface CreditDebitNote {
  id: string;
  noteNo: string;
  type: 'credit' | 'debit';
  date: string;
  partyName: string;
  invoiceNo?: string;
  items: SaleItem[];
  total: number;
  reason: string;
}

export interface Branch {
  id: string;
  name: string;
  gstin?: string;
  address?: string;
}

export interface AppDatabase {
  products: Product[];
  sales: Sale[];
  customers: Customer[];
  expenses: Expense[];
  suppliers: Supplier[];
  purchases: PurchaseOrder[];
  staff: Staff[];
  settings: Settings;
  auth: Auth;
  meta: {
    billNo: number | string;
    estimateNo?: number;
    challanNo?: number;
    noteNo?: number;
  };
  estimates?: Estimate[];
  deliveryChallans?: DeliveryChallan[];
  creditDebitNotes?: CreditDebitNote[];
  branches?: Branch[];
  activeBranchId?: string;
  staffActivityLogs?: StaffActivityLog[];
}
