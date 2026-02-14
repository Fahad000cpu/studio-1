// Final Professional Service Worker for Firebase Cloud Messaging
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase with your project's configuration
firebase.initializeApp({
    "projectId": "studio-6505166944-ae18f",
    "appId": "1:954303139735:web:1cb50131d512627c9d3ed2",
    "storageBucket": "studio-6505166944-ae18f.firebasestorage.app",
    "apiKey": "AIzaSyA3C0VowePTvCbPgpzmcKC9GqAE2M0bscs",
    "authDomain": "studio-6505166944-ae18f.firebaseapp.com",
    "messagingSenderId": "954303139735"
});

const messaging = firebase.messaging();

// Required for PWA Installability - a simple fetch handler
self.addEventListener('fetch', function(event) {
    // This basic fetch handler is sufficient to make the app installable.
});

// Handle Background Messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received: ', payload);
  
  // Extract notification data from the 'data' payload for data-only messages
  const notificationTitle = payload.data.title || 'New Message';
  const notificationOptions = {
    body: payload.data.body || 'You have a new notification!',
    icon: payload.data.image || 'https://placehold.co/192x192/059669/ffffff?text=PWA', // Use image from data payload if available
    badge: 'https://placehold.co/72x72/059669/ffffff?text=N',
    tag: payload.data.tag || 'default-tag',
    data: {
        url: payload.data.url || '/' // Pass the URL for the click action
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle Notification Click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      // Check if a window is already open with the target URL
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
