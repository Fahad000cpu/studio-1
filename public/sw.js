// Final Professional Service Worker for Firebase Cloud Messaging
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const firebaseConfig = {
    "projectId": "studio-6505166944-ae18f",
    "appId": "1:954303139735:web:1cb50131d512627c9d3ed2",
    "storageBucket": "studio-6505166944-ae18f.appspot.com",
    "apiKey": "AIzaSyB8ADt_BHfhhcIwDax82s13GVYJAefjA0g",
    "authDomain": "studio-6505166944-ae18f.firebaseapp.com",
    "measurementId": "G-1TC3B2RSWT",
    "messagingSenderId": "954303139735"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Required for PWA Installability
self.addEventListener('fetch', function(event) {
    // A basic fetch handler to make the app installable.
});


// Listen for incoming push notifications (data-only payloads)
self.addEventListener('push', (event) => {
    console.log('[sw.js] Push event received.');
    
    let payload;
    try {
        payload = event.data.json();
    } catch (e) {
        console.error('[sw.js] Could not parse push data as JSON.', e);
        // Show a generic notification if payload is unreadable
        event.waitUntil(
            self.registration.showNotification('New Message', {
                body: 'You have a new message.',
                icon: '/logo.svg'
            })
        );
        return;
    }

    const notificationData = payload.data;
    if (!notificationData) {
        console.error('[sw.js] Push payload does not contain a "data" object.');
        return;
    }
    
    const title = notificationData.title || 'New Message';
    const options = {
        body: notificationData.body || 'You have a new message.',
        icon: notificationData.icon || '/logo.svg',
        data: {
            url: notificationData.url || '/'
        }
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    console.log('[sw.js] Notification click received: ', event.notification);
    event.notification.close();

    const urlToOpen = event.notification.data.url;

    event.waitUntil(clients.matchAll({
        type: "window",
        includeUncontrolled: true
    }).then((clientList) => {
        for (const client of clientList) {
            // If a window for this app is already open, focus it.
            if (new URL(client.url).pathname === urlToOpen && 'focus' in client) {
                return client.focus();
            }
        }
        // If no matching window is open, open a new one.
        if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
        }
    }));
});
