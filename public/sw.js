self.addEventListener('push', function(event) {
  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = {
      title: 'New Notification',
      body: event.data.text(),
      icon: '/logo.svg',
      badge: '/logo.svg'
    };
  }

  const payload = data.webpush ? data.webpush : data;
  const title = payload.notification.title || 'ConnectSphere';
  const options = {
    body: payload.notification.body || 'You have a new message.',
    icon: payload.notification.icon || '/logo.svg',
    badge: payload.notification.badge || '/logo.svg',
    data: {
      url: payload.fcmOptions.link || '/'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
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

// A simple caching strategy for offline support
self.addEventListener('install', (event) => {
  // console.log('Service Worker installing.');
});

self.addEventListener('activate', (event) => {
  // console.log('Service Worker activating.');
});
