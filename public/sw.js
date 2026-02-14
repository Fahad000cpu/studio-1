// A unique name for the cache. Changing this will force a new cache to be created.
const CACHE_NAME = 'connectsphere-cache-v2'; 
const OFFLINE_URL = 'offline.html';

// A list of assets to be cached when the service worker is installed.
const ASSETS_TO_CACHE = [
  // We are not caching '/' to avoid serving stale HTML.
  // The 'navigate' fetch handler will take care of the offline experience for pages.
  OFFLINE_URL,
  '/manifest.json',
  '/logo192.png',
  '/logo512.png',
];

// Event listener for the 'install' event.
// This is where we pre-cache the essential assets for the offline experience.
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(ASSETS_TO_CACHE);
      })
  );
  // Force the waiting service worker to become the active service worker.
  self.skipWaiting();
});

// Event listener for the 'activate' event.
// This is where we clean up old, unused caches.
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // If the cache name is not our current one, delete it.
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Take control of all open clients (pages) at once.
  return self.clients.claim();
});

// Event listener for the 'fetch' event.
// This intercepts all network requests made by the app.
self.addEventListener('fetch', (event) => {
  // For navigation requests (i.e., loading a page), use a network-first strategy.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // Try to fetch the page from the network.
          const networkResponse = await fetch(event.request);
          return networkResponse;
        } catch (error) {
          // If the network fetch fails (e.g., offline), serve the offline page from the cache.
          console.log('[Service Worker] Fetch failed for navigation; returning offline page.');
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match(OFFLINE_URL);
          return cachedResponse;
        }
      })()
    );
    return; // Stop here for navigation requests.
  }

  // For all other requests (e.g., CSS, JS, images), use a cache-first strategy.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // If the response is in the cache, return it.
      if (cachedResponse) {
        return cachedResponse;
      }
      // If not in cache, fetch from the network, cache it for next time, and return it.
      return fetch(event.request).then((networkResponse) => {
        // Check if we received a valid response
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        // IMPORTANT: Clone the response. A response is a stream
        // and because we want the browser to consume the response
        // as well as the cache consuming the response, we need
        // to clone it so we have two streams.
        const responseToCache = networkResponse.clone();

        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });

        return networkResponse;
      });
    })
  );
});

// Listen for push notifications
self.addEventListener('push', (event) => {
    if (!event.data) {
        console.log("[Service Worker] Push event but no data");
        return;
    }

    const data = event.data.json();
    const title = data.notification.title || 'New Message';
    const options = {
        body: data.notification.body || 'You have a new message.',
        icon: data.notification.icon || '/logo192.png',
        // The badge is used on Android for the small icon in the status bar.
        badge: '/logo192.png', 
        data: {
            // The URL to open when the notification is clicked.
            url: data.fcmOptions?.link || data.data?.url || '/',
        },
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const urlToOpen = event.notification.data.url || '/';

    // This looks for an open window with the same URL and focuses it.
    // If no window is found, it opens a new one.
    event.waitUntil(
        clients.matchAll({
            type: 'window',
            includeUncontrolled: true,
        }).then((clientList) => {
            for (const client of clientList) {
                // You might want to check for the exact URL or just focus any open client
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
