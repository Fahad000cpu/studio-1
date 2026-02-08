
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

// Represents the metadata for a chat from the perspective of a single user.
// Stored in /users/{userId}/chats/{otherUserId}
export type ChatMetadata = {
  id: string; // The ID of the other user in the chat.
  lastMessageText?: string;
  lastMessageTimestamp?: Timestamp;
  unreadCount?: number; // Unread count for the owner of this document.
};
