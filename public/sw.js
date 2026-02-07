// This is a basic service worker for PWA capabilities and handling push notifications.

// Listen for the 'install' event, which fires when the service worker is installing.
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  // event.waitUntil(caches.open(CACHE_NAME).then(...)); // Optional: Caching assets
  self.skipWaiting(); // Force the waiting service worker to become the active service worker.
});

// Listen for the 'activate' event, which fires when the service worker becomes active.
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(self.clients.claim()); // Become the controller for all clients within its scope.
});

// Listen for 'fetch' events to handle network requests.
self.addEventListener('fetch', (event) => {
  // This is a basic pass-through fetch handler.
  // For offline capabilities, you would implement a cache-first strategy here.
  event.respondWith(fetch(event.request));
});

// Listen for 'push' events to handle incoming push notifications.
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push Received.');

  if (!event.data) {
    console.error('Service Worker: Push event but no data');
    return;
  }

  try {
    const data = event.data.json();
    console.log('Service Worker: Push data', data);

    const title = data.title || 'ConnectSphere';
    const options = {
      body: data.body || 'You have a new message.',
      icon: data.icon || '/logo192.png',
      badge: data.badge || '/logo192.png',
      image: data.image,
      data: {
        url: data.url, // The URL to open when the notification is clicked
      },
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
    console.error('Error parsing push data:', e);
    // Fallback for plain text notifications
    const title = 'ConnectSphere';
    const options = {
        body: event.data.text(),
        icon: '/logo192.png',
        badge: '/logo192.png',
    };
    event.waitUntil(self.registration.showNotification(title, options));
  }
});

// Listen for 'notificationclick' events.
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked.');
  event.notification.close(); // Close the notification

  const urlToOpen = event.notification.data.url || '/';

  // This looks for an existing window/tab with the same URL and focuses it.
  // If not found, it opens a new one.
  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
