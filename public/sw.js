// This is the service worker script for the PWA.

// On install, the service worker will be installed.
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  // Skip waiting to activate the new service worker immediately.
  self.skipWaiting();
});

// On activate, take control of all clients.
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  // This claims control over all uncontrolled clients.
  event.waitUntil(self.clients.claim());
});

// The fetch event is required for a PWA to be considered installable.
// This basic handler just passes the request through to the network.
self.addEventListener('fetch', (event) => {
  // We are not implementing any caching strategy here,
  // just fulfilling the PWA requirement.
  event.respondWith(fetch(event.request));
});

// Listen for push notifications. This is triggered by a data-only FCM message.
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push Received.');
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    console.error('Failed to parse push data:', e);
  }

  const title = data.title || 'ConnectSphere';
  const options = {
    body: data.body || 'You have a new message.',
    icon: data.icon || '/logo192.png',
    badge: data.badge || '/logo192.png',
    image: data.image,
    tag: data.tag || 'connectsphere-notification',
    renotify: true,
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click event.
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification click Received.');
  event.notification.close();

  const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      // Check if a window is already open with the target URL.
      for (const client of clientList) {
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
