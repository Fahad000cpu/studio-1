// This is a basic service worker for handling push notifications.

// Listen for the 'install' event, which signals that the service worker is being installed.
self.addEventListener('install', (event) => {
  console.log('[Service Worker] installing...');
  // Skip waiting to ensure the new service worker activates immediately.
  event.waitUntil(self.skipWaiting());
});

// Listen for the 'activate' event, which signals that the service worker has been activated.
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] activated.');
  // Claim clients to take control of the page without needing a reload.
  event.waitUntil(self.clients.claim());
});

// The core logic: listen for 'push' events from the server.
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.');

  let notificationData = {};
  
  // The payload might be a string, so we try to parse it as JSON.
  try {
    notificationData = event.data.json();
  } catch (e) {
    // If it's not JSON, we'll use the text directly as the body.
    notificationData = {
      title: 'New Notification',
      body: event.data.text(),
    };
  }

  // Extract notification details from the parsed data.
  const title = notificationData.title || 'ConnectSphere';
  const options = {
    body: notificationData.body || 'You have a new message.',
    icon: notificationData.icon || '/logo.svg', // Default icon
    badge: '/logo.svg', // Badge for the notification bar
    // 'data' stores extra information, like the URL to open on click.
    data: {
      url: notificationData.url || '/',
    },
  };
  
  // Display the notification.
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Listen for the 'notificationclick' event, which happens when a user clicks the notification.
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click Received.');

  // Close the notification.
  event.notification.close();

  // Get the URL from the notification's data payload.
  const urlToOpen = event.notification.data.url;

  // This complex part checks if a window with the target URL is already open.
  // If it is, it focuses that window. If not, it opens a new one.
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      // Check if there's an open window with the same URL.
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If no matching window is found, open a new one.
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
