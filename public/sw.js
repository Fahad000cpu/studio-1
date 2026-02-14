const CACHE_NAME = 'connectsphere-v5'; // Bump version to ensure update
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Opened cache');
        // Only cache the essential offline page to ensure install succeeds
        return cache.add(OFFLINE_URL);
      })
      .then(() => {
        console.log('[SW] Install successful, skipping waiting.');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('[SW] Cache add failed during install:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('[SW] Claiming clients.');
        return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        return caches.match(OFFLINE_URL);
      })
    );
  }
});

self.addEventListener('push', (event) => {
  console.log('[SW] Push Received.');
  
  if (!event.data) {
    console.error('[SW] Push event but no data');
    return;
  }
  
  let data;
  try {
    data = event.data.json();
  } catch (e) {
    console.error('[SW] Failed to parse push data:', e);
    // Fallback notification if parsing fails
    data = {
      title: 'New Message',
      body: 'You have a new message.'
    };
  }

  console.log('[SW] Push data:', data);

  const title = data.title || 'New Message';
  const options = {
    body: data.body || 'You have a new message.',
    // Icons are removed to prevent errors if they don't exist.
    // The browser will use a default icon.
    image: data.image,
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification click Received.');

  event.notification.close();

  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window with the same URL path is already open, focus it.
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        const targetUrl = new URL(urlToOpen);
        if (clientUrl.pathname === targetUrl.pathname && 'focus' in client) {
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
