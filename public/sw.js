// Import Firebase libraries for service worker
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// This configuration is copied from your app's src/firebase/config.ts
const firebaseConfig = {
  "projectId": "studio-6505166944-ae18f",
  "appId": "1:954303139735:web:1cb50131d512627c9d3ed2",
  "storageBucket": "studio-6505166944-ae18f.appspot.com",
  "apiKey": "AIzaSyB8ADt_BHfhhcIwDax82s13GVYJAefjA0g",
  "authDomain": "studio-6505166944-ae18f.firebaseapp.com",
  "measurementId": "G-1TC3B2RSWT",
  "messagingSenderId": "954303139735"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

/**
 * onBackgroundMessage is the entry point for handling messages received in the background.
 * It is called when a notification is received and the app is in the background or closed.
 */
messaging.onBackgroundMessage(function(payload) {
  console.log('[sw.js] Received background message: ', payload);

  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/favicon.ico', // A small icon that exists
    // The data object is used to pass custom data, like the URL to open on click.
    data: {
      url: payload.data.url || '/'
    }
  };

  // The showNotification method displays the notification to the user.
  self.registration.showNotification(notificationTitle, notificationOptions);
});


/**
 * This event listener is triggered when a user clicks on a notification.
 */
self.addEventListener('notificationclick', function(event) {
  console.log('[sw.js] Notification click received: ', event.notification.data);

  // Close the notification pop-up.
  event.notification.close();

  const urlToOpen = event.notification.data.url || '/';

  // This looks for an open window with the app's URL and focuses it.
  // If no window is found, it opens a new one.
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      // Check if there's a window open that we can focus.
      for (let i = 0; i < clientList.length; i++) {
        let client = clientList[i];
        // You might need to adjust the URL check depending on your app's structure
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window found, open a new one.
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
