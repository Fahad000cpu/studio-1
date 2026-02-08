
import type { User } from 'firebase/auth';
import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore';

interface UserProfileDetails {
    name: string | null;
    email: string | null;
    phoneNumber?: string | null;
    photoURL?: string | null;
}

/**
 * Checks if a user profile exists in Firestore and creates it if it doesn't.
 * This is a standalone function that does not use React hooks.
 * @param firestore - The Firestore instance.
 * @param user - The Firebase Auth user object.
 * @param details - The user details to save.
 */
export const handleUserProfileUpdate = (
    firestore: Firestore, 
    user: User, 
    details: UserProfileDetails
) => {
    if (!user || !firestore) {
        console.error("handleUserProfileUpdate called with invalid user or firestore instance.");
        return;
    }
    
    const userRef = doc(firestore, 'users', user.uid);

    // Use a fire-and-forget promise chain.
    getDoc(userRef).then(userDoc => {
        if (!userDoc.exists()) {
            const userProfile = {
                id: user.uid,
                name: details.name || 'Anonymous User',
                email: details.email,
                phoneNumber: details.phoneNumber || user.phoneNumber || null,
                profilePictureUrl: details.photoURL || `https://picsum.photos/seed/${user.uid}/200`,
                bio: "",
                coordinates: null,
                fcmTokens: [],
                createdAt: new Date(),
            };
            // Do not await this. Let it run in the background.
            setDoc(userRef, userProfile).catch(e => {
                console.error("Error creating user profile in background:", e);
            });
        }
    }).catch(e => {
        console.error("Error checking user profile in background:", e);
    });
};
