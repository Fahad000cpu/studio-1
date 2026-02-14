// v1.5 - A self-initializing, robust service worker for ConnectSphere
'use strict';

// Import Firebase and Messaging scripts
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

const CACHE_NAME = 'connectsphere-v1.5';
const OFFLINE_URL = '/offline.html';

// This promise will resolve with the Firebase Messaging instance once initialized
const firebaseMessagingPromise = fetch('/api/firebase-config')
  .then(response => {
    if (!response.ok) {
      throw new Error('Failed to fetch Firebase config');
    }
    return response.json();
  })
  .then(firebaseConfig => {
    if (firebaseConfig.apiKey && !firebase.apps.length) {
      const app = firebase.initializeApp(firebaseConfig);
      console.log('[SW] Firebase app initialized.');
      return firebase.messaging(app);
    } else if (firebase.apps.length > 0) {
      return firebase.messaging();
    }
    else {
      throw new Error('Firebase API key is missing in config.');
    }
  })
  .catch(error => {
    console.error('[SW] Firebase initialization failed:', error);
    return null; // Return null if initialization fails
  });

self.addEventListener('install', (event) => {
  console.log('[SW] Install');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching offline page.');
      return cache.add(OFFLINE_URL);
    }).then(() => {
      // Skip waiting so the new service worker activates immediately.
      return self.skipWaiting();
    })
  );
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activate');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      // Tell the active service worker to take control of the page immediately.
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', (event) => {
  // Only apply this logic to navigation requests
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => {
        // If the fetch fails (e.g., offline), serve the offline page from the cache.
        return caches.match(OFFLINE_URL);
      })
    );
  }
});

// Setup background message handler
firebaseMessagingPromise.then(messaging => {
  if (messaging) {
    messaging.onBackgroundMessage((payload) => {
      console.log('[SW] Background message received: ', payload);
      
      const data = payload.data || {};
      const notificationTitle = data.title || 'New Notification';
      const notificationOptions = {
        body: data.body || 'You have a new message!',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        data: {
            url: data.url || '/' // Default URL if none is provided
        }
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  }
});


self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification click received.');
    event.notification.close();
    
    const urlToOpen = new URL(event.notification.data.url || '/', self.location.origin).href;
  
    event.waitUntil(
      clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      }).then((clientList) => {
        for (const client of clientList) {
          if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
            // If we want to navigate that specific window to the URL:
            if(client.navigate) {
                client.navigate(urlToOpen);
            }
            return client.focus();
          }
        }
        // If no window is open, open a new one.
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
    );
  });
