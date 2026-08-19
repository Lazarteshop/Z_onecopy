const CACHE = "zone-v2";

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      return Promise.allSettled([
        cache.add("/"),
        cache.add("/index.html")
      ]).then(() => {
        console.log("SW: Cached default assets");
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE) {
            console.log("SW: Removing old cache", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  if (!event.request.url.startsWith('http')) {
    return;
  }
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  const isHTML = url.pathname === '/' || url.pathname.endsWith('.html');

  if (isHTML) {
    // Network-First para sa index.html upang laging makuha ang pinakabagong CSS at JS filenames
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.status === 200) {
            const copy = response.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  } else {
    // Cache-First na may Network fallback para sa iba pang asset
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request).then(networkResponse => {
          if (networkResponse.status === 200 && (url.pathname.includes('/assets/') || url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg') || url.pathname.endsWith('.json'))) {
            const copy = networkResponse.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, copy));
          }
          return networkResponse;
        });
      })
    );
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          if (client.url.includes(targetUrl) || targetUrl === '/') {
            return client.focus();
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Real Background Web Push Notification Handler (Active even when browser/app is closed as long as data/wifi is active)
self.addEventListener('push', event => {
  let notificationData = {
    title: 'GCash Click-Earn / Z-one',
    body: 'Mayroon kang bagong alert o mensahe sa iyong account.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    url: '/',
    tag: 'zone-general-notification'
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = { ...notificationData, ...payload };
    } catch (err) {
      try {
        notificationData.body = event.data.text();
      } catch (textErr) {}
    }
  }

  const notificationOptions = {
    body: notificationData.body,
    icon: notificationData.icon || '/icon-192.png',
    badge: notificationData.badge || '/icon-192.png',
    vibrate: [200, 100, 200, 100, 200],
    data: {
      url: notificationData.url || '/',
      dateOfArrival: Date.now()
    },
    tag: notificationData.tag || `zone-notif-${Date.now()}`,
    renotify: true,
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationOptions)
  );
});
