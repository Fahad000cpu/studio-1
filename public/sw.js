// A unique name for our cache
const CACHE_NAME = 'connectsphere-v1';

// The list of files to cache on installation
const urlsToCache = [
  '/',
  '/offline.html',
  '/logo192.png',
  '/logo512.png',
  // Note: Next.js build files are dynamic, so we can't hardcode them.
  // We will cache them on the fly in the fetch event.
];

// Install a service worker
self.addEventListener('install', event => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate the service worker
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Cache and return requests
self.addEventListener('fetch', event => {
  // For navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          return response;
        })
        .catch(() => {
          // If the network fails, serve the offline page from cache
          return caches.match('/offline.html');
        })
    );
    return;
  }
  
  // For other requests (CSS, JS, images), use a stale-while-revalidate strategy
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - return response
        const fetchPromise = fetch(event.request).then(
          networkResponse => {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
            });
            return networkResponse;
          }
        );
        // Return from cache immediately, and update it in the background.
        return response || fetchPromise;
      })
  );
});


// Handle push notifications
self.addEventListener('push', event => {
  if (!event.data) {
    console.error('Push event but no data');
    return;
  }
  
  const data = event.data.json();
  const title = data.notification.title || 'ConnectSphere';
  const options = {
    body: data.notification.body || 'You have a new message.',
    icon: data.notification.icon || '/logo192.png',
    badge: '/badge.png', // A small badge icon
    image: data.notification.image,
    data: {
      url: data.fcmOptions?.link || data.data?.url || '/' // Extract URL from various possible locations
    }
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      // If a window for this app is already open, focus it.
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window.
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
