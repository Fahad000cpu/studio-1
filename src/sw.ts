
import { cleanupOutdatedCaches, precacheAndRoute } from "@serwist/precaching";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { defaultCache } from "@serwist/next/worker";

declare global {
  interface SerwistWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: SerwistWorkerGlobalScope;

cleanupOutdatedCaches();

precacheAndRoute(self.__SW_MANIFEST || []);

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", () => {
  self.clients.claim();
});

// Your custom service worker logic goes here.
self.addEventListener("push", (event) => {
  // Default notification options
  let notification = {
    title: "New Notification",
    body: "You have a new message.",
    icon: "/logo.svg",
    image: undefined,
  };

  // Try to parse the data from the push event
  if (event.data) {
    try {
      const pushData = event.data.json();
      // Overwrite defaults with any data from the push
      notification = { ...notification, ...pushData };
    } catch (e) {
      console.error("Push event for non-JSON payload or parsing failed:", e);
    }
  }

  const title = notification.title;
  const options = {
    body: notification.body,
    icon: notification.icon,
    image: notification.image,
  };

  // Use waitUntil to ensure the service worker doesn't terminate
  // before the notification is displayed.
  event.waitUntil(self.registration.showNotification(title, options));
});


// @serwist/next's default cache handler.
// You can override this logic, or just let it do its thing.
// To learn more, see https://serwist.pages.dev/docs/next/worker-exports
defaultCache();
