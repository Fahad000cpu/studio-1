'use server';

import * as admin from 'firebase-admin';
import type { SendFcmNotificationInput, SendFcmNotificationOutput } from '@/types/fcm';

// Initialize Firebase Admin SDK if not already initialized.
// This check is important to prevent re-initialization in Next.js hot-reloading environments.
if (admin.apps.length === 0) {
  try {
    admin.initializeApp();
  } catch (error: any) {
    // In a serverless environment, sometimes the check is not enough, and initialization can still race.
    // We can safely ignore the "already exists" error.
    if (!/already exists/u.test(error.message)) {
      console.error('Firebase admin initialization error:', error.stack);
    }
  }
}

/**
 * A server action to send broadcast push notifications to a list of FCM tokens.
 * This is designed to be called from the admin panel.
 * @param {SendFcmNotificationInput} input - The notification details.
 * @returns {Promise<SendFcmNotificationOutput>} - The result of the send operation.
 */
export async function sendFcmNotification(input: SendFcmNotificationInput): Promise<SendFcmNotificationOutput> {
  const { tokens, title, body, icon, url, image } = input;

  if (!tokens || tokens.length === 0) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  const uniqueTokens = [...new Set(tokens)];

  const message: admin.messaging.MulticastMessage = {
    tokens: uniqueTokens,
    data: {
      title,
      body,
      icon: icon || '/logo192.png',
      image: image || '',
      url: url || '/',
    },
    webpush: {
      headers: {
        Urgency: 'high',
      },
    },
    apns: {
      payload: {
        aps: {
          'content-available': 1,
        },
      },
    },
    android: {
      priority: 'high',
    },
  };

  try {
    const multicastResponse = await admin.messaging().sendEachForMulticast(message);

    const invalidTokens: string[] = [];
    if (multicastResponse.failureCount > 0) {
      multicastResponse.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === 'messaging/registration-token-not-registered' ||
            errorCode === 'messaging/invalid-registration-token'
          ) {
            invalidTokens.push(uniqueTokens[idx]);
          }
        }
      });
    }
    
    console.log(`[FCM Broadcast] Sent notifications. Success: ${multicastResponse.successCount}, Failure: ${multicastResponse.failureCount}.`);

    return {
      successCount: multicastResponse.successCount,
      failureCount: multicastResponse.failureCount,
      invalidTokens,
    };
  } catch (error) {
    console.error('Error sending FCM broadcast:', error);
    throw new Error('An internal error occurred while sending notifications.');
  }
}
