
self.addEventListener('install', (event) => {
  console.log('Service Worker: Install event');
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activate event');
});

self.addEventListener('fetch', function(event) {
  // A basic fetch handler to satisfy the PWA installability criteria.
  // This strategy is network-first. For offline capabilities, this would need to be expanded.
  event.respondWith(
    fetch(event.request).catch(function() {
      // This is a very basic offline fallback. 
      // A real app would have a cached offline page.
      return new Response(
        '<h1>You are offline</h1><p>Please check your internet connection.</p>',
        { headers: { 'Content-Type': 'text/html' } }
      );
    })
  );
});

self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push Received.');
  if (!event.data) {
    console.log('[Service Worker] Push event but no data');
    return;
  }
  const data = event.data.json();
  console.log('[Service Worker] Push data: ', data);

  const title = data.title || 'New Message';
  const options = {
    body: data.body || 'You have a new message.',
    icon: data.icon || '/logo.svg',
    badge: data.badge || '/logo.svg',
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification click Received.');

  event.notification.close();

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window'
    }).then(function(clientList) {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
