const CACHE_NAME = 'connectsphere-v3';
const OFFLINE_URL = 'offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Pre-caching essential assets
      return cache.addAll([
        '/',
        '/offline.html',
        '/manifest.json',
        '/logo192.png',
        '/logo512.png',
        // Add other critical static assets here if needed
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
    if (event.request.mode === 'navigate') {
      event.respondWith(
        (async () => {
          try {
            const preloadResponse = await event.preloadResponse;
            if (preloadResponse) {
              return preloadResponse;
            }

            const networkResponse = await fetch(event.request);
            return networkResponse;
          } catch (error) {
            console.log('Fetch failed; returning offline page instead.', error);

            const cache = await caches.open(CACHE_NAME);
            const cachedResponse = await cache.match(OFFLINE_URL);
            return cachedResponse;
          }
        })()
      );
    }
});


self.addEventListener('push', event => {
    const data = event.data?.json() ?? {};
    const title = data.title || 'ConnectSphere';
    const options = {
      body: data.body || 'You have a new notification.',
      icon: data.icon || '/logo192.png',
      badge: '/logo192.png',
      data: {
        url: data.url || '/'
      }
    };
  
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
  
    const urlToOpen = event.notification.data?.url || '/';
  
    event.waitUntil(
      self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      }).then(clientList => {
        if (clientList.length > 0) {
          for (const client of clientList) {
            if (client.url === urlToOpen && 'focus' in client) {
              return client.focus();
            }
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
    );
});
