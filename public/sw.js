// Using compat scripts for robust, widespread browser support.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// --- Firebase Initialization ---
// This configuration MUST match your client-side config.
const firebaseConfig = {
  projectId: "studio-6505166944-ae18f",
  appId: "1:954303139735:web:1cb50131d512627c9d3ed2",
  storageBucket: "studio-6505166944-ae18f.appspot.com",
  authDomain: "studio-6505166944-ae18f.firebaseapp.com",
  messagingSenderId: "9690130479",
  // No apiKey needed in SW
};

try {
    firebase.initializeApp(firebaseConfig);
} catch (e) {
    console.error('SW: Firebase app is already initialized.');
}


const messaging = firebase.messaging();

// --- Background Message Handler ---
// This is triggered when a push notification is received while the app is in the background.
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Received background message: ', payload);

  // The 'data' property is sent from our server actions.
  const notificationTitle = payload.data.title || 'New Notification';
  const notificationOptions = {
    body: payload.data.body || 'You have a new message.',
    // Use externally hosted icons that are guaranteed to exist.
    icon: payload.data.image || 'https://i.ibb.co/3sS7hF1/icon-192x192.png',
    badge: 'https://i.ibb.co/L8d5Yx2/icon-72x72.png',
    tag: payload.data.tag || 'connectsphere-notification', // Helps group notifications
    data: {
      url: payload.data.url || '/', // URL to open on click
    },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// --- Notification Click Handler ---
// This is triggered when a user clicks on a displayed notification.
self.addEventListener('notificationclick', (event) => {
  console.log('[sw.js] Notification click received.', event);

  event.notification.close();

  const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;

  // This looks for an existing window/tab with the same URL and focuses it.
  // If not found, it opens a new one.
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      // Check if there's a client running the app already.
      const existingClient = clientList.find(client => new URL(client.url, self.location.origin).href === urlToOpen);

      if (existingClient) {
          return existingClient.focus();
      }
      
      // If no client is open, open a new window.
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// --- PWA Lifecycle Listeners ---
// These are essential for the Service Worker to be recognized and activated correctly,
// which is a prerequisite for generating a push token.

self.addEventListener('install', (event) => {
  console.log('[sw.js] Service worker installing...');
  // self.skipWaiting() ensures the new SW activates immediately, replacing the old one.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[sw.js] Service worker activating...');
  // event.waitUntil(clients.claim()) allows the SW to control pages that are already open without a reload.
  event.waitUntil(clients.claim());
});

// A minimal fetch listener is required for a PWA to be considered "installable" by some browsers.
// This basic network-first strategy is safe and non-intrusive.
self.addEventListener('fetch', (event) => {
  // We are not intercepting requests for now. This is just to satisfy PWA criteria.
  return;
});
