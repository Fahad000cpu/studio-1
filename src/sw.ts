
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
  if (!event.data) {
    console.warn("Push event but no data");
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (e) {
    console.error("Push event data is not valid JSON:", e);
    // Fallback for plain text data if needed
    data = {
      title: "New Notification",
      body: event.data.text(),
    };
  }
  
  const title = data.title || "ConnectSphere";
  const options = {
    body: data.body || "You have a new message.",
    icon: data.icon || "/logo.svg",
    image: data.image,
  };

  const promiseChain = self.registration.showNotification(title, options);
  event.waitUntil(promiseChain);
});


// @serwist/next's default cache handler.
// You can override this logic, or just let it do its thing.
// To learn more, see https://serwist.pages.dev/docs/next/worker-exports
defaultCache();
