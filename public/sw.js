// Scripts for Firebase App and Messaging
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// Your web app's Firebase configuration
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
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

// This listener handles the click event on the notification.
self.addEventListener('notificationclick', (event) => {
    console.log('[Service Worker] Notification click Received.', event.notification);
    
    event.notification.close();

    // This looks to see if the current is already open and
    // focuses, otherwise opens a new tab
    const urlToOpen = new URL(event.notification.data.url, self.location.origin).href;

    event.waitUntil(clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        // Check if the client's URL matches the notification's URL
        const clientUrl = new URL(client.url);
        const notificationUrl = new URL(urlToOpen);
        
        if (clientUrl.pathname === notificationUrl.pathname && 'focus' in client) {
          // If a tab with the same path is open, focus it.
          // This is useful to avoid opening duplicate chat windows.
          return client.focus();
        }
      }
      // If no matching tab is found, open a new one.
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    }));
});
