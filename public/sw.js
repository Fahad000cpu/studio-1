const CACHE_NAME = 'connectsphere-v1.4'; // Incremented version
const urlsToCache = [
  '/',
  '/offline.html',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match('/offline.html');
      })
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request);
      })
    );
  }
});


self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.');
  let data = {};
  try {
    data = event.data.json();
  } catch (e) {
    console.error('[Service Worker] Push event but no data', e);
    return;
  }
  
  console.log('[Service Worker] Push data:', data);

  const title = data.title || 'New Notification';
  const options = {
    body: data.body || 'Something new happened!',
    image: data.image,
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});


self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification click Received.');

    event.notification.close();

    const urlToOpen = event.notification.data.url;

    event.waitUntil(
        clients.matchAll({
            type: "window",
            includeUncontrolled: true
        }).then((clientList) => {
             const client = clientList.find(c => {
                // Use URL constructor for robust parsing
                try {
                    const clientUrl = new URL(c.url);
                    const targetUrl = new URL(urlToOpen, self.location.origin);
                    // Compare just the pathname and search params
                    return clientUrl.pathname === targetUrl.pathname && clientUrl.search === targetUrl.search;
                } catch (e) {
                    return false; // Invalid URL, can't match
                }
            });

            if (client && 'focus' in client) {
                return client.focus();
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
