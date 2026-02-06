
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
      // In a managed environment like App Hosting or Cloud Functions,
      // initializeApp() with no arguments automatically uses Application Default Credentials.
      admin.initializeApp();
      console.log("Firebase Admin SDK initialized successfully.");
    } catch (e) {
      console.error('Firebase Admin SDK initialization error:', e);
      // This is a critical failure, so we throw to stop execution.
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
      return { successCount: 0, failureCount: input.tokens?.length || 0, invalidTokens: [] };
    }
    
    // After attempting initialization, check again if it's ready. If not, exit.
    if (admin.apps.length === 0) {
        console.error("Firebase Admin SDK is not available. Cannot send notification.");
        return { successCount: 0, failureCount: input.tokens?.length || 0, invalidTokens: [] };
    }

    const { tokens, title, body, icon, url } = input;

    const validTokens = Array.isArray(tokens) ? tokens.filter(t => typeof t === 'string' && t.length > 0) : [];

    if (validTokens.length === 0) {
        return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }
    
    const message: admin.messaging.MulticastMessage = {
        tokens: validTokens,
        // The `notification` payload is displayed automatically by the browser/OS
        // when the app is in the background.
        notification: {
            title: title || "New Message",
            body: body || "You have a new message",
            imageUrl: icon, // Use 'imageUrl' for the icon in the notification payload
        },
        // The `data` payload is sent to the service worker so it knows
        // which URL to open when the notification is clicked.
        data: {
          url: url || '/',
        },
        // Webpush-specific config for further customization.
        webpush: {
            fcmOptions: {
                // This link is a fallback for browsers that support it directly.
                link: url || '/',
            },
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
        return { successCount: 0, failureCount: validTokens.length, invalidTokens: [] };
    }
}
