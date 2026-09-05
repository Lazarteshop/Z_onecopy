/**
 * 🕒 Z-oneApp Monetag Central Ad Scheduler Controller
 * 
 * Strict Timezone: Asia/Manila (Philippine Standard Time, UTC+8)
 * 
 * Strict Policy:
 * 1. Monetag ads & scripts are ONLY active in two exact 60-second windows of every hour (24 hours, AM and PM):
 *    - Window 1: HH:00:00 to HH:00:59 (e.g. 1:00 AM, 1:00 PM, 2:00 AM, 2:00 PM, ..., 12:00 AM, 12:00 PM)
 *    - Window 2: HH:30:00 to HH:30:59 (e.g. 1:30 AM, 1:30 PM, 2:30 AM, 2:30 PM, ..., 12:30 AM, 12:30 PM)
 * 2. At exactly HH:01:00 and HH:31:00, all Monetag scripts/elements/triggers are automatically disabled,
 *    isolated, cleaned up from DOM, and hard-blocked until the next scheduled window.
 * 3. Outside the windows (HH:01:00–HH:29:59 and HH:31:00–HH:59:59), ZERO Monetag initialization occurs.
 * 4. Each window is strictly 60 seconds (never 1:00–1:59).
 * 5. Zero impact on unrelated Z-oneApp features (Auth, Wallet, GCash, Posts, Stories, Chat, Reels, R2, etc.).
 */

export interface ManilaTimeStatus {
  formattedTime: string;
  hours: number;
  minutes: number;
  seconds: number;
  isWithinWindow: boolean;
  activeWindowType: 'top_of_hour' | 'half_hour' | 'none';
  secondsRemainingInWindow: number;
  secondsUntilNextWindow: number;
}

export const MONETAG_VERIFICATION_TAG = '11e081287c25e53b58eb8233ab78e674';
export const MONETAG_ZONE_ID = '11201519';
export const MONETAG_SCRIPT_SRC = 'https://al5sm.com/tag.min.js';

