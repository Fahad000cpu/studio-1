
// This service worker is essential for receiving push notifications when the app is in the background.

// Import the Firebase scripts that are needed in the service worker
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker with your project's configuration
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

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

/**
 * onBackgroundMessage is the handler for messages received when the app is in the background.
 * It's responsible for showing the notification to the user.
 */
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Received background message ', payload);

  // Extract the title and options from the incoming payload.
  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message.',
    icon: payload.notification?.icon || '/logo.svg',
    badge: '/logo.svg',
    tag: payload.notification?.tag,
    renotify: true,
    // Store the URL to open in the notification's data property.
    data: {
        url: payload.data?.url || '/'
    }
  };

  // Show the notification.
  self.registration.showNotification(notificationTitle, notificationOptions);
});

/**
 * This event listener handles the user clicking on the notification.
 */
self.addEventListener('notificationclick', function(event) {
    console.log('[sw.js] Notification click Received.', event.notification);

    // Close the notification.
    event.notification.close();
    
    // Get the URL to open from the notification's data.
    const urlToOpen = event.notification.data.url;

    // This looks for an open window with the same URL and focuses it.
    // If it's not found, it opens a new window.
    event.waitUntil(
        clients.matchAll({
            type: "window",
            includeUncontrolled: true
        }).then(function(clientList) {
            for (var i = 0; i < clientList.length; i++) {
                var client = clientList[i];
                if (client.url === urlToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
