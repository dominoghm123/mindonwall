import type { Asset } from '../types';

const DB_NAME = 'mindonwall-assets';
const DB_VERSION = 1;
const STORE_NAME = 'assets';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export class IndexedDBAdapter {
  /** 保存或更新 Asset 元数据 */
  async putAsset(asset: Asset): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(asset);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }

  /** 获取单个 Asset */
  async getAsset(id: string): Promise<Asset | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(id);
      req.onsuccess = () => { db.close(); resolve(req.result as Asset | null); };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  }

  /** 删除 Asset */
  async deleteAsset(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }

  /** 获取所有 Assets */
  async getAllAssets(): Promise<Asset[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => { db.close(); resolve(req.result as Asset[]); };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  }

  /** 存储图片二进制数据（Blob） */
  async putBlob(storageKey: string, blob: Blob): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ id: storageKey, blob });
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  }

  /** 获取图片二进制数据 */
  async getBlob(storageKey: string): Promise<Blob | null> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(storageKey);
      req.onsuccess = () => {
        db.close();
        const result = req.result as { blob?: Blob } | undefined;
        resolve(result?.blob ?? null);
      };
      req.onerror = () => { db.close(); reject(req.error); };
    });
  }
}
