
import type { GeoPoint, Timestamp } from 'firebase/firestore';

export type UserProfile = {
    id: string; 
    name: string;
    email: string;
    phoneNumber?: string;
    bio?: string;
    coordinates?: GeoPoint | null;
    fcmTokens: string[];
    profilePictureUrl?: string;
    createdAt?: Date;
    lastActive?: Timestamp;
};

export type AffiliateProduct = {
    id: string;
    name: string;
    description: string;
    category: string;
    imageUrl: string;
    affiliateLink: string;
    adminId: string;
};

export type ChatGroup = {
    id: string;
    name: string;
    description?: string;
    creatorId: string;
    memberIds: string[];
    groupPhotoUrl?: string;
    lastMessageText?: string;
    lastMessageTimestamp?: Timestamp;
    timestamp?: Timestamp;
};
