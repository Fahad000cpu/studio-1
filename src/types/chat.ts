
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
};

export type ChatMetadata = {
  participants: string[];
  lastMessageText?: string;
  lastMessageTimestamp?: Timestamp;
  unreadCount?: { [key: string]: number };
};
