// v3: Professional, reliable, and correct Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// This configuration is public and safe to be in the service worker.
// It is initialized here to ensure that Firebase is ready before any push events are received.
const firebaseConfig = {
    apiKey: "AIzaSyDzOlXqeSrR9nSczZZ0PQRkZezeKbWveL0",
    authDomain: "connectsphere2132-709496-dcb23.firebaseapp.com",
    projectId: "connectsphere2132-709496-dcb23",
    storageBucket: "connectsphere2132-709496-dcb23.appspot.com",
    messagingSenderId: "729479214132",
    appId: "1:729479214132:web:68b20e669c923e6a908661",
    measurementId: "G-8R7MKB0W18"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// This listener handles messages received when the app is in the background or closed.
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Background message received: ', payload);

  // The payload for data-only messages comes in the `data` property.
  const notificationTitle = payload.data.title || 'New Message';
  const notificationOptions = {
    body: payload.data.body || 'You have a new notification!',
    icon: payload.data.icon || '/logo192.png',
    badge: '/logo72.png',
    // The URL to open when the notification is clicked.
    data: {
      url: payload.data.url || '/'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// This listener handles the click event on the notification.
self.addEventListener('notificationclick', (event) => {
  console.log('[sw.js] Notification click Received.', event.notification.data);
  
  event.notification.close();

  const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;

  // Focus an existing window or open a new one.
  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      for (const client of clientList) {
        // If a window for this URL is already open, focus it.
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window.
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Basic fetch handler for PWA installability criteria.
self.addEventListener('fetch', (event) => {
  // This is a placeholder. For a full offline experience, you would
  // implement caching strategies here.
});
