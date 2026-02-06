
/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import * as logger from "firebase-functions/logger";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });


// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = admin.firestore();
const messaging = admin.messaging();

export const sendChatNotificationOnNewMessage = onDocumentCreated(
    "chats/{chatId}/messages/{messageId}",
    async (event) => {
      const { chatId, messageId } = event.params;
      logger.log(`[START] Function triggered for new message. ChatID: ${chatId}, MessageID: ${messageId}`);
      
      const snapshot = event.data;
      if (!snapshot) {
        logger.warn("[EXIT] No data associated with the event. Exiting function.");
        return;
      }
  
      const message = snapshot.data();
      const senderId = message.senderId;
      const recipientId = message.recipientId;
  
      if (!senderId || !recipientId) {
          logger.warn(`[EXIT] Message is missing senderId or recipientId.`, { senderId, recipientId });
          return;
      }

      // For testing, we allow self-chats. In production, you might uncomment this.
      // if (senderId === recipientId) {
      //   logger.info("[EXIT] Sender and recipient are the same. No notification will be sent.");
      //   return;
      // }
  
      // 1. Get recipient's tokens
      let tokens: string[] = [];
      let recipientDocRef;
      try {
        logger.info(`Step 1: Fetching recipient user document for ID: ${recipientId}`);
        recipientDocRef = db.collection("users").doc(recipientId);
        const recipientDoc = await recipientDocRef.get();
        
        if (!recipientDoc.exists) {
            logger.warn(`[EXIT] Recipient user document not found for ID: ${recipientId}.`);
            return;
        }
        
        const recipientData = recipientDoc.data();
        if (recipientData && Array.isArray(recipientData.fcmTokens)) {
            tokens = recipientData.fcmTokens.filter(Boolean); // Filter out any null/empty/false values
        }
  
        if (tokens.length === 0) {
            logger.warn(`[EXIT] Recipient ${recipientId} has no valid FCM tokens.`);
            return;
        }
        logger.info(`Step 1 SUCCESS: Found ${tokens.length} token(s) for recipient ${recipientId}.`);

      } catch(e: any) {
        logger.error("Step 1 FAILED: Error fetching recipient's tokens.", e);
        return;
      }
      
      // 2. Get sender's details
      let senderName = "Someone";
      let senderPhoto = "/logo.svg";
      try {
        logger.info(`Step 2: Fetching sender's details for ID: ${senderId}`);
        const senderDoc = await db.collection("users").doc(senderId).get();
        if (senderDoc.exists) {
            senderName = senderDoc.data()?.name || "Someone";
            senderPhoto = senderDoc.data()?.profilePictureUrl || '/logo.svg';
        }
        logger.info(`Step 2 SUCCESS: Sender identified as '${senderName}'.`);
      } catch(e: any) {
        logger.warn("Step 2 WARNING: Could not fetch sender's details, using defaults.", e);
      }
      
      // 3. Determine message body
      logger.info("Step 3: Determining notification body from message type.");
      let notificationBody = 'Sent you a file';
      if (message.messageType === 'text' && message.text) {
          notificationBody = message.text;
      } else if (message.messageType === 'image') {
          notificationBody = 'Sent you a photo 📷';
      } else if (message.messageType === 'video') {
          notificationBody = 'Sent you a video 🎥';
      } else if (message.messageType === 'audio') {
          notificationBody = 'Sent you a voice message 🎤';
      } else if (message.messageType === 'link' && message.text) {
          notificationBody = message.text; 
      }
      logger.info(`Step 3 SUCCESS: Notification body is: "${notificationBody.substring(0, 50)}..."`);
      
      // 4. Construct and send the notification payload
      const payload: admin.messaging.MulticastMessage = {
          tokens,
          notification: {
              title: `${senderName} sent a message`,
              body: notificationBody,
              icon: senderPhoto, // Standard icon for mobile
          },
          webpush: {
              notification: {
                  title: `${senderName} sent a message`,
                  body: notificationBody.length > 100 ? notificationBody.substring(0, 97) + '...' : notificationBody,
                  icon: senderPhoto,
                  badge: '/logo.svg',
                  tag: `chat_${chatId}`,
                  renotify: true,
              },
              fcmOptions: {
                  link: `/chat?chatWith=${senderId}`,
              },
          },
          data: {
              url: `/chat?chatWith=${senderId}`,
              senderId: senderId,
          }
      };
      
      logger.info("Step 4: Payload constructed. Attempting to send notification to tokens:", tokens);
      
      try {
          const response = await messaging.sendEachForMulticast(payload);
          logger.info("[SUCCESS] FCM response received:", {
            successCount: response.successCount,
            failureCount: response.failureCount,
          });
  
          if (response.failureCount > 0) {
            const invalidTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const error = resp.error;
                    logger.warn(`Failed to send to token: ${tokens[idx]}`, error);
                    // Check for specific error codes that indicate an invalid or unregistered token
                    if (error && (error.code === 'messaging/registration-token-not-registered' || error.code === 'messaging/invalid-registration-token')) {
                        invalidTokens.push(tokens[idx]);
                    }
                }
            });
    
            if (invalidTokens.length > 0 && recipientDocRef) {
                logger.info("Found invalid tokens to remove from Firestore:", invalidTokens);
                try {
                    await recipientDocRef.update({
                        fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens)
                    });
                    logger.info("Successfully removed invalid tokens from user's profile.");
                } catch (updateError) {
                    logger.error("Failed to remove invalid tokens from Firestore.", updateError);
                }
            }
          }
  
      } catch (error) {
          logger.error("[CRITICAL] Step 4 FAILED: Critical error sending notification via FCM:", error);
      }

      logger.log(`[END] Function execution finished for MessageID: ${messageId}`);
    }
);
