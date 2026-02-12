'use client';

import { useEffect } from 'react';
import { getApp } from 'firebase/app';

/**
 * An invisible component that safely initializes client-side only Firebase services
 * like In-App Messaging. This prevents Next.js build errors.
 */
export function InAppMessagingInitializer() {
  useEffect(() => {
    // This effect runs only on the client side.
    const initializeInAppMessaging = async () => {
      try {
        // Dynamically import the In-App Messaging module.
        const { getInAppMessaging } = await import('firebase/in-app-messaging');
        const app = getApp();
        // Initialize the SDK. Now it will listen for and display messages.
        getInAppMessaging(app);
      } catch (error) {
        console.error("Firebase In-App Messaging failed to initialize:", error);
      }
    };

    initializeInAppMessaging();
  }, []); // Empty dependency array ensures this runs only once on mount.

  // This component renders nothing to the UI.
  return null;
}
