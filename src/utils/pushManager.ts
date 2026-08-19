// Web Push Notification Manager for PWA & Background Alerts

export function isPushNotificationSupported(): boolean {
  return typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window;
}

export function getNotificationPermissionState(): NotificationPermission | 'unsupported' {
  if (!isPushNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeUserToPush(token: string): Promise<{ success: boolean; message: string; permission?: NotificationPermission }> {
  if (!isPushNotificationSupported()) {
    return {
      success: false,
      message: 'Hindi sinusuportahan ng iyong browser ang Web Push Notifications.'
    };
  }

  try {
    // 1. Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        permission,
        message: permission === 'denied'
          ? 'Naka-block ang notification permission sa iyong browser settings. Paki-allow ito sa site settings.'
          : 'Hindi pinayagan ang notification permission.'
      };
    }

    // 2. Ensure Service Worker is registered and active
    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    }
    await navigator.serviceWorker.ready;

    // 3. Get VAPID public key from backend
    const vapidRes = await fetch('/api/push/vapid-public-key');
    if (!vapidRes.ok) {
      throw new Error('Hindi nakuha ang VAPID key mula sa server.');
    }
    const { publicKey } = await vapidRes.json();
    const convertedVapidKey = urlBase64ToUint8Array(publicKey);

    // 4. Check existing subscription or subscribe new
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });
    }

    // 5. Send subscription to server
    const subscribeRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      },
      body: JSON.stringify({ subscription: subscription.toJSON() })
    });

    const resData = await subscribeRes.json();
    if (!subscribeRes.ok) {
      throw new Error(resData.error || 'Nabigo ang pag-save ng push subscription.');
    }

    // Store in localStorage that user has enabled push
    localStorage.setItem('zone_push_enabled', 'true');

    return {
      success: true,
      permission,
      message: 'Matagumpay na na-activate ang Background Notifications! Makakatanggap ka na ng alert sa Payout, GC, at kita kahit sarado ang app. 🔔'
    };
  } catch (err: any) {
    console.error('Error subscribing to push notifications:', err);
    return {
      success: false,
      message: err?.message || 'Nagka-error sa pag-activate ng notifications.'
    };
  }
}

export async function unsubscribeUserFromPush(token: string): Promise<{ success: boolean; message: string }> {
  if (!isPushNotificationSupported()) return { success: true, message: 'Unsupported' };

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token
          },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
        await subscription.unsubscribe();
      }
    }
    localStorage.removeItem('zone_push_enabled');
    return { success: true, message: 'Matagumpay na na-disable ang background notifications.' };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Failed to unsubscribe.' };
  }
}

export async function sendTestPushNotification(token: string): Promise<{ success: boolean; message: string }> {
  try {
    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token
      }
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send test push notification.');
    }
    return { success: true, message: data.message };
  } catch (err: any) {
    return { success: false, message: err?.message || 'Error sending test notification.' };
  }
}
