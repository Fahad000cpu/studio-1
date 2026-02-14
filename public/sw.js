// Using compat libraries for robust messaging support
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  // Skip waiting to ensure the new service worker activates immediately.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  // Take control of all clients as soon as the service worker activates.
  event.waitUntil(self.clients.claim());
});

// Fetch the Firebase config from a dedicated API route
// This is the most robust way to avoid hardcoding credentials
const firebaseAppPromise = fetch('/api/firebase-config')
  .then(response => response.json())
  .then(config => {
    // Check if Firebase is already initialized to avoid errors
    if (!firebase.apps.length) {
      console.log('Service Worker: Initializing Firebase App...');
      return firebase.initializeApp(config);
    }
    return firebase.app(); // Return the already initialized app
  })
  .catch(error => {
    console.error('Service Worker: Failed to fetch Firebase config or initialize app.', error);
  });

// Handle incoming push notifications
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push Received.');
  
  // The push data is expected to be a JSON string.
  const payload = event.data ? event.data.json() : {};
  
  // The actual notification data is in `payload.data` because we are sending data-only messages.
  const notificationData = payload.data || {};

  const title = notificationData.title || 'New Notification';
  const options = {
    body: notificationData.body || 'You have a new message.',
    icon: notificationData.icon || '/icons/icon-192x192.png', // A default icon
    badge: '/icons/icon-72x72.png', // A default badge
    data: {
      url: notificationData.url || '/', // The URL to open on click
    },
  };

  // Wait until the notification is shown.
  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click events
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification click Received.');

  // Close the notification
  event.notification.close();

  const urlToOpen = event.notification.data.url || '/';

  // This looks for an existing window/tab with the same URL and focuses it.
  // If not found, it opens a new window/tab.
  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      // Check if there's a window open with the app's origin
      for (const client of clientList) {
        // You can add more specific URL checks here if needed
        if (client.url.startsWith(self.origin) && 'focus' in client) {
          // If a window is found, navigate it to the correct URL and focus it.
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // If no window is found, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Initialize the messaging service with the firebaseAppPromise
firebaseAppPromise.then(app => {
  if (app) {
    const messaging = firebase.messaging(app);
    // The onBackgroundMessage is useful for compat, but the 'push' event listener is more standard.
    // It's good to have for certain edge cases.
    messaging.onBackgroundMessage((payload) => {
      console.log('[firebase-messaging-sw.js] Received background message (compat handler)', payload);
      
      const notificationTitle = payload.data.title;
      const notificationOptions = {
        body: payload.data.body,
        icon: payload.data.icon || '/icons/icon-192x192.png',
        data: {
            url: payload.data.url || '/',
        }
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  }
});
