
import { cleanupOutdatedCaches, precacheAndRoute } from "@serwist/precaching";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { defaultCache } from "@serwist/next/worker";

declare global {
  interface SerwistWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: SerwistWorkerGlobalScope;

// --- Serwist Setup ---
cleanupOutdatedCaches();
precacheAndRoute(self.__SW_MANIFEST || []);
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", () => self.clients.claim());


// --- Custom Push Notification Handler ---
self.addEventListener("push", (event: PushEvent) => {
  // This function is executed when a push message is received.
  async function handlePushEvent() {
    // Default title and options
    let title = "ConnectSphere";
    let options: NotificationOptions = {
      body: "You have a new message.",
      icon: "/logo.svg",
      badge: "/logo.svg",
      vibrate: [200, 100, 200],
      data: { url: "/" }, // Default URL to open on click
    };

    // Check if there's data and try to parse it
    if (event.data) {
      try {
        const payload = event.data.json();
        title = payload.title || title;
        options = {
          ...options,
          body: payload.body || options.body,
          icon: payload.icon || options.icon,
          image: payload.image,
          data: {
            url: payload.url || options.data.url,
          },
        };
      } catch (e) {
        // If JSON parsing fails, use the data as plain text for the body
        console.warn("Push data was not valid JSON, falling back to text.", e);
        try {
            options.body = event.data.text();
        } catch (textErr) {
            console.error("Could not even parse push data as text.", textErr);
        }
      }
    }

    // Show the notification.
    await self.registration.showNotification(title, options);
  }

  // Tell the browser to wait for our async function to finish.
  event.waitUntil(handlePushEvent());
});

// --- Custom Notification Click Handler ---
self.addEventListener("notificationclick", (event: NotificationEvent) => {
  // Close the notification pop-up.
  event.notification.close();

  // This function is executed when a notification is clicked.
  async function handleNotificationClick() {
    const windowClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const urlToOpen = new URL(event.notification.data?.url || "/", self.location.origin).href;

    // Check if a window with the same URL is already open.
    for (const client of windowClients) {
      if (client.url === urlToOpen && "focus" in client) {
        return client.focus();
      }
    }

    // If no such window is found, open a new one.
    if (self.clients.openWindow) {
      return self.clients.openWindow(urlToOpen);
    }
  }

  // Tell the browser to wait for our async function to finish.
  event.waitUntil(handleNotificationClick());
});


// --- Serwist Default Cache Handler ---
// This handles caching for Next.js routes and assets.
defaultCache();