// Check if a given Date (or current time) is within the exact HH:00:00 - HH:00:59 or HH:30:00 - HH:30:59 window in Asia/Manila
export function getManilaTimeStatus(customDate?: Date): ManilaTimeStatus {
  const targetDate = customDate || new Date();
  
  // Format accurately to Asia/Manila
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  const parts = formatter.formatToParts(targetDate);
  let hours = 0;
  let minutes = 0;
  let seconds = 0;

  for (const part of parts) {
    if (part.type === 'hour') hours = parseInt(part.value, 10) % 24;
    if (part.type === 'minute') minutes = parseInt(part.value, 10);
    if (part.type === 'second') seconds = parseInt(part.value, 10);
  }

  // Exact 60-second window checks:
  // Window 1 (:00): Minute MUST be 00, Second between 0 and 59
  // Window 2 (:30): Minute MUST be 30, Second between 0 and 59
  const isTopHour = minutes === 0 && seconds >= 0 && seconds <= 59;
  const isHalfHour = minutes === 30 && seconds >= 0 && seconds <= 59;
  const isWithinWindow = isTopHour || isHalfHour;

  const activeWindowType: 'top_of_hour' | 'half_hour' | 'none' = isTopHour
    ? 'top_of_hour'
    : isHalfHour
      ? 'half_hour'
      : 'none';
  
  const secondsRemainingInWindow = isWithinWindow ? (59 - seconds) : 0;
  
  // Calculate seconds until next window (:00:00 or :30:00)
  let secondsUntilNextWindow = 0;
  if (!isWithinWindow) {
    if (minutes < 30) {
      // Next window is at HH:30:00 of the same hour
      const minutesToHalfHour = 29 - minutes;
      const secondsToNextMinute = 60 - seconds;
      secondsUntilNextWindow = (minutesToHalfHour * 60) + secondsToNextMinute;
    } else {
      // Next window is at (HH+1):00:00 of the next hour
      const minutesToNextHour = 59 - minutes;
      const secondsToNextMinute = 60 - seconds;
      secondsUntilNextWindow = (minutesToNextHour * 60) + secondsToNextMinute;
    }
  }

  const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} Asia/Manila (UTC+8)`;

  return {
    formattedTime,
    hours,
    minutes,
    seconds,
    isWithinWindow,
    activeWindowType,
    secondsRemainingInWindow,
    secondsUntilNextWindow
  };
}

/**
 * Validates if Monetag ad can trigger at this exact instant
 */
export function canTriggerMonetagAd(customDate?: Date): boolean {
  if (typeof window === 'undefined') return false;

  // Check demo mode / admin testing override
  try {
    const isTestingLink = window.location.search.includes('testing=1') ||
      window.location.search.includes('notrack=1') ||
      window.location.search.includes('noads=1') ||
      window.sessionStorage.getItem('zone_demo_testing_mode') === 'true';
    if (isTestingLink) return false;
  } catch (e) {}

  const status = getManilaTimeStatus(customDate);
  return status.isWithinWindow;
}

class MonetagSchedulerController {
  private timer: number | null = null;
  private isCurrentlyActive: boolean = false;
  private isInitialized: boolean = false;
  private listeners: Set<(isActive: boolean, status: ManilaTimeStatus) => void> = new Set();
  private visibilityHandler: (() => void) | null = null;

  public subscribe(callback: (isActive: boolean, status: ManilaTimeStatus) => void): () => void {
    this.listeners.add(callback);
    const currentStatus = getManilaTimeStatus();
    callback(this.isCurrentlyActive, currentStatus);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public init() {
    if (typeof window === 'undefined') return;

    // Prevent duplicate timers / intervals if called multiple times (e.g. React re-render)
    if (this.isInitialized && this.timer !== null) {
      this.evaluate();
      return;
    }
    this.isInitialized = true;

    // Immediately run check
    this.evaluate();

    // High frequency interval (every 1 second) to guarantee exact :00 and :30 start and termination
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = window.setInterval(() => {
      this.evaluate();
    }, 1000);

    // Register visibility change listener with dedicated reference to prevent duplicate listeners
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
    }
    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') {
        this.evaluate();
      }
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private evaluate() {
    const status = getManilaTimeStatus();

    if (status.isWithinWindow) {
      if (!this.isCurrentlyActive) {
        this.activateWindow(status);
      }
    } else {
      if (this.isCurrentlyActive || (typeof document !== 'undefined' && document.querySelectorAll('[data-monetag-element]').length > 0)) {
        this.deactivateAndCleanup(status);
      }
    }
  }

  private activateWindow(status: ManilaTimeStatus) {
    if (this.isCurrentlyActive) return;
    this.isCurrentlyActive = true;
    if (typeof window !== 'undefined') {
      (window as any).__MONETAG_WINDOW_ACTIVE__ = true;
      (window as any).__MONETAG_BLOCKED__ = false;
    }

    try {
      if (typeof document !== 'undefined') {
        // 1. Inject verification meta tag if not present
        let meta = document.querySelector('meta[name="monetag"]') as HTMLMetaElement | null;
        if (!meta) {
          meta = document.createElement('meta');
          meta.name = 'monetag';
          meta.content = MONETAG_VERIFICATION_TAG;
          meta.setAttribute('data-monetag-element', 'meta');
          document.head.appendChild(meta);
        } else {
          meta.setAttribute('data-monetag-element', 'meta');
        }

        // 2. Inject official Monetag Zone Ad Script (Zone: 11201519, al5sm.com)
        const existingScript = document.querySelector(`script[data-zone="${MONETAG_ZONE_ID}"], script[src*="al5sm.com"]`);
        if (!existingScript) {
          const script = document.createElement('script');
          script.dataset.zone = MONETAG_ZONE_ID;
          script.src = MONETAG_SCRIPT_SRC;
          script.async = true;
          script.setAttribute('data-monetag-element', 'ad-script');
          
          const targetParent = [document.documentElement, document.body].filter(Boolean).pop() || document.head;
          targetParent.appendChild(script);
          console.log(`[MonetagScheduler] 🟢 Ad Script Injected for Zone: ${MONETAG_ZONE_ID} (${status.formattedTime})`);
        }
      }

      const windowLabel = status.activeWindowType === 'half_hour' ? ':30 Half-Hour Window' : ':00 Top-of-Hour Window';
      console.log(`[MonetagScheduler] 🟢 Monetag Window ACTIVE [${windowLabel}] (${status.formattedTime}). Window ends in ${status.secondsRemainingInWindow}s.`);
    } catch (e) {
      console.warn('[MonetagScheduler] Activation error:', e);
    }

    this.notifyListeners(true, status);
  }

  public deactivateAndCleanup(status?: ManilaTimeStatus) {
    this.isCurrentlyActive = false;
    const currentStatus = status || getManilaTimeStatus();
    
    if (typeof window !== 'undefined') {
      (window as any).__MONETAG_WINDOW_ACTIVE__ = false;
      (window as any).__MONETAG_BLOCKED__ = true;
      
      // Neutralize any global Monetag namespaces
      try {
        if ((window as any).monetag) {
          (window as any).monetag = undefined;
        }
        if ((window as any)._monetag) {
          (window as any)._monetag = undefined;
        }
      } catch (e) {}
    }

    try {
      if (typeof document !== 'undefined') {
        // Remove all elements managed or injected for Monetag
        const elements = document.querySelectorAll(
          `[data-monetag-element], ` +
          `script[data-zone="${MONETAG_ZONE_ID}"], ` +
          `script[src*="al5sm.com"], ` +
          `iframe[src*="al5sm"], ` +
          `iframe[src*="monetag"], ` +
          `div[id*="monetag"], div[class*="monetag"], div[id*="al5sm"]`
        );
        elements.forEach(el => {
          try {
            el.remove();
          } catch (e) {}
        });

        // Remove meta tag
        const meta = document.querySelector('meta[name="monetag"]');
        if (meta) {
          meta.remove();
        }
      }

      console.log(`[MonetagScheduler] 🔴 Monetag Window INACTIVE (${currentStatus.formattedTime}). Next window in ${Math.round(currentStatus.secondsUntilNextWindow / 60)}m.`);
    } catch (e) {
      console.warn('[MonetagScheduler] Cleanup error:', e);
    }

    this.notifyListeners(false, currentStatus);
  }

  private notifyListeners(isActive: boolean, status: ManilaTimeStatus) {
    this.listeners.forEach(cb => {
      try {
        cb(isActive, status);
      } catch (e) {}
    });
  }

  public getStatus(): ManilaTimeStatus {
    return getManilaTimeStatus();
  }

  public destroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.visibilityHandler && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    this.isInitialized = false;
    this.deactivateAndCleanup();
  }
}

export const monetagScheduler = new MonetagSchedulerController();

export interface MonetagTestResult {
  testName: string;
  isoString: string;
  manilaTime: string;
  expectedActive: boolean;
  actualActive: boolean;
  passed: boolean;
}

/**
 * Self-test suite for boundary verification:
 * Checks XX:00:00, XX:00:59, XX:01:00, XX:29:59, XX:30:00, XX:30:59, XX:31:00
 * across multiple hours in Asia/Manila (PST, UTC+8) for both AM and PM.
 */
export function runMonetagBoundaryTests(): {
  allPassed: boolean;
  results: MonetagTestResult[];
} {
  // Test cases constructed using ISO strings with exact +08:00 offset for Asia/Manila
  const testDates = [
    // --- Specific Boundary Tests Requested by User ---
    { name: '1:00:00 AM (XX:00:00 → ACTIVE)', date: new Date('2026-08-28T01:00:00+08:00'), expected: true },
    { name: '1:00:59 AM (XX:00:59 → ACTIVE)', date: new Date('2026-08-28T01:00:59+08:00'), expected: true },
    { name: '1:01:00 AM (XX:01:00 → INACTIVE)', date: new Date('2026-08-28T01:01:00+08:00'), expected: false },
    { name: '1:29:59 AM (XX:29:59 → INACTIVE)', date: new Date('2026-08-28T01:29:59+08:00'), expected: false },
    { name: '1:30:00 AM (XX:30:00 → ACTIVE)', date: new Date('2026-08-28T01:30:00+08:00'), expected: true },
    { name: '1:30:59 AM (XX:30:59 → ACTIVE)', date: new Date('2026-08-28T01:30:59+08:00'), expected: true },
    { name: '1:31:00 AM (XX:31:00 → INACTIVE)', date: new Date('2026-08-28T01:31:00+08:00'), expected: false },
    { name: '1:59:59 AM (XX:59:59 → INACTIVE)', date: new Date('2026-08-28T01:59:59+08:00'), expected: false },

    // --- 2:00 / 2:30 AM Sequence ---
    { name: '2:00:00 AM (XX:00:00 → ACTIVE)', date: new Date('2026-08-28T02:00:00+08:00'), expected: true },
    { name: '2:00:59 AM (XX:00:59 → ACTIVE)', date: new Date('2026-08-28T02:00:59+08:00'), expected: true },
    { name: '2:01:00 AM (XX:01:00 → INACTIVE)', date: new Date('2026-08-28T02:01:00+08:00'), expected: false },
    { name: '2:29:59 AM (XX:29:59 → INACTIVE)', date: new Date('2026-08-28T02:29:59+08:00'), expected: false },
    { name: '2:30:00 AM (XX:30:00 → ACTIVE)', date: new Date('2026-08-28T02:30:00+08:00'), expected: true },
    { name: '2:30:59 AM (XX:30:59 → ACTIVE)', date: new Date('2026-08-28T02:30:59+08:00'), expected: true },
    { name: '2:31:00 AM (XX:31:00 → INACTIVE)', date: new Date('2026-08-28T02:31:00+08:00'), expected: false },

    // --- 3:00 / 3:30 AM Sequence ---
    { name: '3:00:00 AM (XX:00:00 → ACTIVE)', date: new Date('2026-08-28T03:00:00+08:00'), expected: true },
    { name: '3:00:59 AM (XX:00:59 → ACTIVE)', date: new Date('2026-08-28T03:00:59+08:00'), expected: true },
    { name: '3:30:00 AM (XX:30:00 → ACTIVE)', date: new Date('2026-08-28T03:30:00+08:00'), expected: true },
    { name: '3:30:59 AM (XX:30:59 → ACTIVE)', date: new Date('2026-08-28T03:30:59+08:00'), expected: true },

    // --- 11:00 / 11:30 AM Sequence ---
    { name: '11:00:00 AM (XX:00:00 → ACTIVE)', date: new Date('2026-08-28T11:00:00+08:00'), expected: true },
    { name: '11:00:59 AM (XX:00:59 → ACTIVE)', date: new Date('2026-08-28T11:00:59+08:00'), expected: true },
    { name: '11:01:00 AM (XX:01:00 → INACTIVE)', date: new Date('2026-08-28T11:01:00+08:00'), expected: false },
    { name: '11:29:59 AM (XX:29:59 → INACTIVE)', date: new Date('2026-08-28T11:29:59+08:00'), expected: false },
    { name: '11:30:00 AM (XX:30:00 → ACTIVE)', date: new Date('2026-08-28T11:30:00+08:00'), expected: true },
    { name: '11:30:59 AM (XX:30:59 → ACTIVE)', date: new Date('2026-08-28T11:30:59+08:00'), expected: true },
    { name: '11:31:00 AM (XX:31:00 → INACTIVE)', date: new Date('2026-08-28T11:31:00+08:00'), expected: false },

    // --- 12:00 / 12:30 PM (Noon Sequence) ---
    { name: '12:00:00 PM (XX:00:00 → ACTIVE)', date: new Date('2026-08-28T12:00:00+08:00'), expected: true },
    { name: '12:00:59 PM (XX:00:59 → ACTIVE)', date: new Date('2026-08-28T12:00:59+08:00'), expected: true },
    { name: '12:01:00 PM (XX:01:00 → INACTIVE)', date: new Date('2026-08-28T12:01:00+08:00'), expected: false },
    { name: '12:29:59 PM (XX:29:59 → INACTIVE)', date: new Date('2026-08-28T12:29:59+08:00'), expected: false },
    { name: '12:30:00 PM (XX:30:00 → ACTIVE)', date: new Date('2026-08-28T12:30:00+08:00'), expected: true },
    { name: '12:30:59 PM (XX:30:59 → ACTIVE)', date: new Date('2026-08-28T12:30:59+08:00'), expected: true },
    { name: '12:31:00 PM (XX:31:00 → INACTIVE)', date: new Date('2026-08-28T12:31:00+08:00'), expected: false },

    // --- 1:00 / 1:30 PM (13:00 Sequence) ---
    { name: '1:00:00 PM (XX:00:00 → ACTIVE)', date: new Date('2026-08-28T13:00:00+08:00'), expected: true },
    { name: '1:00:59 PM (XX:00:59 → ACTIVE)', date: new Date('2026-08-28T13:00:59+08:00'), expected: true },
    { name: '1:01:00 PM (XX:01:00 → INACTIVE)', date: new Date('2026-08-28T13:01:00+08:00'), expected: false },
    { name: '1:29:59 PM (XX:29:59 → INACTIVE)', date: new Date('2026-08-28T13:29:59+08:00'), expected: false },
    { name: '1:30:00 PM (XX:30:00 → ACTIVE)', date: new Date('2026-08-28T13:30:00+08:00'), expected: true },
    { name: '1:30:59 PM (XX:30:59 → ACTIVE)', date: new Date('2026-08-28T13:30:59+08:00'), expected: true },
    { name: '1:31:00 PM (XX:31:00 → INACTIVE)', date: new Date('2026-08-28T13:31:00+08:00'), expected: false },

    // --- 11:00 / 11:30 PM (23:00 Sequence) ---
    { name: '11:00:00 PM (XX:00:00 → ACTIVE)', date: new Date('2026-08-28T23:00:00+08:00'), expected: true },
    { name: '11:00:59 PM (XX:00:59 → ACTIVE)', date: new Date('2026-08-28T23:00:59+08:00'), expected: true },
    { name: '11:01:00 PM (XX:01:00 → INACTIVE)', date: new Date('2026-08-28T23:01:00+08:00'), expected: false },
    { name: '11:29:59 PM (XX:29:59 → INACTIVE)', date: new Date('2026-08-28T23:29:59+08:00'), expected: false },
    { name: '11:30:00 PM (XX:30:00 → ACTIVE)', date: new Date('2026-08-28T23:30:00+08:00'), expected: true },
    { name: '11:30:59 PM (XX:30:59 → ACTIVE)', date: new Date('2026-08-28T23:30:59+08:00'), expected: true },
    { name: '11:31:00 PM (XX:31:00 → INACTIVE)', date: new Date('2026-08-28T23:31:00+08:00'), expected: false },

    // --- 12:00 / 12:30 AM (00:00 Midnight Sequence) ---
    { name: '12:00:00 AM (XX:00:00 → ACTIVE)', date: new Date('2026-08-28T00:00:00+08:00'), expected: true },
    { name: '12:00:59 AM (XX:00:59 → ACTIVE)', date: new Date('2026-08-28T00:00:59+08:00'), expected: true },
    { name: '12:01:00 AM (XX:01:00 → INACTIVE)', date: new Date('2026-08-28T00:01:00+08:00'), expected: false },
    { name: '12:29:59 AM (XX:29:59 → INACTIVE)', date: new Date('2026-08-28T00:29:59+08:00'), expected: false },
    { name: '12:30:00 AM (XX:30:00 → ACTIVE)', date: new Date('2026-08-28T00:30:00+08:00'), expected: true },
    { name: '12:30:59 AM (XX:30:59 → ACTIVE)', date: new Date('2026-08-28T00:30:59+08:00'), expected: true },
    { name: '12:31:00 AM (XX:31:00 → INACTIVE)', date: new Date('2026-08-28T00:31:00+08:00'), expected: false },
  ];

  const results = testDates.map(tc => {
    const status = getManilaTimeStatus(tc.date);
    const actualActive = status.isWithinWindow;
    return {
      testName: tc.name,
      isoString: tc.date.toISOString(),
      manilaTime: status.formattedTime,
      expectedActive: tc.expected,
      actualActive,
      passed: actualActive === tc.expected
    };
  });

  const allPassed = results.every(r => r.passed);
  return { allPassed, results };
}

