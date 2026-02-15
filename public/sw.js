// A professional, production-ready service worker for Firebase Cloud Messaging.
// This version is self-contained and does not fetch config, preventing race conditions.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// --- IMPORTANT: This config is for the "connectsphere2132-709496-dcb23" project ---
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
try {
  firebase.initializeApp(firebaseConfig);
} catch (e) {
  console.error("Firebase initialization failed in Service Worker. This can happen on repeated initializations.", e);
}


const messaging = firebase.messaging();

// --- Background Message Handling ---
// This function is triggered when a notification is received while the app is in the background.
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Background message received: ', payload);
  
  // The payload from a DATA message comes in the `data` property.
  const notificationTitle = payload.data.title || 'New ConnectSphere Message';
  const notificationOptions = {
    body: payload.data.body,
    icon: payload.data.icon || '/logo192.png',
    badge: '/logo72.png',
    image: payload.data.image, // Optional image
    tag: 'connectsphere-notification',
    data: {
      url: payload.data.url || '/' // URL to open on click
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});


// --- Notification Click Event Handling ---
// This function is triggered when a user clicks on a notification.
self.addEventListener('notificationclick', (event) => {
  console.log('[sw.js] Notification clicked: ', event.notification);
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  // This code ensures that when a notification is clicked, it focuses an existing app window
  // or opens a new one, preventing multiple tabs of the same app.
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      // Check if a window is already open at the target URL.
      for (const client of clientList) {
        // Use URL objects for robust comparison, ignoring hash.
        const clientUrl = new URL(client.url);
        const targetUrl = new URL(urlToOpen, self.location.origin);
        if (clientUrl.pathname === targetUrl.pathname && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is found, open a new one.
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// --- PWA Lifecycle Events ---
// These ensure the service worker updates correctly.
self.addEventListener('install', (event) => {
  console.log('[sw.js] Service worker installed.');
  // Skip waiting to activate the new service worker immediately.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[sw.js] Service worker activated.');
  // Take control of all open pages at once.
  event.waitUntil(clients.claim());
});
