
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
 * This is an async function that should be awaited to handle errors properly.
 * @param firestore - The Firestore instance.
 * @param user - The Firebase Auth user object.
 * @param details - The user details to save.
 */
export const handleUserProfileUpdate = async (
    firestore: Firestore, 
    user: User, 
    details: UserProfileDetails
): Promise<void> => {
    if (!user || !firestore) {
        console.error("handleUserProfileUpdate called with invalid user or firestore instance.");
        throw new Error("Invalid arguments for user profile update.");
    }
    
    const userRef = doc(firestore, 'users', user.uid);

    try {
        const userDoc = await getDoc(userRef);
        
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
                lastActive: new Date(),
            };
            // Await the creation to ensure it completes.
            await setDoc(userRef, userProfile);
        }
        // If the doc exists, we don't need to do anything for this specific workflow.
        // A more complex app might merge/update data here.
    } catch (error) {
        console.error("Error during handleUserProfileUpdate:", error);
        // Re-throw the error so the calling function can handle it (e.g., show a toast).
        throw new Error("Failed to create or check user profile.");
    }
};
