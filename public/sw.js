// A robust, vanilla JS service worker for Firebase Cloud Messaging.
// This file is not processed by TypeScript or bundlers.

// Import the Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Initialize Firebase
// IMPORTANT: This config is publicly visible and contains no secrets.
// Security is handled by Firestore Security Rules.
firebase.initializeApp({
  "projectId": "studio-6505166944-ae18f",
  "appId": "1:954303139735:web:1cb50131d512627c9d3ed2",
  "storageBucket": "studio-6505166944-ae18f.appspot.com",
  "apiKey": "AIzaSyB8ADt_BHfhhcIwDax82s13GVYJAefjA0g",
  "authDomain": "studio-6505166944-ae18f.firebaseapp.com",
  "measurementId": "G-1TC3B2RSWT",
  "messagingSenderId": "954303139735"
});

const messaging = firebase.messaging();

// A basic fetch handler is required for the service worker to be recognized as a PWA install candidate.
self.addEventListener('fetch', (event) => {
  // This is a no-op, but it's required.
  // For a full offline-first PWA, you would implement caching strategies here.
});

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Background message received: ', payload);
  
  // A helper to safely parse the data payload sent from our Genkit flow.
  const getWebpushData = () => {
    try {
      if (payload.data && payload.data.webpush) {
        return JSON.parse(payload.data.webpush);
      }
    } catch (e) {
      console.error("Failed to parse webpush data:", e);
    }
    return {};
  };

  const webpushData = getWebpushData();

  // Use data from the webpush payload first, then fallback to the notification payload.
  const notificationTitle = webpushData.title || payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: webpushData.body || payload.notification?.body || 'You have a new notification!',
    icon: webpushData.icon || '/logo.svg',
    badge: '/logo.svg',
    tag: payload.messageId || 'default-tag',
    data: {
      // Set a URL to open on click, defaulting to the app's root.
      url: payload.data?.url || '/'
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});


// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const openUrl = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({
            type: "window",
            includeUncontrolled: true,
        }).then((clientList) => {
            // If a window for the app is already open, focus it.
            for (const client of clientList) {
                // You might need to adjust the URL check depending on your app's routing.
                if (client.url === openUrl && 'focus' in client) {
                    return client.focus();
                }
            }
            // Otherwise, open a new window.
            if (clients.openWindow) {
                return clients.openWindow(openUrl);
            }
        })
    );
});
