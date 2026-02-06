// This file must be in the public directory
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.');
  if (!event.data) {
    console.error('[Service Worker] Push event but no data');
    return;
  }

  let payload;
  try {
    // This handles payloads from our server (wrapped in `data`) 
    // and from the FCM console (wrapped in `notification`)
    const rawPayload = event.data.json();
    payload = rawPayload.data || rawPayload.notification;

    if (!payload || !payload.title) {
        throw new Error('Payload format not recognized or title is missing.');
    }

  } catch (e) {
    console.error('[Service Worker] Could not parse push data:', e);
    // As a fallback, try to display the raw text if JSON parsing fails
    const promiseChain = self.registration.showNotification('New Message', {
      body: event.data.text(),
      icon: '/logo.svg'
    });
    event.waitUntil(promiseChain);
    return;
  }
  
  const title = payload.title;
  const options = {
    body: payload.body || 'You have a new message.',
    icon: payload.icon || '/logo.svg',
    badge: '/logo.svg', // A badge icon for Android
    data: {
      url: payload.url || '/' // Pass the URL to the notification click handler
    }
  };

  const promiseChain = self.registration.showNotification(title, options);
  event.waitUntil(promiseChain);
});

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click Received.');

  event.notification.close();

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if a window for this app is already open and on the correct URL.
      for (const client of clientList) {
         // If a window is open, focus it.
        if ('focus' in client) {
          return client.focus();
        }
      }
      // If no window is open, open a new one.
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
