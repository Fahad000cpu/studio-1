
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
  const promiseChain = (async () => {
    // Default notification options
    let notificationTitle = "ConnectSphere";
    const notificationOptions: NotificationOptions = {
      body: "You have a new message.",
      icon: "/logo.svg",
      badge: "/logo.svg",
      vibrate: [200, 100, 200],
    };

    if (event.data) {
      try {
        const payload = event.data.json();
        notificationTitle = payload.title || notificationTitle;
        notificationOptions.body = payload.body || notificationOptions.body;
        notificationOptions.icon = payload.icon || notificationOptions.icon;
        if (payload.image) {
          notificationOptions.image = payload.image;
        }
      } catch (e) {
        console.error("Push event data parsing error, treating as text.", e);
        notificationOptions.body = event.data.text();
      }
    }
    
    // Show the notification.
    await self.registration.showNotification(notificationTitle, notificationOptions);
  })();
  
  event.waitUntil(promiseChain);
});


// @serwist/next's default cache handler.
// You can override this logic, or just let it do its thing.
// To learn more, see https://serwist.pages.dev/docs/next/worker-exports
defaultCache();
