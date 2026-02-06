'use server';
/**
 * @fileOverview A server action for sending FCM notifications.
 */

import * as admin from 'firebase-admin';
import type { SendFcmNotificationInput, SendFcmNotificationOutput } from '@/types/fcm';

// Helper function to initialize Firebase Admin SDK idempotently
function initializeFirebaseAdmin() {
  if (admin.apps.length === 0) {
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
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
    
    // After initialization, check again if it's ready. If not, exit.
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
        data: {
            title: title || "New Message",
            body: body || "You have a new message",
            icon: icon || '/logo.svg',
            url: '/chat',
        },
        webpush: {
            headers: {
                Urgency: 'high',
            },
        },
    };

    try {
        const response = await admin.messaging().sendEachForMulticast(message);
        if (response.failureCount > 0) {
            const failedTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(validTokens[idx]);
                    console.error(`Token failed: ${validTokens[idx]}, Error: ${JSON.stringify(resp.error)}`);
                }
            });
            console.error('List of failed tokens:', failedTokens);
        }
        return {
            successCount: response.successCount,
            failureCount: response.failureCount,
        };
    } catch (error) {
        console.error('Critical error calling admin.messaging().sendEachForMulticast():', error);
        // This catch block handles errors during the API call itself (e.g., network issues, auth problems with the SDK)
        return { successCount: 0, failureCount: validTokens.length };
    }
}
