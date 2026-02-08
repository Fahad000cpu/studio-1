
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

// This file is available for Cloud Functions triggers.
// The original onDocumentCreated trigger for chat notifications was removed
// to avoid requiring the Blaze plan for deployment.
// Chat notifications are now sent via a Next.js Server Action 
// defined in src/lib/chat-notifications.ts, which is called
// directly from the chat component.
