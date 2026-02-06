
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
    if (!event.data) {
      console.warn("Push event but no data");
      return;
    }
    
    let data;
    try {
      // The most reliable way to get data is to read it as text and then parse it as JSON.
      const dataText = event.data.text();
      data = JSON.parse(dataText);
    } catch (e) {
      console.error("Push event data is not valid JSON:", e);
      // If parsing fails, we can use the raw text as the body.
      data = { body: event.data.text() };
    }
    
    const title = data.title || "ConnectSphere";
    const options = {
      body: data.body || "You have a new message.",
      icon: data.icon || "/logo.svg",
      image: data.image,
      // Adding a badge and a vibration pattern for better user experience
      badge: "/logo.svg",
      vibrate: [200, 100, 200],
    };
    
    // Show the notification.
    await self.registration.showNotification(title, options);
  })();
  
  event.waitUntil(promiseChain);
});


// @serwist/next's default cache handler.
// You can override this logic, or just let it do its thing.
// To learn more, see https://serwist.pages.dev/docs/next/worker-exports
defaultCache();
