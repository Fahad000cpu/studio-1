// Final Professional Service Worker for Firebase Cloud Messaging
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

try {
  // IMPORTANT: Replace this with your actual Firebase config object.
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

  // Handle Background Messages
  // This is triggered when a message is received while the app is in the background or closed.
  messaging.onBackgroundMessage((payload) => {
    console.log('[sw.js] Background message received: ', payload);
    
    // The payload.notification object is used directly by the browser to display the notification.
    // However, if you want to customize it or handle it yourself, you can do so here.
    // For most cases, the browser handles this automatically if the 'notification' key is present in the FCM payload.
    // We show it manually for consistency and control.
    const notificationTitle = payload.notification?.title || 'New Message';
    const notificationOptions = {
      body: payload.notification?.body || 'You have new content!',
      icon: payload.notification?.icon || '/logo.svg',
      badge: '/logo.svg',
      data: payload.data // Pass along data for click events
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });

} catch (error) {
    console.error("Error initializing Firebase in Service Worker:", error);
}


// Handle Notification Clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[sw.js] Notification click Received.', event.notification);
  event.notification.close();
  
  let openUrl = '/'; // Default URL to open
  try {
    // The data is a stringified JSON object, so we need to parse it.
    if (event.notification.data) {
      const data = JSON.parse(event.notification.data);
      if (data && data.url) {
        openUrl = data.url;
      }
    }
  } catch (e) {
    console.error('Error parsing notification data:', e);
  }
  
  // This looks for an existing window and focuses it.
  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    }).then((clientList) => {
      // Check if there's a window already open with the target URL
      for (const client of clientList) {
        // Use URL constructor to ignore hashes and search params
        if (new URL(client.url).pathname === openUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // If no window is found, open a new one.
      if (clients.openWindow) {
        return clients.openWindow(openUrl);
      }
    })
  );
});

// This is required for the service worker to be installable as a PWA, even if it does nothing.
self.addEventListener('fetch', (event) => {
  // This basic fetch handler is needed for PWA installability.
});
