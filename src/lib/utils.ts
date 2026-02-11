import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getApp } from 'firebase/app';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { v4 as uuidv4 } from 'uuid';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getInitials = (name?: string | null) => {
  if (!name) return "?";
  const names = name.trim().split(" ").filter(Boolean);
  if (names.length === 0) return "?";

  if (names.length === 1) {
    return names[0].substring(0, 2).toUpperCase();
  }

  return (names[0][0] + names[names.length - 1][0]).toUpperCase();
};

/**
 * Uploads a file to Firebase Storage and returns the download URL.
 * @param file The file (Blob) to upload.
 * @param path The path in storage to upload to (e.g., 'avatars', 'status-updates').
 * @returns The public download URL of the uploaded file.
 */
export const uploadToFirebaseStorage = async (file: Blob, path: string): Promise<string> => {
    try {
        const app = getApp();
        const storage = getStorage(app);
        
        // Create a unique filename
        const fileExtension = file.type.split('/')[1] || 'bin';
        const fileName = `${uuidv4()}.${fileExtension}`;
        const storageRef = ref(storage, `${path}/${fileName}`);
        
        // Upload the file
        const snapshot = await uploadBytes(storageRef, file);
        
        // Get the download URL
        const downloadURL = await getDownloadURL(snapshot.ref);
        
        return downloadURL;
    } catch (error) {
        console.error("Firebase Storage upload failed:", error);
        // Let's provide a more specific error message
        const firebaseError = error as { code?: string, message?: string };
        const errorMessage = firebaseError.message?.includes('storage/unauthorized')
            ? 'Permission denied. Please check your Firebase Storage security rules.'
            : 'Could not upload your file. Please try again.';
        throw new Error(errorMessage);
    }
};
