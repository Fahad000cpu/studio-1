
'use client';

import type { FirebaseApp } from 'firebase/app';

// This function initializes the In-App Messaging service.
// It needs to be called once when the app loads for an authenticated user.
export async function initializeInAppMessaging(app: FirebaseApp) {
  try {
    // Dynamically import the In-App Messaging module only on the client side.
    const { getInAppMessaging } = await import('firebase/in-app-messaging');

    // Initialize the service. This starts the SDK, which will then listen for
    // campaigns from the Firebase backend.
    getInAppMessaging(app);

    console.log('Firebase In-App Messaging SDK initialized successfully.');
  } catch (err) {
    console.error('Firebase In-App Messaging failed to initialize:', err);
  }
}
