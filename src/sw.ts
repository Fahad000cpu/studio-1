
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
self.addEventListener("push", (event) => {
  // Define the async function that will handle the push event logic.
  const handlePush = async () => {
    // Set default title and options for the notification.
    let title = "ConnectSphere";
    let options: NotificationOptions = {
      body: "You have a new message.",
      icon: "/logo.svg",
      badge: "/logo.svg",
      vibrate: [200, 100, 200],
    };

    // Check if the push event has any data.
    if (event.data) {
      try {
        // Try to parse the data as JSON.
        const payload = event.data.json();
        // Overwrite the defaults with data from the payload.
        title = payload.title || title;
        options = {
          ...options,
          body: payload.body || options.body,
          icon: payload.icon || options.icon,
          image: payload.image, // This can be undefined, which is fine.
        };
      } catch (e) {
        // If parsing as JSON fails, assume the data is plain text.
        console.error("Push event data was not valid JSON. Falling back to text.", e);
        options.body = event.data.text();
      }
    }

    // Display the notification to the user.
    await self.registration.showNotification(title, options);
  };

  // Tell the browser to wait until our async function has finished executing.
  event.waitUntil(handlePush());
});

// --- Serwist Default Cache Handler ---
// This handles caching for Next.js routes and assets.
defaultCache();
