
// This listener handles the user clicking on the notification.
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click Received.');

  event.notification.close(); // Close the notification

  // Get the URL from the notification's data payload
  const urlToOpen = event.notification.data.url || '/';

  // This looks for an existing window and focuses it.
  // If no window is found, it opens a new one.
  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        // Check if a window with the same URL is already open.
        if (new URL(client.url).pathname === new URL(urlToOpen, self.location.origin).pathname && 'focus' in client) {
          return client.focus();
        }
      }
      // If no matching window is found, open a new one.
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// This listener handles receiving a push notification from FCM.
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.');

  if (!event.data) {
    console.log('[Service Worker] Push event but no data');
    return;
  }

  try {
    const pushData = event.data.json();
    console.log('[Service Worker] Push Data:', pushData);

    const title = pushData.notification?.title || 'New Message';
    const options = {
      body: pushData.notification?.body || 'You have a new message.',
      icon: pushData.webpush?.notification?.icon || pushData.data?.icon || '/logo.svg',
      badge: pushData.webpush?.notification?.badge || '/logo.svg',
      image: pushData.notification?.imageUrl,
      tag: pushData.webpush?.notification?.tag,
      // IMPORTANT: Pass data to the notification for the 'notificationclick' event
      // We prioritize the link from fcmOptions, as it's the most explicit for web.
      data: {
        url: pushData.fcmOptions?.link || pushData.data?.url || '/'
      }
    };

    event.waitUntil(self.registration.showNotification(title, options));
  } catch (e) {
      console.error('[Service Worker] Error parsing push data:', e);
      // Fallback for simple text pushes just in case
      const title = 'ConnectSphere';
      const options = {
        body: event.data.text(),
        icon: '/logo.svg',
        badge: '/logo.svg'
      };
      event.waitUntil(self.registration.showNotification(title, options));
  }
});
