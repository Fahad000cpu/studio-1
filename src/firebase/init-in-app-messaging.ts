
'use client';

import type { FirebaseApp } from 'firebase/app';

// This function is now async as it uses a dynamic import.
export async function initializeInAppMessaging(app: FirebaseApp) {
  try {
    // Dynamically import the In-App Messaging module only on the client-side.
    const { getInAppMessaging, getInstallationId } = await import(
      'firebase/in-app-messaging'
    );

    const inAppMessaging = getInAppMessaging(app);
    console.log('Firebase In-App Messaging initialized.');

    // Get and log the installation ID for testing purposes
    getInstallationId(inAppMessaging)
      .then(installationId => {
        console.log(
          '%c FIREBASE IN-APP MESSAGING INSTALLATION ID: ',
          'color: #FFCA28; background: #333; font-size: 1.2em; font-weight: bold; padding: 4px;',
          installationId
        );
        console.log(
          'Copy this ID and use it to test In-App Messages from the Firebase Console.'
        );
      })
      .catch(err => {
        console.error('Failed to get In-App Messaging Installation ID:', err);
      });
  } catch (err) {
    console.error('Firebase In-App Messaging failed to initialize:', err);
  }
}
