// Using compat libraries for robust messaging handling
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// This configuration is automatically populated with your project's details.
// Make sure these values are correct for your Firebase project.
const firebaseConfig = {
  apiKey: "AIzaSyDzOlXqeSrR9nSczZZ0PQRkZezeKbWveL0",
  authDomain: "connectsphere2132-709496-dcb23.firebaseapp.com",
  projectId: "connectsphere2132-709496-dcb23",
  storageBucket: "connectsphere2132-709496-dcb23.firebasestorage.app",
  messagingSenderId: "729479214132",
  appId: "1:729479214132:web:68b20e669c923e6a908661",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// This handler is triggered when a push message is received while the app is in the background.
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Background message received: ', payload);

  // The payload from a data-only message comes in the `data` property.
  const notificationTitle = payload.data.title || 'New Message';
  const notificationOptions = {
    body: payload.data.body || 'You have a new notification!',
    icon: payload.data.icon || '/icons/icon-192x192.png',
    image: payload.data.image, // Optional image
    badge: '/icons/icon-72x72.png',
    tag: 'connectsphere-notification',
    data: {
      url: payload.data.url || '/' // Pass the URL to the click handler
    }
  };

  // Display the notification.
  self.registration.showNotification(notificationTitle, notificationOptions);
});


// This handler is triggered when a user clicks on the notification.
self.addEventListener('notificationclick', (event) => {
  console.log('[sw.js] Notification click Received.');

  event.notification.close();

  const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      // If a window for this app is already open, focus it.
      for (const client of clientList) {
        // Check if the client URL has the same path.
        if (new URL(client.url).pathname === new URL(urlToOpen).pathname && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window to the correct URL.
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Basic service worker lifecycle events.
self.addEventListener('install', (event) => {
    console.log('[sw.js] Service worker installing...');
    // self.skipWaiting() ensures the new service worker activates immediately.
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    console.log('[sw.js] Service worker activating...');
    // self.clients.claim() allows the activated service worker to take control of open clients.
    event.waitUntil(self.clients.claim());
});
