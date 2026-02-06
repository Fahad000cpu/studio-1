
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
  const eventData = event.data;

  // Default title and options
  let title = "ConnectSphere";
  let options: NotificationOptions = {
    body: "You have a new message.",
    icon: "/logo.svg",
    badge: "/logo.svg",
    vibrate: [200, 100, 200],
  };

  if (eventData) {
    try {
      // Prefer parsing as JSON
      const payload = eventData.json();
      title = payload.title || title;
      options = {
        ...options,
        body: payload.body || options.body,
        icon: payload.icon || options.icon,
        image: payload.image,
      };
    } catch (e) {
      // If JSON parsing fails, fall back to plain text
      console.warn("Push data was not JSON, falling back to text.");
      options.body = eventData.text();
    }
  }

  // Create the notification promise
  const notificationPromise = self.registration.showNotification(title, options);

  // Ensure the browser waits for the notification to be shown.
  event.waitUntil(notificationPromise);
});


// --- Serwist Default Cache Handler ---
// This handles caching for Next.js routes and assets.
defaultCache();
