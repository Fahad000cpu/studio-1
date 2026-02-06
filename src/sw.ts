
import { cleanupOutdatedCaches, precacheAndRoute } from "@serwist/precaching";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
  interface SerwistWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: SerwistWorkerGlobalScope;

try {
    // --- Serwist Setup ---
    // This must be called to make sure the new service worker is used on all pages.
    self.addEventListener("install", () => self.skipWaiting());
    self.addEventListener("activate", () => self.clients.claim());

    // Cleans up old caches.
    cleanupOutdatedCaches();

    // This is the part that enables offline functionality.
    // It uses a manifest injected by Serwist to know what to cache.
    if (self.__SW_MANIFEST) {
        precacheAndRoute(self.__SW_MANIFEST);
    }

} catch (error) {
    console.error("Serwist setup failed in service worker:", error);
}


// --- Custom Push Notification Handler ---
self.addEventListener("push", (event: PushEvent) => {
    const handlePushEvent = async () => {
        let payload: any = {};
        try {
            if (event.data) {
                payload = event.data.json();
            }
        } catch (e) {
            // If JSON parsing fails, try to get it as text.
            try {
                if(event.data) {
                    payload.body = event.data.text();
                }
            } catch(textErr) {
                console.error("Push event data could not be parsed as JSON or text.", textErr);
                // Fallback to a default body if data is unreadable
                payload.body = "You have a new message.";
            }
        }

        const title = payload.title || "ConnectSphere";
        const options: NotificationOptions = {
            body: payload.body || "You have a new notification.",
            icon: payload.icon || "/logo.svg",
            badge: payload.badge || "/logo.svg",
            image: payload.image,
            vibrate: [200, 100, 200],
            // Use the URL from the payload, or fallback to the app's origin
            data: { url: payload.url || self.location.origin },
        };

        try {
             await self.registration.showNotification(title, options);
        } catch(e) {
            console.error("Failed to show notification:", e);
        }
    };

    event.waitUntil(handlePushEvent());
});


// --- Custom Notification Click Handler ---
self.addEventListener("notificationclick", (event: NotificationEvent) => {
    // Close the notification pop-up.
    event.notification.close();

    // This function is executed when a notification is clicked.
    const handleNotificationClick = async () => {
        const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
        const urlToOpen = new URL(event.notification.data?.url || "/", self.location.origin).href;

        // Check if a window with the same URL is already open.
        const matchingClient = allClients.find(client => new URL(client.url).href === urlToOpen);

        if (matchingClient && "focus" in matchingClient) {
            // If found, focus it.
            return matchingClient.focus();
        }
        
        // If no such window is found, open a new one.
        if (self.clients.openWindow) {
            return self.clients.openWindow(urlToOpen);
        }
    };

    // Tell the browser to wait for our async function to finish.
    event.waitUntil(handleNotificationClick());
});
