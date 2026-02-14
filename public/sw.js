// public/sw.js

const CACHE_NAME = 'connect-sphere-cache-v4'; // Incremented version
const OFFLINE_URL = 'offline.html';

// Note: Add URLs for any essential static assets you want to cache.
// Be cautious about caching too much, especially dynamic content or large assets.
const URLS_TO_CACHE = [
  '/',
  OFFLINE_URL,
  '/manifest.json',
];

// Install stage: open cache and add assets.
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(URLS_TO_CACHE);
      })
      .catch((error) => {
        console.error('[SW] Caching failed:', error);
      })
  );
  self.skipWaiting();
});

// Activate stage: clean up old caches.
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      )
    )
  );
  return self.clients.claim();
});

// Fetch stage: serve from cache with network fallback for navigation.
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
  } else if (URLS_TO_CACHE.includes(new URL(event.request.url).pathname)) {
    // For app shell files, use cache first strategy.
    event.respondWith(
      caches.match(event.request).then((response) => response || fetch(event.request))
    );
  }
});


// --- PUSH NOTIFICATION HANDLING ---

// 'push' event: happens when a push message is received.
self.addEventListener('push', (event) => {
  console.log('[SW] Push Received.');

  if (!event.data) {
    console.error('[SW] Push event but no data');
    return;
  }
  
  // The payload is sent as a JSON string, so we need to parse it.
  const data = event.data.json();
  console.log('[SW] Push data:', data);

  const title = data.title || 'ConnectSphere';
  const options = {
    body: data.body || 'You have a new message.',
    icon: data.icon || '/logo192.png',
    badge: '/logo192.png',
    image: data.image, // URL to an image for rich notifications
    data: {
      url: data.url || '/', // URL to open on click
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// 'notificationclick' event: happens when user clicks on a notification.
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click Received.');
  event.notification.close(); // Close the notification

  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      // If a window for the app is already open, focus it.
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
