
import type { UserProfile, ChatGroup } from '@/types';
import type { Timestamp } from 'firebase/firestore';

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
  textColor?: string;
  chatId?: string;
  groupId?: string; // For group chat messages
  deletedFor?: string[];
  memberIds?: string[]; // For group chat messages
};

// Represents the metadata for a single 1-on-1 chat conversation.
// Stored in the user's private subcollection: /users/{userId}/chats/{chatId}
export type ChatMetadata = {
  id: string; // The doc ID, which is the combined chatId (uid1_uid2)
  participants: string[];
  lastMessageText?: string;
  lastMessageTimestamp?: Timestamp;
};

// A union type to represent any item in the chat list (a 1-on-1 chat or a group chat)
export type ChatListItem = {
  id: string;
  type: 'user' | 'group';
  name: string;
  avatarUrl?: string;
  lastMessageText?: string;
  lastMessageTimestamp?: Timestamp;
  // For user chats
  contact?: UserProfile;
  // For group chats
  group?: ChatGroup;
};
