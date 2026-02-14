// public/sw.js

// Incrementing cache version to ensure old cache is cleared
const CACHE_NAME = 'connect-sphere-cache-v3'; 
const OFFLINE_URL = 'offline.html';
const urlsToCache = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
];

// Install the service worker and cache critical assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching critical assets.');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate the service worker and clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event handler with a cache-first strategy for navigation
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
          console.log('Service Worker: Fetch failed; returning offline page.', error);
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(OFFLINE_URL);
          return cachedResponse;
        }
      })()
    );
  } else if (urlsToCache.some(url => event.request.url.endsWith(url))) {
    // Cache-first for other specified assets
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});


// Listen for push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.');

  if (!event.data) {
    console.log('[Service Worker] Push event but no data');
    return;
  }
  
  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    console.error('[Service Worker] Push event data is not valid JSON', e);
    // Fallback for plain text messages
    payload = { notification: { title: 'New Notification', body: event.data.text() } };
  }

  const notificationTitle = payload.notification?.title || 'ConnectSphere';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new update.',
    icon: payload.notification?.icon || '/logo192.png',
    badge: '/logo192.png',
    image: payload.notification?.image,
    data: {
      url: payload.data?.url || '/', // The custom data payload from the server is most reliable
    }
  };

  event.waitUntil(
    self.registration.showNotification(notificationTitle, notificationOptions)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification click Received.');

    event.notification.close();

    const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;

    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true
        }).then((clientList) => {
            for (const client of clientList) {
                // If a window is already open at the target URL, focus it.
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // If not, open a new window.
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
