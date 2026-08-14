/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppDatabase, Product, Sale, Customer, Expense, Supplier, Staff, PurchaseOrder, Estimate, DeliveryChallan, CreditDebitNote, Branch, StaffActivityLog, Settings, Auth } from './types';

// Password hashing helper matching the original SHA-256 hex schema
export async function hashPassword(pw: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pw + '_shoppos_salt_v2');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const DB_NAME = 'ShopPOSPro';
const DB_VERSION = 2;

export const RECORD_STORES = [
  'products',
  'sales',
  'customers',
  'expenses',
  'suppliers',
  'purchases',
  'staff',
  'estimates',
  'deliveryChallans',
  'creditDebitNotes',
  'branches',
  'staffActivityLogs',
] as const;

export type RecordStoreName = typeof RECORD_STORES[number];

export function getActiveDBKey(): string {
  const profileId = localStorage.getItem('shoppos_active_profile_id') || 'default';
  return `shoppos_db_${profileId}`;
}

export function initIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('kv')) {
        db.createObjectStore('kv', { keyPath: 'k' });
      }
      RECORD_STORES.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      });
    };
    
    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };
    
    request.onerror = () => {
      reject(new Error('IndexedDB failed to initialize'));
    };
  });
}

function getAllFromStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve) => {
    try {
      if (!db.objectStoreNames.contains(storeName)) {
        resolve([]);
        return;
      }
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

function getKV<T>(db: IDBDatabase, key: string): Promise<T | null> {
  return new Promise((resolve) => {
    try {
      if (!db.objectStoreNames.contains('kv')) {
        resolve(null);
        return;
      }
      const tx = db.transaction('kv', 'readonly');
      const store = tx.objectStore('kv');
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.v : null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function getDBFromIndexedDB(db: IDBDatabase): Promise<AppDatabase | null> {
  try {
    // 1. Check if legacy single-blob database exists in 'kv' store
    const legacyBlob = await getKV<AppDatabase>(db, getActiveDBKey());
    if (legacyBlob && typeof legacyBlob === 'object' && (legacyBlob.products || legacyBlob.settings)) {
      // Migrate legacy single blob into per-record stores
      await saveDBToIndexedDB(db, legacyBlob);
      // Clean up legacy blob to free memory and prevent re-migration
      try {
        const tx = db.transaction('kv', 'readwrite');
        tx.objectStore('kv').delete(getActiveDBKey());
      } catch (err) {
        console.warn('Could not clean up legacy blob key:', err);
      }
      return legacyBlob;
    }

    // 2. Fetch all collections in parallel from individual stores
    const [
      products,
      sales,
      customers,
      expenses,
      suppliers,
      purchases,
      staff,
      estimates,
      deliveryChallans,
      creditDebitNotes,
      branches,
      staffActivityLogs,
      settings,
      auth,
      meta,
      activeBranchId,
    ] = await Promise.all([
      getAllFromStore<Product>(db, 'products'),
      getAllFromStore<Sale>(db, 'sales'),
      getAllFromStore<Customer>(db, 'customers'),
      getAllFromStore<Expense>(db, 'expenses'),
      getAllFromStore<Supplier>(db, 'suppliers'),
      getAllFromStore<PurchaseOrder>(db, 'purchases'),
      getAllFromStore<Staff>(db, 'staff'),
      getAllFromStore<Estimate>(db, 'estimates'),
      getAllFromStore<DeliveryChallan>(db, 'deliveryChallans'),
      getAllFromStore<CreditDebitNote>(db, 'creditDebitNotes'),
      getAllFromStore<Branch>(db, 'branches'),
      getAllFromStore<StaffActivityLog>(db, 'staffActivityLogs'),
      getKV<Settings>(db, 'settings'),
      getKV<Auth>(db, 'auth'),
      getKV<{ billNo: number | string; estimateNo?: number; challanNo?: number; noteNo?: number }>(db, 'meta'),
      getKV<string>(db, 'activeBranchId'),
    ]);

    // Check if database has any existing data
    if (!settings && products.length === 0 && sales.length === 0 && !auth) {
      return null;
    }

    const defaultPwHash = await hashPassword('Shop@2024');

    const assembledDb: AppDatabase = {
      products,
      sales,
      customers,
      expenses,
      suppliers,
      purchases,
      staff,
      estimates,
      deliveryChallans,
      creditDebitNotes,
      branches: branches.length > 0 ? branches : [{ id: 'branch-1', name: 'Main Branch' }],
      activeBranchId: activeBranchId || (branches[0]?.id || 'branch-1'),
      staffActivityLogs,
      settings: settings || {
        shopName: '',
        address: '',
        phone: '',
        gstin: '',
        fssai: '',
        upi: '',
        footer: 'Thank you! Come again',
        lowStockDefault: 10,
        nearExpiryDefault: 30,
        requireStaffPin: false,
      },
      auth: auth || {
        userId: 'admin',
        pwHash: defaultPwHash,
        fpId: null,
        rpId: null,
        firstLogin: true,
        attempts: 0,
        lockUntil: 0,
      },
      meta: meta || {
        billNo: sales.length ? Math.max(...sales.map(s => typeof s.billNo === 'number' ? s.billNo : parseInt(String(s.billNo)) || 0)) + 1 : 1,
        estimateNo: 1,
        challanNo: 1,
        noteNo: 1,
      },
    };

    return assembledDb;
  } catch (err) {
    console.error('Error reading from per-record IndexedDB stores:', err);
    return null;
  }
}

export function saveDBToIndexedDB(db: IDBDatabase, data: AppDatabase): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const activeStores = [...RECORD_STORES, 'kv'].filter(s => db.objectStoreNames.contains(s));
      const tx = db.transaction(activeStores, 'readwrite');

      const syncStore = (storeName: RecordStoreName, items: any[] | undefined) => {
        if (!db.objectStoreNames.contains(storeName)) return;
        const store = tx.objectStore(storeName);
        store.clear();
        if (Array.isArray(items)) {
          items.forEach(item => {
            if (item && item.id) {
              store.put(item);
            }
          });
        }
      };

      syncStore('products', data.products);
      syncStore('sales', data.sales);
      syncStore('customers', data.customers);
      syncStore('expenses', data.expenses);
      syncStore('suppliers', data.suppliers);
      syncStore('purchases', data.purchases);
      syncStore('staff', data.staff);
      syncStore('estimates', data.estimates);
      syncStore('deliveryChallans', data.deliveryChallans);
      syncStore('creditDebitNotes', data.creditDebitNotes);
      syncStore('branches', data.branches);
      syncStore('staffActivityLogs', data.staffActivityLogs);

      if (db.objectStoreNames.contains('kv')) {
        const kvStore = tx.objectStore('kv');
        if (data.settings) kvStore.put({ k: 'settings', v: data.settings });
        if (data.auth) kvStore.put({ k: 'auth', v: data.auth });
        if (data.meta) kvStore.put({ k: 'meta', v: data.meta });
        if (data.activeBranchId) kvStore.put({ k: 'activeBranchId', v: data.activeBranchId });
      }

      tx.oncomplete = () => resolve(true);
      tx.onerror = (err) => {
        console.error('Transaction error saving to IndexedDB:', err);
        resolve(false);
      };
      tx.onabort = () => resolve(false);
    } catch (err) {
      console.error('Exception saving to per-record IndexedDB stores:', err);
      resolve(false);
    }
  });
}

/**
 * Persist or update a single record into an individual object store directly.
 */
export function saveRecord<T extends { id: string }>(db: IDBDatabase, storeName: RecordStoreName, record: T): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      if (!db.objectStoreNames.contains(storeName)) {
        resolve(false);
        return;
      }
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(record);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/**
 * Delete a single record from its individual object store directly.
 */
export function deleteRecord(db: IDBDatabase, storeName: RecordStoreName, id: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      if (!db.objectStoreNames.contains(storeName)) {
        resolve(false);
        return;
      }
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export async function estimateStorage(): Promise<{ used: number; total: number }> {
  if (navigator.storage && navigator.storage.estimate) {
    const estimate = await navigator.storage.estimate();
    return {
      used: estimate.usage || 0,
      total: estimate.quota || 0,
    };
  }
  return { used: 0, total: 0 };
}

export async function createDefaultDatabase(): Promise<AppDatabase> {
  const defaultPwHash = await hashPassword('Shop@2024');
  return {
    products: [],
    sales: [],
    customers: [],
    expenses: [],
    suppliers: [],
    purchases: [],
    staff: [],
    settings: {
      shopName: '',
      address: '',
      phone: '',
      gstin: '',
      fssai: '',
      upi: '',
      footer: 'Thank you! Come again',
      lowStockDefault: 10,
      nearExpiryDefault: 30,
      requireStaffPin: false,
      autoLogoutOnDayChange: true,
      dayChangeWarningMinutes: 5,
    },
    auth: {
      userId: 'admin',
      pwHash: defaultPwHash,
      fpId: null,
      rpId: null,
      firstLogin: true,
      attempts: 0,
      lockUntil: 0,
    },
    meta: {
      billNo: 1,
      estimateNo: 1,
      challanNo: 1,
      noteNo: 1,
    },
    estimates: [],
    deliveryChallans: [],
    creditDebitNotes: [],
    branches: [
      { id: 'branch-1', name: 'Main Branch' }
    ],
    activeBranchId: 'branch-1',
  };
}
