// Modern, robust Service Worker for Firebase Cloud Messaging

// Import the Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// This promise will resolve with the Firebase config fetched from our API
const firebaseConfigPromise = fetch('/api/firebase-config')
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to fetch Firebase config');
        }
        return response.json();
    })
    .catch(err => {
        console.error('[SW] Error fetching Firebase config:', err);
    });

// This promise will resolve with the initialized Firebase app
const appPromise = firebaseConfigPromise.then(config => {
    if (config && !firebase.apps.length) {
        console.log('[SW] Initializing Firebase App with config:', config);
        return firebase.initializeApp(config);
    } else if (firebase.apps.length) {
        return firebase.app(); // Use existing app
    }
});

// The 'install' event is a great place to warm up the cache.
self.addEventListener('install', (event) => {
    console.log('[SW] Install event!');
    event.waitUntil(self.skipWaiting()); // Activate new SW immediately
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activate event!');
    event.waitUntil(self.clients.claim()); // Take control of all clients
});

// The 'push' event is triggered when a push notification is received.
self.addEventListener('push', (event) => {
    console.log('[SW] Push Received:', event.data.text());
    
    let notificationPayload;
    try {
        notificationPayload = event.data.json();
    } catch (e) {
        console.error('[SW] Failed to parse push data as JSON:', e);
        notificationPayload = { data: { title: 'New Notification', body: event.data.text() } };
    }

    const { title, body, icon, image, url } = notificationPayload.data;

    const notificationTitle = title || 'ConnectSphere';
    const notificationOptions = {
        body: body || 'You have a new message.',
        icon: icon || '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        image: image,
        data: {
            url: url || '/'
        }
    };

    const notificationPromise = self.registration.showNotification(notificationTitle, notificationOptions);
    event.waitUntil(notificationPromise);
});

// The 'notificationclick' event is triggered when a user clicks on a notification.
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification click Received.');

    event.notification.close();

    const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

    const promiseChain = clients.matchAll({
        type: 'window',
        includeUncontrolled: true
    }).then((windowClients) => {
        let matchingClient = null;
        for (let i = 0; i < windowClients.length; i++) {
            const windowClient = windowClients[i];
            if (new URL(windowClient.url).pathname === new URL(urlToOpen).pathname) {
                matchingClient = windowClient;
                break;
            }
        }

        if (matchingClient) {
            return matchingClient.focus();
        } else {
            return clients.openWindow(urlToOpen);
        }
    });

    event.waitUntil(promiseChain);
});


// Initialize Firebase Messaging to ensure it's ready
appPromise.then(app => {
    if (app) {
        const messaging = firebase.messaging(app);
        console.log('[SW] Firebase Messaging interface initialized.');
    }
});
