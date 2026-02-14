// This service worker uses the Firebase Messaging compat library for robust notification handling.

// Import Firebase scripts for app and messaging
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js');

// Your web app's Firebase configuration (this is public data)
const firebaseConfig = {
    "projectId": "studio-6505166944-ae18f",
    "appId": "1:954303139735:web:1cb50131d512627c9d3ed2",
    "storageBucket": "studio-6505166944-ae18f.firebasestorage.app",
    "authDomain": "studio-6505166944-ae18f.firebaseapp.com",
    "messagingSenderId": "954303139735"
};

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
} else {
    firebase.app(); // if already initialized, use that one
}

const messaging = firebase.messaging();
const CACHE_NAME = 'connectsphere-v3'; // Increased version for cache busting
const URLS_TO_CACHE = [
  '/',
  '/offline.html'
];

// PWA: Install service worker and cache core assets
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force the waiting service worker to become the active service worker.
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Opened cache');
      return cache.addAll(URLS_TO_CACHE);
    })
  );
});

// PWA: Activate service worker and clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => Promise.all(
      cacheNames.map((cacheName) => {
        if (!cacheWhitelist.includes(cacheName)) {
          console.log(`[SW] Deleting old cache: ${cacheName}`);
          return caches.delete(cacheName);
        }
      })
    )).then(() => self.clients.claim()) // Take control of all clients immediately
  );
});

// PWA: Offline fallback for navigation requests
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/offline.html'))
    );
  }
});

// FCM: Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Background message received: ', payload);

  // We expect a `data` payload from our server actions.
  const data = payload.data || {};
  const notificationTitle = data.title || 'New Message';
  const notificationOptions = {
    body: data.body || 'You have a new notification!',
    icon: data.icon || 'https://i.ibb.co/dKXBfBw/logo192.png', // A reliable placeholder icon
    badge: data.badge || 'https://i.ibb.co/9h0gT21/logo512.png',
    image: data.image,
    data: {
      url: data.url || '/' // Pass the URL to open on click
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// FCM: Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked. Data: ', event.notification.data);
  event.notification.close();

  const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;

  event.waitUntil(clients.matchAll({
    type: 'window',
    includeUncontrolled: true
  }).then((clientList) => {
    // If a window for the app is already open and has the correct URL, focus it.
    for (const client of clientList) {
      if (client.url === urlToOpen && 'focus' in client) {
        return client.focus();
      }
    }
    // If no such window exists, open a new one.
    if (clients.openWindow) {
      return clients.openWindow(urlToOpen);
    }
  }));
});
