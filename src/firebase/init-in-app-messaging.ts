
'use client';

import type { FirebaseApp } from 'firebase/app';

// This function is now async as it uses a dynamic import.
export async function initializeInAppMessaging(app: FirebaseApp) {
  try {
    // This is a trick to prevent Next.js's server-side bundler from statically analyzing
    // the import path, which would cause a "Module not found" error since 'firebase/in-app-messaging'
    // is a client-only module.
    const path = ['firebase', 'in-app-messaging'].join('/');
    const { getInAppMessaging, getInstallationId } = await import(path);

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
        // Store the ID in sessionStorage so it can be accessed by the UI
        if (typeof window !== 'undefined') {
            sessionStorage.setItem('firebaseInstallationId', installationId);
        }
      })
      .catch(err => {
        console.error('Failed to get In-App Messaging Installation ID:', err);
      });
  } catch (err) {
    console.error('Firebase In-App Messaging failed to initialize:', err);
  }
}
