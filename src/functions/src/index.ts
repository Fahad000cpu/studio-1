
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
// Notifications are now sent via a client-triggered server action to provide a more direct
// and debuggable notification flow, bypassing potential issues with Firestore triggers
// and environment configurations (like the Blaze plan requirement for external network access).

