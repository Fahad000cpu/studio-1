// public/sw.js

// This service worker is intentionally kept simple.
// It's required for the PWA manifest to be installable and for Firebase Messaging.

self.addEventListener('install', (event) => {
    // console.log('Service Worker: Install');
    // self.skipWaiting(); // Optional: forces the waiting service worker to become the active service worker.
});

self.addEventListener('activate', (event) => {
    // console.log('Service Worker: Activate');
    // event.waitUntil(clients.claim()); // Optional: become available to all pages controlled by this service worker.
});

self.addEventListener('fetch', (event) => {
    // This is a basic pass-through fetch handler.
    // More advanced caching strategies can be implemented here.
    event.respondWith(fetch(event.request));
});

try {
    // The firebase-messaging-sw.js script will be loaded and initialized by Firebase itself.
    // We just need to import it.
    importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
    importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

    // This config is a duplicate from your main app config.
    // It's necessary because service workers run in a separate context.
    const firebaseConfig = {
      apiKey: "AIzaSyB8ADt_BHfhhcIwDax82s13GVYJAefjA0g",
      authDomain: "studio-6505166944-ae18f.firebaseapp.com",
      projectId: "studio-6505166944-ae18f",
      storageBucket: "studio-6505166944-ae18f.appspot.com",
      messagingSenderId: "954303139735",
      appId: "1:954303139735:web:1cb50131d512627c9d3ed2",
      measurementId: "G-1TC3B2RSWT"
    };

    firebase.initializeApp(firebaseConfig);

    const messaging = firebase.messaging();

    // Background message handler
    messaging.onBackgroundMessage((payload) => {
      console.log('[sw.js] Received background message ', payload);
      
      const notificationTitle = payload.notification?.title || 'New Message';
      const notificationOptions = {
        body: payload.notification?.body,
        icon: '/logo192.png', // A default icon
        data: {
            url: payload.data?.url || '/' // Pass the URL for click handling
        }
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });

} catch (e) {
    console.error('Error in service worker Firebase setup:', e);
}


// Handle notification click event
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If a window for the app is already open, focus it
            for (const client of clientList) {
                // You might need to adjust the URL check depending on your app's structure
                if (client.url.includes(self.location.origin) && 'focus' in client) {
                    return client.navigate(targetUrl).then(c => c.focus());
                }
            }
            // If no window is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
