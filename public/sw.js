
// This makes the service worker 'installable' and allows it to pre-cache assets.
// It also handles background push notifications.

// Make sure to use the 'compat' libraries for service workers.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

let firebaseApp;
let firebaseConfig;

// --- 1. FIREBASE INITIALIZATION ---

// Function to initialize Firebase once we have the config.
const initializeFirebase = (config) => {
    // Check if Firebase is already initialized to prevent errors.
    if (firebase.apps.length > 0) {
        return;
    }

    try {
        firebaseApp = firebase.initializeApp(config);
        const messaging = firebase.messaging();

        // This is the listener for background push notifications.
        messaging.onBackgroundMessage((payload) => {
            console.log('[sw.js] Received background message ', payload);

            const notificationTitle = payload.notification.title;
            const notificationOptions = {
                body: payload.notification.body,
                icon: payload.notification.icon || '/logo192.png',
                data: {
                    url: payload.data.url // Pass the URL to the click handler
                }
            };

            // Show the notification.
            self.registration.showNotification(notificationTitle, notificationOptions);
        });
    } catch (e) {
        console.error('Error initializing Firebase in SW', e);
    }
};

// We fetch our Firebase config from a server API route.
// This is more secure and avoids hardcoding keys in a public file.
const firebaseConfigPromise = fetch('/api/firebase-config')
    .then(response => response.json())
    .then(config => {
        firebaseConfig = config;
        initializeFirebase(config);
        return config;
    })
    .catch(error => {
        console.error('Error fetching Firebase config in SW:', error)
    });

// --- 2. SERVICE WORKER LIFECYCLE & EVENT HANDLERS ---

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const notificationUrl = event.notification.data.url || '/';

    // This logic ensures that if the app is already open, it focuses on the existing window.
    // If not, it opens a new one.
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url === self.location.origin + notificationUrl && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(notificationUrl);
            }
        })
    );
});


// --- 3. OFFLINE CACHING ---
const CACHE_NAME = 'connectsphere-cache-v1';
const urlsToCache = [
  '/',
  '/discover',
  '/chat',
  '/login',
  '/manifest.json',
  '/logo192.png',
  '/logo512.png'
];

self.addEventListener('install', (event) => {
  // Pre-cache essential app shell assets during installation.
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Use a "cache-first" strategy.
  // If a request is found in the cache, serve it from there for a fast, offline-first experience.
  // If not, fetch it from the network.
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response; // Serve from cache
        }
        return fetch(event.request); // Fetch from network
      })
  );
});
