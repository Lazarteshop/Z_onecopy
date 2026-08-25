/**
 * IndexedDB Storage Helper for Z-oneApp Offline-First PWA Architecture
 * 
 * Provides asynchronous, high-capacity key-value storage for:
 * - Feed posts & comments metadata
 * - Direct messages & Group chats
 * - MyDay / Stories cache
 * - Offline Outbox queue for pending messages and posts
 */

const DB_NAME = 'zoneapp_offline_idb';
const DB_VERSION = 1;

export interface IDBOutboxItem {
  id: string;
  type: 'message' | 'post' | 'comment' | 'reaction' | 'story_view';
  url: string;
  method: 'POST' | 'PUT' | 'DELETE';
  payload: any;
  timestamp: number;
  retryCount: number;
}

class ZoneIDB {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported in this environment'));
        return;
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Key-Value Store for cached data
        if (!db.objectStoreNames.contains('keyval')) {
          db.createObjectStore('keyval');
        }

        // Dedicated Outbox store for offline sync
        if (!db.objectStoreNames.contains('outbox')) {
          const outboxStore = db.createObjectStore('outbox', { keyPath: 'id' });
          outboxStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        console.warn('IndexedDB open error:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Set a key-value item asynchronously
   */
  async set<T = any>(key: string, val: T): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('keyval', 'readwrite');
        const store = tx.objectStore('keyval');
        const req = store.put(val, key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      // Graceful fallback to localStorage if IDB fails
      try {
        localStorage.setItem(`idb_fallback_${key}`, JSON.stringify(val));
      } catch (_) {}
    }
  }

  /**
   * Get a key-value item asynchronously
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      const db = await this.getDB();
      return new Promise<T | null>((resolve, reject) => {
        const tx = db.transaction('keyval', 'readonly');
        const store = tx.objectStore('keyval');
        const req = store.get(key);
        req.onsuccess = () => resolve((req.result as T) ?? null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      // Fallback read from localStorage
      try {
        const raw = localStorage.getItem(`idb_fallback_${key}`);
        return raw ? (JSON.parse(raw) as T) : null;
      } catch (_) {
        return null;
      }
    }
  }

  /**
   * Delete a key-value item
   */
  async delete(key: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('keyval', 'readwrite');
        const store = tx.objectStore('keyval');
        const req = store.delete(key);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (_) {}
  }

  /**
   * Add an action to the offline outbox
   */
  async addToOutbox(item: Omit<IDBOutboxItem, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
    const id = `outbox_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const fullItem: IDBOutboxItem = {
      ...item,
      id,
      timestamp: Date.now(),
      retryCount: 0,
    };

    try {
      const db = await this.getDB();
      return new Promise<string>((resolve, reject) => {
        const tx = db.transaction('outbox', 'readwrite');
        const store = tx.objectStore('outbox');
        const req = store.put(fullItem);
        req.onsuccess = () => resolve(id);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      return id;
    }
  }

  /**
   * Get all queued outbox items
   */
  async getOutboxItems(): Promise<IDBOutboxItem[]> {
    try {
      const db = await this.getDB();
      return new Promise<IDBOutboxItem[]>((resolve, reject) => {
        const tx = db.transaction('outbox', 'readonly');
        const store = tx.objectStore('outbox');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (_) {
      return [];
    }
  }

  /**
   * Remove item from outbox after successful sync
   */
  async removeOutboxItem(id: string): Promise<void> {
    try {
      const db = await this.getDB();
      return new Promise<void>((resolve, reject) => {
        const tx = db.transaction('outbox', 'readwrite');
        const store = tx.objectStore('outbox');
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (_) {}
  }
}

export const idbStorage = new ZoneIDB();
