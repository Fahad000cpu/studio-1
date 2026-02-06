'use server';
/**
 * @fileOverview A server action for sending FCM notifications.
 */

import * as admin from 'firebase-admin';
import type { SendFcmNotificationInput, SendFcmNotificationOutput } from '@/types/fcm';

// Helper function to initialize Firebase Admin SDK idempotently
function initializeFirebaseAdmin() {
  // Check if the app is already initialized
  if (admin.apps.length === 0) {
    try {
      console.log("Initializing Firebase Admin SDK...");
      admin.initializeApp({
        // Using applicationDefault() is the standard for Google Cloud environments
        // like Cloud Functions and App Hosting.
        credential: admin.credential.applicationDefault(),
      });
      console.log("Firebase Admin SDK initialized successfully.");
    } catch (e) {
      console.error('Firebase Admin initialization error:', e);
    }
  }
}

export async function sendFcmNotification(
    input: SendFcmNotificationInput
  ): Promise<SendFcmNotificationOutput> {
    console.log("sendFcmNotification server action called with input:", input);

    // Run the initialization check on every call
    initializeFirebaseAdmin();
    
    // After initialization, check again if it's ready. If not, exit.
    if (admin.apps.length === 0) {
        console.error("Firebase Admin SDK is not available. Cannot send notification.");
        return { successCount: 0, failureCount: input.tokens?.length || 0 };
    }

    const { tokens, title, body, icon } = input;

    // Validate tokens: ensure it's an array of non-empty strings
    const validTokens = Array.isArray(tokens) ? tokens.filter(t => typeof t === 'string' && t.length > 0) : [];

    if (validTokens.length === 0) {
        console.log("No valid FCM tokens provided. Skipping notification.");
        return { successCount: 0, failureCount: 0 };
    }
    
    // We send a data-only payload to give our service worker full control
    // over the notification display.
    const message: admin.messaging.MulticastMessage = {
        tokens: validTokens,
        data: {
            title: title || "New Message",
            body: body || "You have a new message",
            icon: icon || '/logo.svg',
            url: '/chat',
        },
        webpush: {
            headers: {
                // Setting Urgency to 'high' can help with timely delivery
                Urgency: 'high',
            },
        },
    };

    console.log("Attempting to send FCM message:", JSON.stringify(message, null, 2));

    try {
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`FCM send report: ${response.successCount} success, ${response.failureCount} failure.`);
        if (response.failureCount > 0) {
            response.responses.forEach(resp => {
                if (!resp.success) {
                    console.error('FCM send failure:', resp.error);
                }
            });
        }
        return {
            successCount: response.successCount,
            failureCount: response.failureCount,
        };
    } catch (error) {
        console.error('Critical error sending FCM message:', error);
        // The error might be a generic one if it's an auth/permission issue
        // on the Admin SDK side itself.
        return { successCount: 0, failureCount: validTokens.length };
    }
}
