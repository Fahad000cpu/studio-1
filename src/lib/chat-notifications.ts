
'use server';
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import type { UserProfile } from '@/types';

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

interface SendChatNotificationParams {
  recipientId: string;
  senderId: string;
  senderName: string;
  messageText: string;
}

/**
 * A server action to send a push notification for a new chat message.
 * @param {SendChatNotificationParams} params - The notification details.
 */
export async function sendChatNotification({ recipientId, senderId, senderName, messageText }: SendChatNotificationParams): Promise<void> {
  const db = getFirestore();
  const recipientDocRef = db.collection('users').doc(recipientId);

  try {
    const recipientDoc = await recipientDocRef.get();
    if (!recipientDoc.exists) {
      console.log(`[FCM] Recipient ${recipientId} not found.`);
      return;
    }

    const recipient = recipientDoc.data() as UserProfile;
    const tokens = recipient.fcmTokens?.filter(Boolean);

    if (!tokens || tokens.length === 0) {
      console.log(`[FCM] Recipient ${recipientId} has no FCM tokens.`);
      return;
    }
    
    // Truncate message if it's too long for a notification body
    const body = messageText.length > 100 ? `${messageText.substring(0, 97)}...` : messageText;

    const messagePayload: admin.messaging.MulticastMessage = {
      tokens,
      notification: {
        title: senderName,
        body: body,
      },
      webpush: {
        notification: {
          icon: '/logo192.png',
          badge: '/logo192.png',
        },
        fcmOptions: {
          // This link is what the browser uses if the app is already open
          link: `/chat?chatWith=${senderId}`,
        },
      },
      // This data payload is what the service worker receives to construct the notification
      // and handle clicks when the app is closed.
      data: {
        url: `/chat?chatWith=${senderId}`,
      }
    };

    const response = await admin.messaging().sendEachForMulticast(messagePayload);
    
    // Cleanup invalid tokens
    const tokensToRemove: string[] = [];
    response.responses.forEach((result, index) => {
      if (!result.success) {
        const error = result.error;
        if (error && (error.code === 'messaging/registration-token-not-registered' || error.code === 'messaging/invalid-registration-token')) {
          tokensToRemove.push(tokens[index]);
        }
      }
    });

    if (tokensToRemove.length > 0) {
      await recipientDocRef.update({
        fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove)
      });
      console.log(`[FCM] Removed ${tokensToRemove.length} invalid tokens for user ${recipientId}.`);
    }

  } catch (error) {
    console.error('Error sending chat notification via Server Action:', error);
  }
}
