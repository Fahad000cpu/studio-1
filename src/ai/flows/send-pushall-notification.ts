
'use server';
/**
 * @fileOverview A Genkit flow for sending PushAll notifications.
 *
 * - sendPushAllNotification - Sends a broadcast notification via PushAll.
 * - SendPushAllNotificationInput - Input schema for the flow.
 * - SendPushAllNotificationOutput - Output schema for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const PUSHALL_API_URL = "https://pushall.ru/api.php";

export const SendPushAllNotificationInputSchema = z.object({
  title: z.string().describe('The title of the notification.'),
  body: z.string().describe('The body content of the notification.'),
});
export type SendPushAllNotificationInput = z.infer<typeof SendPushAllNotificationInputSchema>;

export const SendPushAllNotificationOutputSchema = z.object({
  success: z.boolean().describe('Whether the broadcast was sent successfully.'),
  message: z.string().optional().describe('Response message from PushAll API.'),
});
export type SendPushAllNotificationOutput = z.infer<typeof SendPushAllNotificationOutputSchema>;

const sendPushAllNotificationFlow = ai.defineFlow(
  {
    name: 'sendPushAllNotificationFlow',
    inputSchema: SendPushAllNotificationInputSchema,
    outputSchema: SendPushAllNotificationOutputSchema,
  },
  async (input) => {
    const channelId = process.env.NEXT_PUBLIC_PUSHALL_CHANNEL_ID;
    const apiKey = process.env.NEXT_PUBLIC_PUSHALL_API_KEY;

    if (!channelId || !apiKey) {
      throw new Error('PushAll environment variables (NEXT_PUBLIC_PUSHALL_CHANNEL_ID, NEXT_PUBLIC_PUSHALL_API_KEY) are not set.');
    }

    const { title, body } = input;

    const formData = new URLSearchParams();
    formData.append('type', 'broadcast');
    formData.append('id', channelId);
    formData.append('key', apiKey);
    formData.append('title', title);
    formData.append('text', body);

    try {
      const response = await fetch(PUSHALL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      const responseData = await response.json();

      if (responseData.error) {
        console.error('PushAll API Error:', responseData.error);
        return { success: false, message: `PushAll API Error: ${responseData.error}` };
      }
      
      console.log('PushAll broadcast sent:', responseData);
      return { success: true, message: 'Broadcast sent successfully.' };

    } catch (error) {
      console.error('Failed to send PushAll notification', error);
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      return { success: false, message: errorMessage };
    }
  }
);


export async function sendPushAllNotification(
  input: SendPushAllNotificationInput
): Promise<SendPushAllNotificationOutput> {
  return sendPushAllNotificationFlow(input);
}
