// Final Professional Service Worker for Firebase Cloud Messaging
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// IMPORTANT: This config is copied from `src/firebase/config.ts`
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

// This listener handles messages received when the app is in the background.
// It's responsible for displaying the notification.
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Background message received: ', payload);
  
  // The actual notification content comes from the 'data' payload.
  const notificationTitle = payload.data.title;
  const notificationOptions = {
    body: payload.data.body,
    icon: payload.data.icon,
    // We pass the URL to the notification's data property so we can
    // use it in the 'notificationclick' event listener.
    data: {
        url: payload.data.url 
    }
  };

  // Ensure we have a title before trying to show a notification.
  if (notificationTitle) {
    self.registration.showNotification(notificationTitle, notificationOptions);
  } else {
    console.warn('[sw.js] Received background message without a title, not showing notification.');
  }
});

// This listener handles the user clicking on the notification.
self.addEventListener('notificationclick', (event) => {
  console.log('[sw.js] Notification click Received.', event.notification);

  // Close the notification.
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  // This looks for an existing window/tab with the same URL and focuses it.
  // If not found, it opens a new one.
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      // Check if there's a client running the app already.
      for (const client of clientList) {
        // If a client is found, focus it.
        if (client.url.includes(self.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // If no existing window is found, open a new one.
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// This is required for PWA installability. A basic fetch handler is enough.
self.addEventListener('fetch', function(event) {
    // You can add more complex caching logic here if needed.
});
