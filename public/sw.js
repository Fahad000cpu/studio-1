// Give the service worker a name
const SW_VERSION = '1.0.1';
console.log(`Service Worker (v${SW_VERSION}) is starting...`);

// Import the Firebase app and messaging scripts
try {
    self.importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
    self.importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');
} catch (e) {
    console.error('Failed to import Firebase scripts in service worker.', e);
}

// Your web app's Firebase configuration.
// This is required for the service worker to handle background notifications.
const firebaseConfig = {
  "projectId": "studio-6505166944-ae18f",
  "appId": "1:954303139735:web:d06fadc26caecc199d3ed2",
  "storageBucket": "studio-6505166944-ae18f.firebasestorage.app",
  "apiKey": "YOUR_NEXT_PUBLIC_FIREBASE_API_KEY", // IMPORTANT: Manually replace this with your Firebase API Key from the .env file.
  "authDomain": "studio-6505166944-ae18f.firebaseapp.com",
  "measurementId": "G-VF0N789N79",
  "messagingSenderId": "954303139735"
};

// Initialize Firebase
if (typeof self.firebase !== 'undefined' && !self.firebase.apps.length) {
    try {
        self.firebase.initializeApp(firebaseConfig);
    } catch (e) {
        console.error('Failed to initialize Firebase in service worker.', e);
    }
}

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
let messaging;
if (typeof self.firebase !== 'undefined' && self.firebase.apps.length > 0) {
    try {
        messaging = self.firebase.messaging();
    } catch(e) {
        console.error('Failed to initialize Firebase Messaging in service worker.', e);
    }
}

// Handle incoming messages. This is the core of background notifications.
if (messaging) {
    messaging.onBackgroundMessage((payload) => {
        console.log('[sw.js] Received background message ', payload);

        // Customize the notification here
        const notificationTitle = payload.notification?.title || 'New Message';
        const notificationOptions = {
            body: payload.notification?.body || 'You have a new message.',
            icon: payload.notification?.icon || '/logo192.png',
            data: {
                url: payload.data?.url || '/'
            }
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
    });
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('[sw.js] Notification click Received.', event);

    event.notification.close();

    const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;

    event.waitUntil(
        self.clients.matchAll({
            type: 'window',
            includeUncontrolled: true,
        }).then((clientList) => {
            for (const client of clientList) {
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (self.clients.openWindow) {
                return self.clients.openWindow(urlToOpen);
            }
        })
    );
});


// Basic caching for offline support
const CACHE_NAME = `connectsphere-cache-v${SW_VERSION}`;
const urlsToCache = [
  '/',
  '/offline.html'
];

self.addEventListener('install', (event) => {
  console.log('[sw.js] Install event');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[sw.js] Opened cache');
        const offlinePage = new Response('<h1>You are offline</h1><p>Please check your internet connection.</p>', {
          headers: { 'Content-Type': 'text/html' }
        });
        cache.put('/offline.html', offlinePage);
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }

        return fetch(event.request).then(
          (response) => {
            if(!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(() => {
            return caches.match('/offline.html');
        });
      })
    );
});

self.addEventListener('activate', (event) => {
    console.log('[sw.js] Activate event');
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log(`[sw.js] Deleting old cache: ${cacheName}`);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});
