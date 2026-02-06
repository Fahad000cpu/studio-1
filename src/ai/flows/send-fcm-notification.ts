
'use server';

import * as admin from 'firebase-admin';
import type { SendFcmNotificationInput, SendFcmNotificationOutput } from '@/types/fcm';

// --- Simplified, top-level initialization ---
// This code runs once when the module is loaded on the server.
if (admin.apps.length === 0) {
  try {
    admin.initializeApp();
    console.log("Firebase Admin SDK initialized for the first time.");
  } catch (error: any) {
    console.error("CRITICAL: Failed to initialize Firebase Admin SDK on load.", error.message);
  }
}

export async function sendFcmNotification(
    input: SendFcmNotificationInput
  ): Promise<SendFcmNotificationOutput> {
    
    // --- Guard clause: Check if SDK is properly initialized ---
    if (admin.apps.length === 0) {
        const errorMessage = "Firebase Admin SDK is not initialized. Cannot send notification.";
        console.error(errorMessage);
        // Throw an error that the client-side catch block will handle.
        throw new Error(errorMessage);
    }
    
    const { tokens, title, body, icon, url } = input;
    const validTokens = Array.isArray(tokens) ? tokens.filter(t => typeof t === 'string' && t.length > 0) : [];

    if (validTokens.length === 0) {
        console.log("No valid FCM tokens provided. Skipping notification.");
        return { successCount: 0, failureCount: 0, invalidTokens: [] };
    }
    
    const message: admin.messaging.MulticastMessage = {
        tokens: validTokens,
        notification: {
            title: title || "New Message",
            body: body || "You have a new message",
            imageUrl: icon,
        },
        data: {
          url: url || '/',
        },
        webpush: {
            fcmOptions: {
                link: url || '/',
            },
            headers: {
                Urgency: 'high',
            },
        },
    };

    console.log(`Sending FCM message to ${validTokens.length} token(s).`);

    try {
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`FCM sendEachForMulticast response: Successes: ${response.successCount}, Failures: ${response.failureCount}`);
        
        const invalidTokens: string[] = [];
        if (response.failureCount > 0) {
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const error = resp.error;
                    const failedToken = validTokens[idx];
                    console.error(`Token failed: ${failedToken}, Error: ${error?.code} - ${error?.message}`);
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
        // Re-throw the error so the client-side `catch` block can display a toast.
        throw new Error(`Failed to send notification via FCM: ${error.message}`);
    }
}
