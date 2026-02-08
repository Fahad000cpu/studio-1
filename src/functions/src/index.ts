
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import * as admin from "firebase-admin";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

setGlobalOptions({ maxInstances: 10 });


// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
    admin.initializeApp();
}

// The onDocumentCreated Cloud Function for sending chat notifications has been removed.
// Notifications are now handled client-side in `src/app/(main)/chat/page.tsx`
// to avoid the Blaze plan requirement for server-side push notifications.
// This new approach shows a local browser notification when a new message is received
// while the user is on a different browser tab.
