// public/sw.js
// This Service Worker is for handling Firebase Cloud Messaging in the background.

// Import the Firebase app and messaging modules.
// Using 'compat' for the onBackgroundMessage API.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Your web app's Firebase configuration.
const firebaseConfig = {
  apiKey: "AIzaSyDzOlXqeSrR9nSczZZ0PQRkZezeKbWveL0",
  authDomain: "connectsphere2132-709496-dcb23.firebaseapp.com",
  projectId: "connectsphere2132-709496-dcb23",
  storageBucket: "connectsphere2132-709496-dcb23.appspot.com",
  messagingSenderId: "729479214132",
  appId: "1:729479214132:web:68b20e669c923e6a908661",
  measurementId: "G-8R7MKB0W18"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

/**
 * Handle background messages. This is the entry point for messages received when the app
 * is in the background or closed.
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Received background message ', payload);

  // The payload from a data-only message comes in the 'data' property.
  const notificationData = payload.data;
  if (!notificationData) {
    console.error("[sw.js] No data received in payload, can't show notification.");
    return;
  }

  const notificationTitle = notificationData.title || 'New Message';
  const notificationOptions = {
    body: notificationData.body || 'You have received a new message.',
    icon: 'https://i.ibb.co/3zd4FfN/logo192.png',
    badge: 'https://i.ibb.co/2Z4xLNx/logo72.png',
    data: {
      url: notificationData.url || '/' // URL to open on click.
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});


/**
 * Handle notification click events.
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[sw.js] Notification click Received.');

  event.notification.close();

  const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    }).then((clientList) => {
      // If a window is already open, focus it.
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

/**
 * A basic fetch handler to satisfy PWA installability criteria.
 * In a real-world scenario, you would implement caching strategies here.
 */
self.addEventListener('fetch', (event) => {
  // This is a placeholder. No caching logic is implemented.
  return;
});
