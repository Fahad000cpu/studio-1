// Give the service worker a name
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// Import and initialize the Firebase SDK
// Using compat libraries as they are designed for this context
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const firebaseConfig = {
  "apiKey": "AIzaSyB8ADt_BHfhhcIwDax82s13GVYJAefjA0g",
  "authDomain": "studio-6505166944-ae18f.firebaseapp.com",
  "projectId": "studio-6505166944-ae18f",
  "storageBucket": "studio-6505166944-ae18f.appspot.com",
  "messagingSenderId": "954303139735",
  "appId": "1:954303139735:web:1cb50131d512627c9d3ed2",
  "measurementId": "G-1TC3B2RSWT"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle incoming messages when the app is in the background or closed
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Received background message ', payload);

  // Customize the notification here
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    // data allows us to pass a URL to open when the notification is clicked
    data: {
      url: payload.fcmOptions?.link || payload.data?.url || '/',
    },
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
       for (const client of clientList) {
        // If a window for the app is already open, focus it and navigate
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      // Otherwise, open a new window
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
