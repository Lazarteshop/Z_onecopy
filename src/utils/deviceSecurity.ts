/**
 * Client device identification and security header utilities
 */

export function getOrCreateDeviceKeyId(): string {
  if (typeof window === 'undefined') return 'server_render_device';
  try {
    let devId = localStorage.getItem('z_one_device_security_id');
    if (!devId) {
      devId = `dev_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
      localStorage.setItem('z_one_device_security_id', devId);
    }
    return devId;
  } catch {
    return 'fallback_device_key';
  }
}

export function getDeviceSecurityHeaders(): Record<string, string> {
  const deviceId = getOrCreateDeviceKeyId();
  return {
    'x-device-id': deviceId,
  };
}

export async function getDeviceAuthHeaders(): Promise<Record<string, string>> {
  const deviceId = getOrCreateDeviceKeyId();
  return {
    'x-device-id': deviceId,
    'x-device-fingerprint': `fp_${deviceId}`,
  };
}
