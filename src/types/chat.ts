
import type { UserProfile } from '@/types';
import type { Timestamp } from 'firebase/firestore';

export type ChatContact = UserProfile & {
  lastMessage?: string;
  lastMessageTime?: string;
  unread?: number;
};

export type Message = {
  id: string;
  senderId: string;
  recipientId?: string;
  text: string;
  timestamp?: Timestamp | Date;
  own: boolean;
  status?: 'sending' | 'sent' | 'failed';
  messageType: 'text' | 'image' | 'video' | 'file' | 'audio' | 'link';
  mediaUrl?: string | null;
  chatId?: string;
  deletedFor?: string[];
};

// Represents the metadata for a single chat conversation.
// Stored in the top-level /chat_metadata collection.
export type ChatMetadata = {
  id: string; // The doc ID, which is the combined chatId (uid1_uid2)
  participants: string[];
  lastMessageText?: string;
  lastMessageTimestamp?: Timestamp;
};
