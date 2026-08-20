const CACHE = "zone-v3";
const MEDIA_CACHE = "zone-media-v1";
const API_CACHE = "zone-api-v1";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url))
      ).then(() => {
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
          if (key !== CACHE && key !== MEDIA_CACHE && key !== API_CACHE) {
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
  const isMedia = url.pathname.startsWith('/uploads/') || 
                  url.pathname.match(/\.(png|jpg|jpeg|webp|gif|svg|ico)$/i) || 
                  url.hostname.includes('unsplash.com') || 
                  url.hostname.includes('picsum.photos');
  const isApi = url.pathname.startsWith('/api/');

  if (isHTML) {
    // Network-First for HTML to always get the latest bundle hash
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
  } else if (isMedia) {
    // Cache-First for images & media to preserve mobile data bandwidth
    event.respondWith(
      caches.open(MEDIA_CACHE).then(async cache => {
        const cached = await cache.match(event.request);
        if (cached) {
          return cached;
        }

        try {
          const networkResponse = await fetch(event.request);
          if (networkResponse && networkResponse.status === 200) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (err) {
          // If offline and not in cache, fallback
          return cached || new Response('', { status: 408 });
        }
      })
    );
  } else if (isApi) {
    // Network-First with API cache fallback for resilient offline reading
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.status === 200 && (url.pathname.includes('/posts') || url.pathname.includes('/reels') || url.pathname.includes('/profile'))) {
            const copy = response.clone();
            caches.open(API_CACHE).then(cache => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request);
        })
    );
  } else {
    // Cache-First with Network fallback for static JavaScript and CSS assets
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request).then(networkResponse => {
          if (networkResponse.status === 200 && (url.pathname.includes('/assets/') || url.pathname.endsWith('.json'))) {
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
