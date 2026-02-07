import type { Timestamp } from 'firebase/firestore';

export type StatusStory = {
  id: string;
  userId: string;
  mediaUrl: string;
  text?: string;
  timestamp: Timestamp;
  duration: number;
  views: string[];
  likes: string[];
};

export type StatusUser = {
  id: string;
  name: string;
  avatarUrl: string;
  stories: StatusStory[];
};
