// Intelligent Data Saver & Network Information Manager
import { idbStorage } from './idbStorage';

export type DataSaverMode = 'auto' | 'on' | 'off';

export interface NetworkInfo {
  type?: string; // 'wifi' | 'cellular' | 'bluetooth' | 'ethernet' | 'none' | 'unknown'
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  saveData?: boolean;
  downlink?: number; // Mb/s
  rtt?: number; // ms
  online?: boolean;
}

/**
 * Generate unique idempotency key for transactions/actions
 */
export function generateIdempotencyKey(prefix: string = 'tx'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

class DataSaverManager {
  private mode: DataSaverMode = 'auto';
  private networkInfo: NetworkInfo = {};
  private listeners: Set<(isSaving: boolean, mode: DataSaverMode) => void> = new Set();
  private requestCache: Map<string, { promise: Promise<any>; timestamp: number }> = new Map();
  private dataSavedBytes: number = 0;

  constructor() {
    // Load persisted mode
    try {
      const savedMode = localStorage.getItem('zone_data_saver_mode') as DataSaverMode;
      if (savedMode && ['auto', 'on', 'off'].includes(savedMode)) {
        this.mode = savedMode;
      }
      const savedBytes = localStorage.getItem('zone_data_saved_bytes');
      if (savedBytes) {
        this.dataSavedBytes = parseInt(savedBytes, 10) || 0;
      }
    } catch {}

    this.updateNetworkInfo();
    this.initNetworkListeners();
  }

  private updateNetworkInfo() {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine !== false : true;
    let netType: string | undefined = undefined;
    let effectiveType: 'slow-2g' | '2g' | '3g' | '4g' | undefined = undefined;
    let saveData = false;
    let downlink: number | undefined = undefined;
    let rtt: number | undefined = undefined;

    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn) {
        netType = conn.type;
        effectiveType = conn.effectiveType;
        saveData = conn.saveData === true;
        downlink = conn.downlink;
        rtt = conn.rtt;
      }
    }

    this.networkInfo = {
      type: netType,
      effectiveType,
      saveData,
      downlink,
      rtt,
      online: isOnline
    };
  }

  private initNetworkListeners() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.updateNetworkInfo();
        this.notifyListeners();
      });
      window.addEventListener('offline', () => {
        this.updateNetworkInfo();
        this.notifyListeners();
      });
    }

    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const conn = (navigator as any).connection;
      if (conn && typeof conn.addEventListener === 'function') {
        conn.addEventListener('change', () => {
          this.updateNetworkInfo();
          this.notifyListeners();
        });
      }
    }

    // Background tab visibility handling
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          // Clear stale in-flight cache on resume
          this.clearOldCache();
        }
      });
    }
  }

  public isOnline(): boolean {
    if (typeof navigator !== 'undefined') {
      return navigator.onLine !== false;
    }
    return true;
  }

  public getMode(): DataSaverMode {
    return this.mode;
  }

  public setMode(mode: DataSaverMode) {
    this.mode = mode;
    try {
      localStorage.setItem('zone_data_saver_mode', mode);
    } catch {}
    this.notifyListeners();
  }

  public getNetworkInfo(): NetworkInfo {
    this.updateNetworkInfo();
    return this.networkInfo;
  }

  /**
   * Returns true if Data Saver mode is currently active (either forced ON or AUTO on mobile/slow connection)
   */
  public isDataSaverActive(): boolean {
    if (this.mode === 'on') return true;
    if (this.mode === 'off') return false;

    // In 'auto' mode: check browser Save-Data header, connection type, or effective speed
    this.updateNetworkInfo();
    if (this.networkInfo.saveData) return true;
    if (this.networkInfo.type === 'cellular') return true;
    if (this.networkInfo.effectiveType === 'slow-2g' || this.networkInfo.effectiveType === '2g' || this.networkInfo.effectiveType === '3g') {
      return true;
    }

    return false;
  }

  public isMobileConnection(): boolean {
    this.updateNetworkInfo();
    return this.networkInfo.type === 'cellular' || 
           this.networkInfo.effectiveType === '2g' || 
           this.networkInfo.effectiveType === '3g' || 
           this.networkInfo.saveData === true;
  }

  public subscribe(listener: (isSaving: boolean, mode: DataSaverMode) => void): () => void {
    this.listeners.add(listener);
    // Initial trigger
    listener(this.isDataSaverActive(), this.mode);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    const isSaving = this.isDataSaverActive();
    this.listeners.forEach(l => l(isSaving, this.mode));
  }

  public recordDataSaved(bytes: number) {
    if (bytes > 0) {
      this.dataSavedBytes += bytes;
      try {
        localStorage.setItem('zone_data_saved_bytes', this.dataSavedBytes.toString());
      } catch {}
    }
  }

  public getDataSavedFormatted(): string {
    if (this.dataSavedBytes < 1024) return `${this.dataSavedBytes} B`;
    if (this.dataSavedBytes < 1024 * 1024) return `${(this.dataSavedBytes / 1024).toFixed(1)} KB`;
    return `${(this.dataSavedBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  public resetDataSavedStats() {
    this.dataSavedBytes = 0;
    try {
      localStorage.setItem('zone_data_saved_bytes', '0');
    } catch {}
  }

  /**
   * Transforms an image URL into a lightweight, compressed WebP thumbnail URL when Data Saver is active
   */
  public getOptimizedImageUrl(url: string | undefined, options: { width?: number; quality?: number } = {}): string {
    if (!url) return '';
    if (!this.isDataSaverActive()) return url;

    const targetWidth = options.width || 480;
    const targetQuality = options.quality || 50;

    // 1. If it's an Unsplash image
    if (url.includes('images.unsplash.com')) {
      const cleanUrl = url.split('?')[0];
      return `${cleanUrl}?w=${targetWidth}&q=${targetQuality}&auto=format&fit=crop`;
    }

    // 2. If it's a Picsum photo
    if (url.includes('picsum.photos')) {
      return url.replace(/\/\d+\/\d+/, `/${targetWidth}/${targetWidth}`);
    }

    // 3. If it's an internal /uploads/ endpoint, append sizing params
    if (url.startsWith('/uploads/') || url.includes('/uploads/')) {
      const sep = url.includes('?') ? '&' : '?';
      return `${url}${sep}w=${targetWidth}&q=${targetQuality}&thumb=1`;
    }

    return url;
  }

  /**
   * Returns whether background videos or media should autoplay
   */
  public shouldAutoplayMedia(): boolean {
    if (typeof document !== 'undefined' && document.hidden) return false;
    return !this.isDataSaverActive();
  }

  /**
   * Dynamically adjusts polling interval according to data saver & background state
   */
  public getPollingInterval(baseIntervalMs: number): number {
    if (typeof document !== 'undefined' && document.hidden) {
      // Pause completely in background
      return 0;
    }
    if (this.isDataSaverActive()) {
      // Scale interval up by 3x (e.g. 15s -> 45s) on mobile data
      return Math.max(baseIntervalMs * 3, 30000);
    }
    return baseIntervalMs;
  }

  /**
   * Request Deduplication & Short-TTL caching helper to prevent duplicate network calls
   */
  public async dedupedFetch<T = any>(
    url: string, 
    options?: RequestInit, 
    ttlMs: number = 3000
  ): Promise<T> {
    const isGet = !options || !options.method || options.method.toUpperCase() === 'GET';
    const cacheKey = isGet ? `${url}_${JSON.stringify(options?.headers || {})}` : '';

    if (isGet && cacheKey) {
      const cached = this.requestCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < ttlMs) {
        return cached.promise as Promise<T>;
      }
    }

    // Add Save-Data header if data saver is active
    const headers = new Headers(options?.headers || {});
    if (this.isDataSaverActive()) {
      headers.set('Save-Data', 'on');
    }

    const fetchPromise = fetch(url, {
      ...options,
      headers
    }).then(async (res) => {
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      return res.json();
    }).finally(() => {
      // Clean up after TTL expires
      setTimeout(() => {
        if (cacheKey) this.requestCache.delete(cacheKey);
      }, ttlMs);
    });

    if (isGet && cacheKey) {
      this.requestCache.set(cacheKey, { promise: fetchPromise, timestamp: Date.now() });
    }

    return fetchPromise;
  }

  /**
   * Stale-While-Revalidate pattern using IndexedDB cache
   * Immediately returns cached data if available, while seamlessly updating from network in the background
   */
  public async swrFetch<T = any>(
    cacheKey: string,
    fetcher: () => Promise<T>,
    onBackgroundUpdate?: (freshData: T) => void
  ): Promise<T> {
    // 1. Try to read from IndexedDB first
    const cachedData = await idbStorage.get<T>(cacheKey);

    // 2. Trigger network fetch in background or as primary
    const networkPromise = fetcher()
      .then(async (freshData) => {
        if (freshData) {
          await idbStorage.set(cacheKey, freshData);
          if (cachedData && onBackgroundUpdate) {
            onBackgroundUpdate(freshData);
          }
        }
        return freshData;
      })
      .catch((err) => {
        if (cachedData) {
          // Graceful fallback to cache on network failure
          return cachedData;
        }
        throw err;
      });

    // If cache is immediately available, return it!
    if (cachedData !== null && cachedData !== undefined) {
      // Fire-and-forget background revalidation
      networkPromise.catch(() => {});
      return cachedData;
    }

    // If no cache, wait for network
    return networkPromise;
  }

  public clearOldCache() {
    const now = Date.now();
    for (const [key, item] of this.requestCache.entries()) {
      if (now - item.timestamp > 10000) {
        this.requestCache.delete(key);
      }
    }
  }
}

export const dataSaver = new DataSaverManager();
