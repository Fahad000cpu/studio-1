'use client';

import type { FirebaseApp } from 'firebase/app';
// This import will now only be processed in a client context because of the 'use client' directive.
import { getInAppMessaging } from 'firebase/in-app-messaging';

export function initializeInAppMessaging(app: FirebaseApp) {
  try {
    // This function will only be called on the client.
    getInAppMessaging(app);
    console.log("Firebase In-App Messaging initialized.");
  } catch (err) {
    console.error("Firebase In-App Messaging failed to initialize:", err);
  }
}
