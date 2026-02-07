
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";

// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

// Set global options for all functions
functions.setGlobalOptions({ maxInstances: 10 });

/**
 * A callable function to send a push notification for a new chat message.
 * This is the secure, server-side way to handle notifications.
 */
export const sendChatMessageNotification = onCall(async (request) => {
  // Check authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { recipientId, senderName, messageText } = request.data;

  if (!recipientId || !senderName || !messageText) {
    throw new HttpsError('invalid-argument', 'The function must be called with recipientId, senderName, and messageText.');
  }

  try {
    // Get the recipient's user document
    const userDoc = await db.collection('users').doc(recipientId).get();
    if (!userDoc.exists) {
      console.log(`User document for recipient ${recipientId} not found.`);
      return { success: false, reason: 'Recipient not found' };
    }

    const userData = userDoc.data();
    const tokens = userData?.fcmTokens;

    // Check if the user has any valid FCM tokens
    const validTokens = Array.isArray(tokens) ? tokens.filter(t => typeof t === 'string' && t.length > 0) : [];

    if (validTokens.length === 0) {
      console.log(`No valid FCM tokens for recipient ${recipientId}.`);
      return { success: true, reason: 'No tokens to send to' };
    }

    // Construct the notification payload
    const message: admin.messaging.MulticastMessage = {
      tokens: validTokens,
      data: {
        title: senderName,
        body: messageText,
        icon: '/logo192.png',
        badge: '/logo192.png',
        url: `/chat?chatWith=${request.auth.uid}`, // URL to open on click
      },
      webpush: {
        headers: { Urgency: 'high' },
      },
      android: {
        priority: 'high',
      },
      apns: {
        payload: { aps: { 'content-available': 1 } },
        headers: { 'apns-priority': '10' },
      },
    };

    // Send the notification
    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`[FCM Function] Sent notification to ${recipientId}. Success: ${response.successCount}, Failure: ${response.failureCount}`);

    // Optional: Clean up invalid tokens if any failures occurred
    if (response.failureCount > 0) {
        const tokensToRemove: string[] = [];
        response.responses.forEach((resp, idx) => {
            if (!resp.success) {
                const errorCode = resp.error?.code;
                if (errorCode === 'messaging/registration-token-not-registered' || errorCode === 'messaging/invalid-registration-token') {
                    tokensToRemove.push(validTokens[idx]);
                }
            }
        });

        if (tokensToRemove.length > 0) {
            await userDoc.ref.update({
                fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokensToRemove)
            });
            console.log(`Cleaned up ${tokensToRemove.length} invalid tokens for user ${recipientId}.`);
        }
    }


    return { success: true, messageCount: response.successCount };

  } catch (error) {
    console.error('Error sending chat notification:', error);
    throw new HttpsError('internal', 'An error occurred while sending the notification.');
  }
});
