
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

// The onCall function for sending chat notifications has been temporarily removed.
// Deploying any v2 Cloud Function (like onCall) requires the project to be on the Blaze (pay-as-you-go) plan,
// as it needs to enable certain Google Cloud APIs that are not available on the free Spark plan.
//
// To re-enable chat push notifications:
// 1. Upgrade your Firebase project to the Blaze plan from the Firebase Console.
// 2. Ask the assistant to "re-implement the chat notification Cloud Function".
