// Final Professional Service Worker for Firebase Cloud Messaging
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// This is the correct and complete Firebase configuration for your project.
firebase.initializeApp({
    "apiKey": "AIzaSyDzOlXqeSrR9nSczZZ0PQRkZezeKbWveL0",
    "authDomain": "connectsphere2132-709496-dcb23.firebaseapp.com",
    "projectId": "connectsphere2132-709496-dcb23",
    "storageBucket": "connectsphere2132-709496-dcb23.appspot.com",
    "messagingSenderId": "729479214132",
    "appId": "1:729479214132:web:68b20e669c923e6a908661"
});

const messaging = firebase.messaging();

// This basic fetch handler is required to make the PWA installable.
self.addEventListener('fetch', function(event) {
    // This handler is intentionally kept simple.
});

// Handle background notifications
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Received background message: ', payload);
  
  // NOTE: For background notifications, the message details come from the `data` property.
  const notificationTitle = payload.data.title || 'New Message';
  const notificationOptions = {
    body: payload.data.body || 'You have a new notification!',
    icon: payload.data.icon || '/logo192.png',
    badge: '/logo72.png',
    data: {
        url: payload.data.url || '/' // URL to open on click
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});


// This event is triggered when a user clicks on the notification.
self.addEventListener('notificationclick', (event) => {
  console.log('[sw.js] Notification clicked. Event:', event);

  event.notification.close();

  // This code opens the app and focuses it if it's already open.
  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // If a window for the app is already open, focus it.
      for (const client of clientList) {
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
