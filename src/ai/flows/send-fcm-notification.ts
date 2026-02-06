'use server';
/**
 * @fileOverview A server action for sending FCM notifications.
 */

import * as admin from 'firebase-admin';
import type { SendFcmNotificationInput, SendFcmNotificationOutput } from '@/types/fcm';

// Initialize Firebase Admin SDK if not already initialized
if (admin.apps.length === 0) {
  try {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (e) {
    console.error('Firebase Admin initialization error:', e);
  }
}

export async function sendFcmNotification(
    input: SendFcmNotificationInput
  ): Promise<SendFcmNotificationOutput> {
    if (admin.apps.length === 0) {
        console.error("Firebase Admin SDK not initialized. Cannot send notification.");
        // To prevent client-side crashes, return a valid output shape
        return { successCount: 0, failureCount: input.tokens.length || 0 };
    }

    const { tokens, title, body, icon } = input;

    if (!tokens || tokens.length === 0) {
        console.log("No FCM tokens provided. Skipping notification.");
        return { successCount: 0, failureCount: 0 };
    }
    
    // We send a data-only payload to give our service worker full control
    // over the notification display. This prevents duplicate notifications
    // that can occur when FCM auto-displays a `notification` payload.
    const message: admin.messaging.MulticastMessage = {
        tokens,
        data: {
            title,
            body,
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
        console.log(`FCM send report: ${response.successCount} success, ${response.failureCount} failure.`);
        return {
            successCount: response.successCount,
            failureCount: response.failureCount,
        };
    } catch (error) {
        console.error('Error sending FCM message:', error);
        return { successCount: 0, failureCount: tokens.length };
    }
}
