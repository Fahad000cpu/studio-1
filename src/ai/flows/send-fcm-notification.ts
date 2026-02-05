
'use server';
/**
 * @fileOverview A Genkit flow for sending FCM notifications.
 *
 * - sendFcmNotification - Sends a push notification to a list of FCM tokens.
 * - SendFcmNotificationInput - Input schema for the flow.
 * - SendFcmNotificationOutput - Output schema for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import * as admin from 'firebase-admin';

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

export const SendFcmNotificationInputSchema = z.object({
  tokens: z.array(z.string()).describe('A list of FCM registration tokens.'),
  title: z.string().describe('The title of the notification.'),
  body: z.string().describe('The body content of the notification.'),
  icon: z.string().optional().describe('URL to an icon for the notification.'),
  image: z.string().optional().describe('URL to an image for the notification.'),
});
export type SendFcmNotificationInput = z.infer<typeof SendFcmNotificationInputSchema>;

export const SendFcmNotificationOutputSchema = z.object({
  successCount: z.number().describe('Number of successfully sent messages.'),
  failureCount: z.number().describe('Number of failed messages.'),
});
export type SendFcmNotificationOutput = z.infer<typeof SendFcmNotificationOutputSchema>;


const sendFcmTool = ai.defineTool(
    {
      name: 'sendFcmTool',
      description: 'Sends a Firebase Cloud Messaging (FCM) notification to a list of device tokens.',
      inputSchema: SendFcmNotificationInputSchema,
      outputSchema: SendFcmNotificationOutputSchema,
    },
    async (input) => {
        if (admin.apps.length === 0) {
            throw new Error('Firebase Admin SDK not initialized.');
        }

        const { tokens, title, body, icon, image } = input;

        if (!tokens || tokens.length === 0) {
            throw new Error('No FCM tokens provided. Cannot send notification.');
        }
        
        const webpushDataPayload = {
            title,
            body,
            ...(icon && { icon }),
            ...(image && { image }),
        };

        const message: admin.messaging.MulticastMessage = {
            tokens,
            // The `data` payload is received by the service worker for custom handling.
            // It MUST be a string.
            webpush: {
                data: JSON.stringify(webpushDataPayload),
            },
            // The `notification` payload is a fallback for mobile devices or when the
            // browser/FCM handles the notification automatically (e.g., app in background).
            notification: {
                title,
                body,
                ...(icon && { icon }),
                ...(image && { image }),
            },
        };

        try {
            const response = await admin.messaging().sendEachForMulticast(message);
            console.log('Successfully sent message:', response);
            return {
                successCount: response.successCount,
                failureCount: response.failureCount,
            };
        } catch (error) {
            console.error('Error sending message:', error);
            // We need to determine how many failed based on the tokens list length.
            return { successCount: 0, failureCount: tokens.length };
        }
    }
);


const sendFcmNotificationFlow = ai.defineFlow(
  {
    name: 'sendFcmNotificationFlow',
    inputSchema: SendFcmNotificationInputSchema,
    outputSchema: SendFcmNotificationOutputSchema,
  },
  async (input) => {
    // This flow directly uses the tool.
    // In a more complex scenario, you could add more logic here,
    // like fetching tokens from a DB before calling the tool.
    return await sendFcmTool(input);
  }
);


export async function sendFcmNotification(
    input: SendFcmNotificationInput
  ): Promise<SendFcmNotificationOutput> {
    return sendFcmNotificationFlow(input);
}
