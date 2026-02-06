
// This is the service worker file. It runs in the background in the browser.

/**
 * Listen for incoming push notifications.
 */
self.addEventListener('push', event => {
  console.log('[Service Worker] Push Received.');

  // Default values in case the payload is malformed.
  let notificationData = {
    title: 'New Message',
    body: 'You have a new message.',
    icon: '/logo.svg',
    image: undefined,
    url: '/',
  };

  // Try to parse the payload from the push event.
  // This is the data sent from our `send-fcm-notification` server function.
  if (event.data) {
    try {
      const payload = event.data.json();
      notificationData = {
        title: payload.title || 'New Message',
        body: payload.body || 'You have a new message.',
        icon: payload.icon || '/logo.svg',
        image: payload.image, // This can be undefined if no image is sent
        url: payload.url || '/',
      };
    } catch (e) {
      console.error('[Service Worker] Error parsing push data. Using defaults.', e);
    }
  }

  // Define how the notification will look.
  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    image: notificationData.image,
    badge: '/logo.svg', // A small monochrome icon for the status bar on mobile
    tag: 'connectsphere-notification', // This groups notifications
    renotify: true,
    // We store the URL to open in the 'data' attribute.
    data: {
      url: notificationData.url,
    },
  };

  // Tell the browser to show the notification.
  // We wrap this in `waitUntil` to ensure the service worker stays alive long enough.
  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

/**
 * Listen for clicks on the notification.
 */
self.addEventListener('notificationclick', event => {
  console.log('[Service Worker] Notification click Received.');

  // Close the notification pop-up.
  event.notification.close();

  // Get the URL we stored in the 'data' attribute.
  const urlToOpen = event.notification.data.url || '/';

  // This is smart logic:
  // It looks for an existing tab of our app and focuses it.
  // If no tab is open, it opens a new one to the correct URL.
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(clientList => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          // If a window is found, navigate it to the correct URL and focus it.
          return client.navigate(urlToOpen).then(c => c.focus());
        }
      }
      // If no window is found, open a new one.
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

/**
 * This event runs when the service worker is first installed.
 */
self.addEventListener('install', event => {
    console.log('[Service Worker] Install');
    // This forces the waiting service worker to become the active service worker.
    self.skipWaiting();
});

/**
 * This event runs when the service worker is activated.
 */
self.addEventListener('activate', event => {
    console.log('[Service Worker] Activate');
    // This allows an active service worker to take control of all clients within its scope.
    event.waitUntil(clients.claim());
});
