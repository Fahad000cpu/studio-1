const CACHE_NAME = 'connect-sphere-cache-v2.0'; // New version to force update
const ESSENTIAL_FILES = [
  '/',
  '/offline.html',
  '/manifest.json'
  // I am deliberately NOT caching the icon files here.
  // If they don't exist, it would cause the entire service worker installation to fail.
  // The browser will still fetch them for the manifest, but it won't break the offline capability.
];

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Install Event processing...');
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE_NAME);
        console.log('[Service Worker] Caching essential files...');
        await cache.addAll(ESSENTIAL_FILES);
        console.log('[Service Worker] All essential files were successfully cached.');
      } catch (error) {
        console.error('[Service Worker] Caching failed:', error);
        // If caching fails, don't let the service worker install.
        throw error;
      }
    })()
  );
});

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activate event processed.');
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })()
  );
  // This ensures that the newly installed service worker takes control of the page immediately.
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // We only want to handle navigation requests with our offline-first strategy
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          // First, try to use the navigation preload response if it's supported.
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) {
            return preloadResponse;
          }
          
          // Always try the network first for navigation requests.
          const networkResponse = await fetch(event.request);
          return networkResponse;
        } catch (error) {
          // catch is only triggered if the network fails.
          console.log('[Service Worker] Fetch failed; returning offline page instead.', error);
          const cache = await caches.open(CACHE_NAME);
          const cachedResponse = await cache.match('/offline.html');
          return cachedResponse;
        }
      })()
    );
  }
  // For other requests (CSS, JS, images), you might use a cache-first strategy,
  // but for simplicity and to avoid issues, we'll let them pass through to the network.
  // This can be enhanced later.
});


// --- PUSH NOTIFICATION LOGIC ---
self.addEventListener('push', event => {
  console.log('[Service Worker] Push Received.');
  if (!event.data) {
    console.log('[Service Worker] Push event but no data');
    return;
  }
  const data = event.data.json();
  const title = data.notification.title || 'ConnectSphere';
  const options = {
    body: data.notification.body || 'You have a new message.',
    icon: data.notification.icon || '/logo192.png',
    badge: '/logo192.png',
    data: {
      url: data.data.url || '/'
    }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click Received.');
  event.notification.close();
  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      if (clientList.length > 0) {
        let client = clientList[0];
        for (const c of clientList) {
          if (c.focused) {
            client = c;
          }
        }
        if (client && 'navigate' in client && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
