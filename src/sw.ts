
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
  const eventData = event as PushEvent;
  
  let notificationData = {
    title: "New Notification",
    body: "You have a new message.",
    icon: "/logo.svg",
    image: undefined as string | undefined,
  };

  if (eventData.data) {
    try {
      const parsedData = eventData.data.json();
      // Ensure parsedData is an object before spreading
      if (typeof parsedData === 'object' && parsedData !== null) {
        notificationData = { ...notificationData, ...parsedData };
      }
    } catch (e) {
      console.error("Push event data could not be parsed as JSON:", e);
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon,
    image: notificationData.image,
  };

  const promiseChain = self.registration.showNotification(notificationData.title, options);

  event.waitUntil(promiseChain);
});


// @serwist/next's default cache handler.
// You can override this logic, or just let it do its thing.
// To learn more, see https://serwist.pages.dev/docs/next/worker-exports
defaultCache();
