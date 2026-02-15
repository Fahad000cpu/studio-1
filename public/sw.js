// Service Worker for Firebase Cloud Messaging

// Importing Firebase App and Messaging modules
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// --- Your Web App's Firebase Configuration ---
// This is hardcoded for reliability in the service worker environment.
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
if (firebase.apps.length === 0) {
  firebase.initializeApp(firebaseConfig);
}

const messaging = firebase.messaging();

// Handle Background Messages: This is where we show the notification.
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Background message received: ', payload);
  
  // Extract notification data from the payload.
  // We prioritize the 'data' object for custom payloads sent from the server action.
  const notificationTitle = payload.data?.title || payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.data?.body || payload.notification?.body || 'You have a new notification!',
    icon: payload.data?.image || payload.notification?.image || 'https://i.ibb.co/6gqCnsd/logo-192.png',
    badge: 'https://i.ibb.co/Ld9zCns/logo-512.png',
    tag: 'connectsphere-notification',
    // Store the URL to open on click in the data property
    data: {
      url: payload.data?.url || '/' // Default to opening the app's root
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle Notification Clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[sw.js] Notification clicked: ', event.notification);
  
  // Close the notification
  event.notification.close();

  // Get the URL from the notification's data
  const urlToOpen = event.notification.data?.url || '/';

  // Open the app or focus the existing window
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // If a window for the app is already open, focus it
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// A basic fetch listener is needed for PWA installability prompts.
self.addEventListener('fetch', (event) => {
  // We don't need to do anything special here for notifications to work.
  // This just ensures the service worker is active.
});
