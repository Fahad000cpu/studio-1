// This is a basic, "bulletproof" service worker for Firebase Cloud Messaging.
// It's designed to be simple and reliable.

// Import the Firebase scripts
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Initialize Firebase
// This configuration is automatically replaced by a build process.
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

// This 'fetch' event listener is required for a web app to be recognized as a PWA.
// Even an empty handler is sufficient.
self.addEventListener('fetch', (event) => {
  // We are not doing any caching here, just fulfilling the PWA requirement.
});


// Handle background messages. This is triggered for "data-only" messages
// when the app is in the background or closed.
messaging.onBackgroundMessage((payload) => {
  console.log('[sw.js] Background message received: ', payload);

  // Safely parse the data payload
  let data = {};
  try {
    if (payload.data) {
      data = JSON.parse(payload.data);
    }
  } catch(e) {
    console.error("Failed to parse FCM data payload:", e);
  }

  // Use the title and body from the parsed data, or provide defaults.
  const notificationTitle = data.title || 'New Message';
  const notificationOptions = {
    body: data.body || 'You have a new notification!',
    icon: data.icon || '/logo.svg',
    image: data.image || undefined,
    data: {
        url: data.url || '/' // Pass URL for click handling
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});


// Handle notification click event
self.addEventListener('notificationclick', function(event) {
    console.log('[sw.js] Notification click Received.', event);
    event.notification.close();

    let clickUrl = '/'; // Default URL
    
    // Safely parse the notification data to get the URL
    if (event.notification.data) {
        try {
            const data = JSON.parse(event.notification.data);
            if (data.url) {
                clickUrl = data.url;
            }
        } catch (e) {
            console.error("Couldn't parse notification data from string:", e);
            // Fallback if data is an object but not a string
            if (typeof event.notification.data === 'object' && event.notification.data.url) {
                clickUrl = event.notification.data.url;
            }
        }
    }
    
    // This logic looks for an existing window and focuses it, or opens a new one.
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
            // Check if there's a window already open with the target URL
            for (const client of clientList) {
                const clientUrl = new URL(client.url);
                const targetUrl = new URL(clickUrl, client.url); // Resolve relative URL
                if (clientUrl.pathname === targetUrl.pathname && 'focus' in client) {
                    return client.focus();
                }
            }
            // If no window is found, open a new one.
            if (clients.openWindow) {
                return clients.openWindow(clickUrl);
            }
        })
    );
});
