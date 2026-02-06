// These scripts are downloaded from the CDN and run in the browser.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// This config is exposed to the browser, so it's safe.
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

// This handler is for messages received when the app is in the background.
messaging.onBackgroundMessage(function(payload) {
  console.log('SW: Received background message ', payload);

  // From the payload, we can get the notification data.
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon,
    badge: payload.notification.badge,
    tag: payload.notification.tag,
    renotify: payload.notification.renotify,
    data: {
      url: payload.data.url // Pass the URL to the data property for click handling
    }
  };

  // The service worker shows the notification.
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// This handler is for when the user clicks on the notification.
self.addEventListener('notificationclick', function(event) {
  // The notification is closed when clicked.
  event.notification.close();

  // Get the URL from the notification's data property.
  const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;

  // This function finds an existing window/tab or opens a new one.
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // If a window with the same URL is already open, focus it.
      for (const client of clientList) {
        if (new URL(client.url).pathname === new URL(urlToOpen).pathname && 'focus' in client) {
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
