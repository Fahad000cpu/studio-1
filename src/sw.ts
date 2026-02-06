
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
  // IMPORTANT: The push event logic MUST be wrapped in event.waitUntil
  const promiseChain = (async () => {
    // Default notification options
    const notificationOptions: any = {
      body: "You have a new message.",
      icon: "/logo.svg",
      badge: "/logo.svg",
      vibrate: [200, 100, 200],
    };
    let notificationTitle = "ConnectSphere";

    if (event.data) {
      try {
        const dataText = event.data.text();
        const payload = JSON.parse(dataText);

        notificationTitle = payload.title || notificationTitle;
        notificationOptions.body = payload.body || notificationOptions.body;
        notificationOptions.icon = payload.icon || notificationOptions.icon;
        
        if (payload.image) {
          notificationOptions.image = payload.image;
        }

      } catch (e) {
        console.error("Push event data parsing error:", e);
        // If parsing fails, use the raw text as the body
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
