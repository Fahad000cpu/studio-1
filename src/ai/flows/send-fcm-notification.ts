
'use server';

import * as admin from 'firebase-admin';
import type { SendFcmNotificationInput, SendFcmNotificationOutput } from '@/types/fcm';

// --- Simplified, top-level initialization ---
if (admin.apps.length === 0) {
  try {
    // This will use the default credentials (GOOGLE_APPLICATION_CREDENTIALS)
    admin.initializeApp();
    console.log("Firebase Admin SDK initialized successfully.");
  } catch (error: any) {
    console.error("CRITICAL: Failed to initialize Firebase Admin SDK.", error.message);
  }
}

export async function sendFcmNotification(
    input: SendFcmNotificationInput
  ): Promise<SendFcmNotificationOutput> {
    
    if (admin.apps.length === 0) {
        const errorMessage = "Firebase Admin SDK is not initialized. Cannot send notification.";
        console.error(errorMessage);
        throw new Error(errorMessage);
    }
    
    const { tokens, title, body, icon, url, image } = input;
    const validTokens = Array.isArray(tokens) ? tokens.filter(t => typeof t === 'string' && t.length > 0) : [];

    if (validTokens.length === 0) {
        console.log("No valid FCM tokens provided. Skipping notification.");
        return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }
    
    // The service worker will receive this payload.
    // It expects a specific structure to show the notification correctly.
    const message: admin.messaging.MulticastMessage = {
        tokens: validTokens,
        data: {
            title: title,
            body: body,
            icon: icon || '/logo192.png',
            badge: '/logo192.png',
            image: image || '',
            url: url || '/discover', // The URL to open on click
        },
        // Webpush config for advanced options if needed in the future
        webpush: {
            headers: {
              Urgency: 'high',
            },
        },
        android: {
            priority: 'high',
        },
        apns: {
            payload: {
                aps: {
                    'content-available': 1,
                },
            },
            headers: {
                'apns-priority': '10',
            },
        },
    };

    console.log(`[FCM Action] Sending data-only push notification to ${validTokens.length} token(s).`);

    try {
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`[FCM Action] FCM response: Successes: ${response.successCount}, Failures: ${response.failureCount}`);
        
        const invalidTokens: string[] = [];
        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const error = resp.error;
                    const failedToken = validTokens[idx];
                    console.error(`[FCM Action] Token failed: ${failedToken}, Error: ${error?.code} - ${error?.message}`);
                    // Common codes for tokens that should be removed from the database
                    if (
                        error?.code === 'messaging/registration-token-not-registered' ||
                        error?.code === 'messaging/invalid-registration-token'
                    ) {
                        invalidTokens.push(failedToken);
                    }
                }
            });
        }

        return {
            successCount: response.successCount,
            failureCount: response.failureCount,
            invalidTokens: invalidTokens,
        };
    } catch (error: any) {
        console.error('CRITICAL: Error calling admin.messaging().sendEachForMulticast():', error.message);
        throw new Error(`Failed to send notification via FCM: ${error.message}`);
    }
}
