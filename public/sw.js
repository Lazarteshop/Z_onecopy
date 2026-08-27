const CACHE = "zone-v5-instant";
const MEDIA_CACHE = "zone-media-v2";
const API_CACHE = "zone-api-v2";

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/admin_gcash_qr.png"
];

self.addEventListener("install", event => {
  // Activate new SW immediately without waiting for user to close all tabs
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE).then(cache => {
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url))
      ).then(() => {
        console.log("SW: Cached default app shell assets");
      });
    })
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE && key !== MEDIA_CACHE && key !== API_CACHE) {
            console.log("SW: Removing outdated cache", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("message", event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", event => {
  if (!event.request.url.startsWith('http')) {
    return;
  }
  
  // Non-GET requests (mutations, financial, actions) must always go straight to network
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  const isNavigate = event.request.mode === 'navigate' || 
                     url.pathname === '/' || 
                     url.pathname.endsWith('.html') || 
                     (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'));
  const isMedia = url.pathname.startsWith('/uploads/') || 
                  url.pathname.match(/\.(png|jpg|jpeg|webp|gif|svg|ico)$/i) || 
                  url.hostname.includes('unsplash.com') || 
                  url.hostname.includes('picsum.photos');
  const isApi = url.pathname.startsWith('/api/');

  // Critical Financial / Auth / Live Realtime State Endpoints - ALWAYS Network Only
  const isStrictNetworkApi = 
    url.pathname.includes('/api/auth/') ||
    url.pathname.includes('/api/user/withdraw') ||
    url.pathname.includes('/api/user/task-complete') ||
    url.pathname.includes('/api/user/daily-checkin') ||
    url.pathname.includes('/api/user/spin-wheel') ||
    url.pathname.includes('/api/va/') ||
    url.pathname.includes('/api/shop/checkout') ||
    url.pathname.includes('/api/admin/');

  if (isStrictNetworkApi) {
    // Pure network pass-through, no caching
    return;
  }

  if (isNavigate) {
    // Network-First for HTML/Navigations: Always fetch the latest fresh version when online.
    // Fallback to cache ONLY if network fails (offline).
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(event.request);
          if (cachedResponse) {
            return cachedResponse;
          }
          const fallback = await caches.match('/index.html');
          return fallback || Response.error();
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
          // If offline and not in cache, return empty transparent or cached
          return cached || new Response('', { status: 408 });
        }
      })
    );
  } else if (isApi) {
    // SWR Strategy for Read APIs (posts, stories, groups, users, reels)
    const isSwrApi = 
      url.pathname.includes('/posts') || 
      url.pathname.includes('/stories') || 
      url.pathname.includes('/groups') || 
      url.pathname.includes('/users') || 
      url.pathname.includes('/reels') || 
      url.pathname.includes('/sync');

    if (isSwrApi) {
      event.respondWith(
        caches.open(API_CACHE).then(async (cache) => {
          const cachedResponse = await cache.match(event.request);
          const networkPromise = fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => cachedResponse);

          return cachedResponse || networkPromise;
        })
      );
    } else {
      // General Network-First for other GET APIs
      event.respondWith(
        fetch(event.request)
          .then(response => {
            if (response.status === 200) {
              const copy = response.clone();
              caches.open(API_CACHE).then(cache => cache.put(event.request, copy));
            }
            return response;
          })
          .catch(() => {
            return caches.match(event.request);
          })
      );
    }
  } else {
    // Cache-First with Network fallback for static JavaScript and CSS assets
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200 && (url.pathname.includes('/assets/') || url.pathname.endsWith('.json') || url.pathname.endsWith('.js') || url.pathname.endsWith('.css'))) {
            const copy = networkResponse.clone();
            caches.open(CACHE).then(cache => cache.put(event.request, copy));
          }
          return networkResponse;
        }).catch(() => response);
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
