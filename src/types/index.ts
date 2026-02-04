
import type { GeoPoint } from 'firebase/firestore';

export type UserProfile = {
    id: string; 
    userId?: string;
    name: string;
    email: string;
    phoneNumber?: string;
    bio?: string;
    coordinates?: GeoPoint | null;
    fcmTokens: string[];
    profilePictureUrl?: string;
    createdAt?: Date;
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
