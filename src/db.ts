/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppDatabase } from './types';

// Password hashing helper matching the original SHA-256 hex schema
export async function hashPassword(pw: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pw + '_shoppos_salt_v2');
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const DB_NAME = 'ShopPOSPro';
const STORE_NAME = 'kv';

export function getActiveDBKey(): string {
  const profileId = localStorage.getItem('shoppos_active_profile_id') || 'default';
  return `shoppos_db_${profileId}`;
}

export function initIndexedDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'k' });
      }
    };
    
    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };
    
    request.onerror = () => {
      reject(new Error('IndexedDB failed to initialize'));
    };
  });
}

export function getDBFromIndexedDB(db: IDBDatabase): Promise<AppDatabase | null> {
  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(getActiveDBKey());
      
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.v as AppDatabase);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
}

export function saveDBToIndexedDB(db: IDBDatabase, data: AppDatabase): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put({ k: getActiveDBKey(), v: data });
      
      request.onsuccess = () => {
        resolve(true);
      };
      
      request.onerror = () => {
        resolve(false);
      };
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
