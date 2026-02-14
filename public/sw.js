// public/sw.js

const CACHE_NAME = 'connectsphere-cache-v3'; // Incremented version
const OFFLINE_URL = '/offline.html';
const urlsToCache = [
  '/',
  '/offline.html',
  '/manifest.json',
  // Add other static assets that are crucial for the app shell
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Opened cache');
        // Add all core assets to the cache
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        // Force the waiting service worker to become the active service worker.
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Tell the active service worker to take control of the page immediately.
      return self.clients.claim();
    })
  );
});


self.addEventListener('fetch', (event) => {
    // We only want to call event.respondWith() if this is a navigation request
    // for an HTML page.
    if (event.request.mode === 'navigate') {
        event.respondWith(
            (async () => {
                try {
                    // First, try to use the navigation preload response if it's
                    // supported.
                    const preloadResponse = await event.preloadResponse;
                    if (preloadResponse) {
                        return preloadResponse;
                    }

                    // Always try the network first.
                    const networkResponse = await fetch(event.request);
                    return networkResponse;
                } catch (error) {
                    // catch is only triggered if an exception is thrown, which is
                    // likely due to a network error.
                    // If fetch() returns a valid HTTP response with a response code in
                    // the 4xx or 5xx range, the catch() will NOT be called.
                    console.log('[SW] Fetch failed; returning offline page instead.', error);

                    const cache = await caches.open(CACHE_NAME);
                    const cachedResponse = await cache.match(OFFLINE_URL);
                    return cachedResponse;
                }
            })()
        );
    }
});


// PUSH NOTIFICATION HANDLING
self.addEventListener('push', (event) => {
  console.log('[SW] Push Received.');
  if (!event.data) {
    console.log('[SW] Push event but no data');
    return;
  }
  
  let data;
  try {
    data = event.data.json();
  } catch(e) {
    console.error('[SW] Push data is not valid JSON:', event.data.text());
    data = { title: 'New Notification', body: event.data.text() };
  }

  console.log('[SW] Push data:', data);

  const title = data.title || 'New Message';
  const options = {
    body: data.body || 'You have a new message.',
    icon: data.icon || '/logo192.png',
    badge: '/logo192.png',
    image: data.image || undefined,
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click Received.');
  event.notification.close();

  const urlToOpen = new URL(event.notification.data?.url || '/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      // Check if there's already a window open with the same path.
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        const notificationUrl = new URL(urlToOpen);
        if (clientUrl.pathname === notificationUrl.pathname && 'focus' in client) {
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
