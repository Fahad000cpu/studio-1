// This is a standard, robust service worker for handling push notifications.

// Listener for the 'push' event. This is triggered when a push message is received.
self.addEventListener('push', event => {
  console.log('[Service Worker] Push Received.');

  let data;
  try {
    data = event.data.json();
    console.log('[Service Worker] Push data parsed as JSON:', data);
  } catch (e) {
    console.error('[Service Worker] Failed to parse push data as JSON. Treating as text.', e);
    data = { notification: { title: 'New Message', body: event.data.text() } };
  }
  
  if (!data || !data.notification) {
      console.error('[Service Worker] Push data is missing "notification" property.');
      return;
  }

  const title = data.notification.title || 'New Message from ConnectSphere';
  const options = {
    body: data.notification.body || 'You have a new message.',
    icon: data.notification.icon || '/logo.svg',
    badge: data.notification.badge || '/logo.svg',
    // The 'data' property of a notification is used to store custom data.
    // Here we store the URL that should be opened when the notification is clicked.
    data: {
      url: data.data?.url || '/',
    },
  };

  // The waitUntil() method ensures the service worker doesn't terminate
  // until the asynchronous operation (showing the notification) is complete.
  event.waitUntil(self.registration.showNotification(title, options));
});

// Listener for the 'notificationclick' event. This is triggered when a user clicks on a notification.
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click Received.');

  // Close the notification pop-up.
  event.notification.close();

  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

  // The waitUntil() method here ensures that the browser doesn't terminate the
  // service worker before the new window/tab has been created.
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then(clientList => {
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
