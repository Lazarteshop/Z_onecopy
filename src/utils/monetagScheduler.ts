/**
 * 🕒 Z-oneApp Monetag Central Ad Scheduler Controller
 * 
 * Strict Timezone: Asia/Manila (Philippine Standard Time, UTC+8)
 * 
 * Strict Policy:
 * 1. Monetag ads & scripts are ONLY active in the exact window HH:00:00 to HH:00:59 of every hour
 *    (1:00 AM, 2:00 AM, ..., 12:00 PM/AM).
 * 2. At exactly HH:01:00, all Monetag scripts/elements/triggers are automatically disabled,
 *    isolated, cleaned up from DOM, and hard-blocked until the next scheduled hour.
 * 3. Outside the window (HH:01:00 to HH:59:59), ZERO Monetag initialization occurs.
 * 4. Zero impact on unrelated Z-oneApp features (Auth, Wallet, GCash, Posts, Stories, Chat, Reels, R2, etc.).
 */

export interface ManilaTimeStatus {
  formattedTime: string;
  hours: number;
  minutes: number;
  seconds: number;
  isWithinWindow: boolean;
  secondsRemainingInWindow: number;
  secondsUntilNextWindow: number;
}

export const MONETAG_VERIFICATION_TAG = '11e081287c25e53b58eb8233ab78e674';
export const MONETAG_ZONE_ID = '11201519';
export const MONETAG_SCRIPT_SRC = 'https://al5sm.com/tag.min.js';

// Check if a given Date (or current time) is within the exact HH:00:00 - HH:00:59 window in Asia/Manila
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

  // Exact 1-minute window check: Minute MUST be 00, Second between 0 and 59
  const isWithinWindow = minutes === 0 && seconds >= 0 && seconds <= 59;
  
  const secondsRemainingInWindow = isWithinWindow ? (59 - seconds) : 0;
  
  // Calculate seconds until next HH:00:00
  let secondsUntilNextWindow = 0;
  if (!isWithinWindow) {
    const minutesToNextHour = 59 - minutes;
    const secondsToNextMinute = 60 - seconds;
    secondsUntilNextWindow = (minutesToNextHour * 60) + secondsToNextMinute;
  }

  const formattedTime = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} PST`;

  return {
    formattedTime,
    hours,
    minutes,
    seconds,
    isWithinWindow,
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
  private listeners: Set<(isActive: boolean, status: ManilaTimeStatus) => void> = new Set();

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

    // Immediately run check
    this.evaluate();

    // High frequency interval (every 1 second) to guarantee exact HH:00:00 start and HH:01:00 termination
    if (this.timer) {
      clearInterval(this.timer);
    }
    this.timer = window.setInterval(() => {
      this.evaluate();
    }, 1000);

    // Also register visibility change to immediately re-evaluate when tab becomes active
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        this.evaluate();
      }
    });
  }

  private evaluate() {
    const status = getManilaTimeStatus();

    if (status.isWithinWindow) {
      if (!this.isCurrentlyActive) {
        this.activateWindow(status);
      }
    } else {
      if (this.isCurrentlyActive || document.querySelectorAll('[data-monetag-element]').length > 0) {
        this.deactivateAndCleanup(status);
      }
    }
  }

  private activateWindow(status: ManilaTimeStatus) {
    this.isCurrentlyActive = true;
    if (typeof window !== 'undefined') {
      (window as any).__MONETAG_WINDOW_ACTIVE__ = true;
      (window as any).__MONETAG_BLOCKED__ = false;
    }

    try {
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

      console.log(`[MonetagScheduler] 🟢 Monetag Hourly Window ACTIVE (${status.formattedTime}). Window ends in ${status.secondsRemainingInWindow}s.`);
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

      console.log(`[MonetagScheduler] 🔴 Monetag Hourly Window INACTIVE (${currentStatus.formattedTime}). Next window in ${Math.round(currentStatus.secondsUntilNextWindow / 60)}m.`);
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
    this.deactivateAndCleanup();
  }
}

export const monetagScheduler = new MonetagSchedulerController();

/**
 * Self-test suite for boundary verification:
 * Checks HH:00:00, HH:00:59, HH:01:00 across multiple hours in Asia/Manila.
 */
export function runMonetagBoundaryTests(): {
  allPassed: boolean;
  results: Array<{
    testName: string;
    isoString: string;
    manilaTime: string;
    expectedActive: boolean;
    actualActive: boolean;
    passed: boolean;
  }>;
} {
  // Test cases constructed using exact UTC equivalents for Asia/Manila (UTC+8)
  // Asia/Manila 01:00:00 is UTC 17:00:00 previous day
  // Asia/Manila 01:00:59 is UTC 17:00:59 previous day
  // Asia/Manila 01:01:00 is UTC 17:01:00 previous day
  const testDates = [
    { name: '1:00:00 AM (Start of Window)', date: new Date('2026-08-28T01:00:00+08:00'), expected: true },
    { name: '1:00:30 AM (Mid Window)', date: new Date('2026-08-28T01:00:30+08:00'), expected: true },
    { name: '1:00:59 AM (Last Second of Window)', date: new Date('2026-08-28T01:00:59+08:00'), expected: true },
    { name: '1:01:00 AM (Immediate Termination Boundary)', date: new Date('2026-08-28T01:01:00+08:00'), expected: false },
    { name: '1:01:01 AM (Outside Window)', date: new Date('2026-08-28T01:01:01+08:00'), expected: false },
    { name: '1:30:00 AM (Mid-Hour Outside Window)', date: new Date('2026-08-28T01:30:00+08:00'), expected: false },
    { name: '1:59:59 AM (Right before next Window)', date: new Date('2026-08-28T01:59:59+08:00'), expected: false },
    { name: '2:00:00 AM (Next Window Start)', date: new Date('2026-08-28T02:00:00+08:00'), expected: true },
    { name: '12:00:00 PM (Noon Window Start)', date: new Date('2026-08-28T12:00:00+08:00'), expected: true },
    { name: '12:00:59 PM (Noon Window End)', date: new Date('2026-08-28T12:00:59+08:00'), expected: true },
    { name: '12:01:00 PM (Noon Window Termination)', date: new Date('2026-08-28T12:01:00+08:00'), expected: false },
    { name: '12:00:00 AM (Midnight Window Start)', date: new Date('2026-08-28T00:00:00+08:00'), expected: true },
    { name: '12:00:59 AM (Midnight Window End)', date: new Date('2026-08-28T00:00:59+08:00'), expected: true },
    { name: '12:01:00 AM (Midnight Window Termination)', date: new Date('2026-08-28T00:01:00+08:00'), expected: false },
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
