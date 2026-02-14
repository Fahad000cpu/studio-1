'use server';
import * as admin from 'firebase-admin';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
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
  recipientId?: string; // For 1-on-1 chats
  groupId?: string; // For group chats
  senderId: string;
  senderName: string;
  messageText: string;
}

/**
 * A server action to send a push notification for a new chat message
 * AND update chat metadata in the user's private subcollection or the `groups` collection.
 * @param {SendChatNotificationParams} params - The notification details.
 */
export async function sendChatNotification({ recipientId, groupId, senderId, senderName, messageText }: SendChatNotificationParams): Promise<void> {
  const db = getFirestore();
  const metadataTimestamp = Timestamp.now();
  const metadataText = messageText.length > 30 ? `${messageText.substring(0, 27)}...` : messageText;

  // --- Update Chat Metadata ---
  if (groupId) {
    // --- Group Chat Metadata Update ---
    const groupRef = db.collection('groups').doc(groupId);
    try {
      await groupRef.update({
        lastMessageText: metadataText,
        lastMessageTimestamp: metadataTimestamp,
      });
      // Group notifications are not yet implemented in this action to keep it simple.
      // This could be a future enhancement.
    } catch (metadataError) {
      console.error('[Chat Action] Failed to update group chat metadata:', metadataError);
    }
    return; // Exit after updating group metadata
  } 
  
  if (recipientId) {
    // --- One-on-One Chat Metadata & Notification ---
    const chatId = [senderId, recipientId].sort().join('_');
    const senderChatRef = db.collection('users').doc(senderId).collection('chats').doc(chatId);
    const recipientChatRef = db.collection('users').doc(recipientId).collection('chats').doc(chatId);

    const metadataPayload = {
      id: chatId,
      participants: [senderId, recipientId],
      lastMessageText: metadataText,
      lastMessageTimestamp: metadataTimestamp,
    };

    try {
      // Use a batch write to update metadata for both users atomically.
      const batch = db.batch();
      batch.set(senderChatRef, metadataPayload, { merge: true });
      batch.set(recipientChatRef, metadataPayload, { merge: true });
      await batch.commit();

    } catch (metadataError) {
      console.error('[Chat Action] Failed to update chat metadata:', metadataError);
      return;
    }
    
    // --- Send Push Notification ---
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
      
      const body = messageText.length > 100 ? `${messageText.substring(0, 97)}...` : messageText;

      // ** CHANGE: Use a data-only payload to ensure the service worker always handles the message. **
      const messagePayload: admin.messaging.MulticastMessage = {
        tokens,
        data: {
            title: senderName,
            body: body,
            url: `/chat?chatWith=${senderId}`,
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

      const response = await admin.messaging().sendEachForMulticast(messagePayload);
      
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
          fcmTokens: FieldValue.arrayRemove(...tokensToRemove)
        });
        console.log(`[FCM] Removed ${tokensToRemove.length} invalid tokens for user ${recipientId}.`);
      }

    } catch (error) {
      console.error('Error sending chat notification via Server Action:', error);
    }
  }
}
