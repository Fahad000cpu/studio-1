
// public/sw.js

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.');

  if (!event.data) {
    console.log('[Service Worker] Push event but no data');
    return;
  }

  try {
    // Parse the data from the push event
    const data = event.data.json();
    
    const title = data.title || 'New Message';
    const options = {
      body: data.body || 'You have a new message.',
      icon: data.icon || '/logo.svg', // The icon to display
      badge: '/logo.svg', // A monochrome icon for the notification tray
      data: {
        url: data.url || '/', // The URL to open on click
      },
    };

    // Show the notification
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
      console.error('[Service Worker] Error parsing push data:', e);
  }
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click Received.');

  // Close the notification
  event.notification.close();

  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

  // This looks for an existing window/tab with the same URL and focuses it.
  // If not found, it opens a new window/tab.
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      // Check if there's a window/tab is already open with the target URL
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window/tab is found, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
