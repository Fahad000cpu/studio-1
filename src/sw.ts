
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
// For example, listen to "push" events, and show a notification.
self.addEventListener("push", (event) => {
  if (event.data) {
    try {
      const data = event.data.json();
      if (data) {
        const { title, body, icon, image } = data;
        const options = {
          body,
          icon,
          image,
        };
        self.registration.showNotification(title, options);
      }
    } catch (e) {
      console.error("Push event for non-JSON payload", e);
    }
  }
});

// @serwist/next's default cache handler.
// You can override this logic, or just let it do its thing.
// To learn more, see https://serwist.pages.dev/docs/next/worker-exports
defaultCache();
