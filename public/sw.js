
// This is the service worker file.
// It runs in the background and handles push notifications.

self.addEventListener('push', (event) => {
  let data;
  try {
    data = event.data.json();
  } catch (e) {
    console.error('Push event data is not valid JSON:', event.data.text());
    data = {
        title: 'New Notification',
        body: event.data.text(),
    };
  }

  if (!data) {
    console.error('Push event has no data.');
    return;
  }

  const title = data.title || 'ConnectSphere';
  const options = {
    body: data.body || 'You have a new message.',
    icon: data.icon || '/logo.svg', // Small icon
    badge: '/logo.svg', // Small icon for notification tray on Android
    image: data.image, // Optional large image
    data: {
      url: data.url || '/', // URL to open on click
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if a window is already open at the target URL
      for (const client of clientList) {
        if (new URL(client.url).href === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Boilerplate to ensure the new service worker activates quickly.
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
