
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
      const snapshot = event.data;
      if (!snapshot) {
        logger.log("No data associated with the event. Exiting function.");
        return;
      }
  
      const message = snapshot.data();
      const senderId = message.senderId;
      const recipientId = message.recipientId;
  
      if (!senderId || !recipientId) {
          logger.log("Message is missing sender or recipient ID. Exiting function.", { senderId, recipientId });
          return;
      }
  
      // 1. Get recipient's tokens
      const recipientDoc = await db.collection("users").doc(recipientId).get();
      if (!recipientDoc.exists) {
          logger.log(`Recipient user document not found for ID: ${recipientId}. Exiting function.`);
          return;
      }
      const recipientData = recipientDoc.data();
      // Ensure fcmTokens is an array before filtering.
      const tokens = (Array.isArray(recipientData?.fcmTokens) ? recipientData.fcmTokens : []).filter(Boolean);
  
      if (tokens.length === 0) {
          logger.log(`Recipient ${recipientId} has no valid FCM tokens. Exiting function.`);
          return;
      }
  
      // 2. Get sender's name and photo
      const senderDoc = await db.collection("users").doc(senderId).get();
      const senderName = senderDoc.data()?.name || "Someone";
      const senderPhoto = senderDoc.data()?.profilePictureUrl || '/logo.svg';
  
      // 3. Determine message body
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
      
      // 4. Construct the notification payload
      const payload: admin.messaging.MulticastMessage = {
          tokens,
          notification: {
              title: `${senderName} sent a message`,
              body: notificationBody,
          },
          webpush: {
              notification: {
                  icon: senderPhoto,
                  body: notificationBody.length > 100 ? notificationBody.substring(0, 97) + '...' : notificationBody,
                  badge: '/logo.svg',
                  tag: `chat_${event.params.chatId}`,
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
      
      logger.log("Constructed payload, attempting to send notification to tokens:", tokens);
      
      try {
          const response = await messaging.sendEachForMulticast(payload);
          logger.log("FCM response received:", {
            successCount: response.successCount,
            failureCount: response.failureCount,
          });
  
          // Clean up invalid tokens
          if (response.failureCount > 0) {
            const invalidTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    const error = resp.error;
                    if (error && (error.code === 'messaging/registration-token-not-registered' || error.code === 'messaging/invalid-registration-token')) {
                        invalidTokens.push(tokens[idx]);
                    }
                }
            });
    
            if (invalidTokens.length > 0) {
                logger.log("Found invalid tokens to remove:", invalidTokens);
                await recipientDoc.ref.update({
                    fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens)
                });
            }
          }
  
      } catch (error) {
          logger.error("Critical error sending notification via FCM:", error);
      }
    }
);


// export const helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
