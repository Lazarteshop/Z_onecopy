import { idbStorage } from './idbStorage';

const DEVICE_KEY_STORAGE = 'zone_registered_device_key_v1';
const DEVICE_LABEL_STORAGE = 'zone_registered_device_label_v1';

// Generate UUID v4
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Generate device label from user agent
export function getClientDeviceLabel(): string {
  if (typeof window === 'undefined') return 'Web Client';
  const saved = localStorage.getItem(DEVICE_LABEL_STORAGE);
  if (saved) return saved;

  const ua = navigator.userAgent;
  let browser = 'Browser';
  let os = 'Device';

  if (/Android/i.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
  else if (/Windows/i.test(ua)) os = 'Windows';
  else if (/Macintosh|Mac OS/i.test(ua)) os = 'macOS';
  else if (/Linux/i.test(ua)) os = 'Linux';

  if (/Chrome|CriOS/i.test(ua) && !/Edge|OPR/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua)) browser = 'Safari';
  else if (/Firefox|FxiOS/i.test(ua)) browser = 'Firefox';
  else if (/Edge|Edg/i.test(ua)) browser = 'Edge';

  const label = `${browser} on ${os}`;
  try {
    localStorage.setItem(DEVICE_LABEL_STORAGE, label);
  } catch (e) {}
  return label;
}

// Synchronous device key getter for immediate headers
export function getOrCreateDeviceKeyIdSync(): string {
  if (typeof window === 'undefined') return 'server_side_device';
  let key = '';
  try {
    key = localStorage.getItem(DEVICE_KEY_STORAGE) || '';
  } catch (e) {}

  if (!key) {
    key = `dev_${generateUUID()}`;
    try {
      localStorage.setItem(DEVICE_KEY_STORAGE, key);
      idbStorage.set(DEVICE_KEY_STORAGE, key).catch(() => {});
    } catch (e) {}
  }
  return key;
}

// Get or initialize persistent Device Key ID
export async function getOrCreateDeviceKeyId(): Promise<string> {
  if (typeof window === 'undefined') return 'server_side_device';

  // 1. Try localStorage first
  let key = '';
  try {
    key = localStorage.getItem(DEVICE_KEY_STORAGE) || '';
  } catch (e) {}

  // 2. Try IndexedDB backup
  if (!key) {
    try {
      const idbKey = await idbStorage.get<string>(DEVICE_KEY_STORAGE);
      if (idbKey) {
        key = idbKey;
        try {
          localStorage.setItem(DEVICE_KEY_STORAGE, key);
        } catch (e) {}
      }
    } catch (e) {}
  }

  // 3. If none exists, create new cryptographic Device Key ID
  if (!key) {
    key = `dev_${generateUUID()}`;
    try {
      localStorage.setItem(DEVICE_KEY_STORAGE, key);
    } catch (e) {}
    try {
      await idbStorage.set(DEVICE_KEY_STORAGE, key);
    } catch (e) {}
  }

  return key;
}

// Synchronous auth headers helper
export function getDeviceSecurityHeaders(): Record<string, string> {
  const deviceKeyId = getOrCreateDeviceKeyIdSync();
  const deviceLabel = getClientDeviceLabel();
  return {
    'X-Device-Id': deviceKeyId,
    'X-Device-Label': encodeURIComponent(deviceLabel),
  };
}

// Async auth headers helper
export async function getDeviceAuthHeaders(): Promise<Record<string, string>> {
  const deviceKeyId = await getOrCreateDeviceKeyId();
  const deviceLabel = getClientDeviceLabel();
  return {
    'X-Device-Id': deviceKeyId,
    'X-Device-Label': encodeURIComponent(deviceLabel),
  };
}
