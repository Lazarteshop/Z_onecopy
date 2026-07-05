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
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (let i = 0; i < clientList.length; i++) {
          if (clientList[i].focused) {
            client = clientList[i];
            break;
          }
        }
        return client.focus();
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
