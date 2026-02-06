// Using compat libraries for broader compatibility and simplicity in a vanilla JS Service Worker.
// The version is matched with the one used in the main application.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// This configuration is taken from your project's `src/firebase/config.ts` file.
const firebaseConfig = {
  "projectId": "studio-6505166944-ae18f",
  "appId": "1:954303139735:web:1cb50131d512627c9d3ed2",
  "storageBucket": "studio-6505166944-ae18f.appspot.com",
  "apiKey": "AIzaSyB8ADt_BHfhhcIwDax82s13GVYJAefjA0g",
  "authDomain": "studio-6505166944-ae18f.firebaseapp.com",
  "measurementId": "G-1TC3B2RSWT",
  "messagingSenderId": "954303139735"
};

// Initialize the Firebase app in the service worker.
firebase.initializeApp(firebaseConfig);

// Get a reference to the Firebase Messaging service.
const messaging = firebase.messaging();

/**
 * Handle incoming messages when the app is in the background.
 * This will show a notification to the user.
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Received background message ', payload);

  // Customize the notification from the incoming payload.
  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification!',
    icon: payload.notification?.icon || '/logo.svg', // A default icon
    image: payload.notification?.image,
    badge: '/logo.svg', // A small monochrome icon for the notification tray
    data: payload.data, // Pass along data for when the notification is clicked
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * Handle notification clicks.
 * This brings the app to the front or opens it if it's not already open.
 */
self.addEventListener('notificationclick', (event) => {
    console.log('[sw.js] Notification click received.', event);
    event.notification.close();

    // Default to opening the root, but use data.url if provided.
    const urlToOpen = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // If a window for the app is already open, focus it.
            for (const client of clientList) {
                // Check if the client URL is the one we want to open.
                // This might need adjustment based on your app's routing.
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
 * This event is required by browsers to recognize the app as a PWA
 * and allow it to be 'installed'. We are not intercepting network
 * requests, just providing the necessary handler.
 */
self.addEventListener('fetch', (event) => {
    // No-op
});

/**
 * Force the waiting service worker to become the active service worker.
 * This ensures that updates to the service worker are applied immediately.
 */
self.addEventListener('install', (event) => {
    self.skipWaiting();
});
