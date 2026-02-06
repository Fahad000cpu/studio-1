
// public/sw.js

// This listener is for data-only push messages. It MUST be able to
// construct and show a notification. It works whether the app tab is open, 
// in the background, or closed.
self.addEventListener('push', (event) => {
    console.log('[sw.js] Push Received.');

    if (!event.data) {
        console.log('[sw.js] Push event but no data');
        return;
    }

    console.log(`[sw.js] Raw push data: "${event.data.text()}"`);

    let notificationData;
    try {
        // The data sent from the Admin SDK is nested under a `data` property
        const fcmPayload = event.data.json();
        notificationData = fcmPayload.data;
    } catch (e) {
        console.error('[sw.js] Failed to parse JSON, treating as text.', e);
        notificationData = {
            title: 'New Message',
            body: event.data.text(),
            icon: '/logo.svg',
            url: '/'
        };
    }

    const title = notificationData.title || 'New Notification';
    const options = {
        body: notificationData.body,
        icon: notificationData.icon,
        image: notificationData.image, // `image` is a standard Notification API option
        data: {
            url: notificationData.url, // Pass custom data to the click handler
        },
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

// This listener handles what happens when a user clicks the notification.
self.addEventListener('notificationclick', (event) => {
    console.log('[sw.js] Notification click received.');

    event.notification.close();

    const urlToOpen = event.notification.data.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Check if a window/tab of our app is already open.
            for (const client of clientList) {
                if (new URL(client.url).origin === self.location.origin) {
                    // If so, focus it and navigate to the correct URL.
                    if (client.navigate) {
                        client.navigate(urlToOpen);
                    }
                    if (client.focus) {
                        return client.focus();
                    }
                }
            }
            // If no window is open, open a new one.
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});
