'use server';
/**
 * @fileOverview A server action for sending FCM notifications. This has been made more robust
 * to handle initialization errors and to identify invalid tokens for self-healing.
 */

import * as admin from 'firebase-admin';
import type { SendFcmNotificationInput, SendFcmNotificationOutput } from '@/types/fcm';

// Helper function to initialize Firebase Admin SDK idempotently
function initializeFirebaseAdmin() {
  if (admin.apps.length === 0) {
    try {
      // Check if the required environment variable is set.
      if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !admin.apps.length) {
         console.warn(
          'Firebase Admin SDK initialization skipped: GOOGLE_APPLICATION_CREDENTIALS not set and no app is initialized. ' +
          'This is normal in a local dev environment without service account keys, but will fail in production.'
        );
        // In a real production environment, you might want to throw an error here.
        // For this context, we allow it to proceed, and the `send` will fail gracefully.
        return;
      }
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      console.log("Firebase Admin SDK initialized successfully.");
    } catch (e) {
      console.error('Firebase Admin initialization error:', e);
      // Re-throw as a critical failure if initialization is essential for every call
      throw new Error("Could not initialize Firebase Admin SDK. Notifications will not be sent.");
    }
  }
}

export async function sendFcmNotification(
    input: SendFcmNotificationInput
  ): Promise<SendFcmNotificationOutput> {
    
    try {
      initializeFirebaseAdmin();
    } catch(e) {
      console.error(e);
      return { successCount: 0, failureCount: input.tokens?.length || 0 };
    }
    
    // After attempting initialization, check again if it's ready. If not, exit.
    if (admin.apps.length === 0) {
        console.error("Firebase Admin SDK is not available. Cannot send notification.");
        return { successCount: 0, failureCount: input.tokens?.length || 0 };
    }

    const { tokens, title, body, icon } = input;

    const validTokens = Array.isArray(tokens) ? tokens.filter(t => typeof t === 'string' && t.length > 0) : [];

    if (validTokens.length === 0) {
        return { successCount: 0, failureCount: 0 };
    }
    
    const message: admin.messaging.MulticastMessage = {
        tokens: validTokens,
        // Using `data` payload lets our service worker handle the notification display,
        // which is more reliable and flexible than using the `notification` payload.
        data: {
            title: title || "New Message",
            body: body || "You have a new message",
            icon: icon || '/logo.svg',
            url: '/chat', // URL to open on notification click
        },
        webpush: {
            headers: {
                Urgency: 'high',
            },
        },
    };

    try {
        const response = await admin.messaging().sendEachForMulticast(message);
        const invalidTokens: string[] = [];

        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const error = resp.error;
                    console.error(`Token failed: ${validTokens[idx]}, Error: ${error?.code} - ${error?.message}`);
                    
                    // Identify tokens that are no longer registered.
                    if (
                        error?.code === 'messaging/registration-token-not-registered' ||
                        error?.code === 'messaging/invalid-registration-token'
                    ) {
                        invalidTokens.push(validTokens[idx]);
                    }
                }
            });
            console.error('List of failed tokens:', invalidTokens);
        }

        return {
            successCount: response.successCount,
            failureCount: response.failureCount,
            invalidTokens: invalidTokens, // Return invalid tokens for self-healing
        };
    } catch (error) {
        console.error('Critical error calling admin.messaging().sendEachForMulticast():', error);
        // This catch block handles errors during the API call itself (e.g., network issues)
        return { successCount: 0, failureCount: validTokens.length };
    }
}
