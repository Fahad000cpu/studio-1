
'use client';

import { getApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import { doc, arrayUnion } from 'firebase/firestore';
import { updateDocumentNonBlocking } from './non-blocking-updates';
import { toast } from '@/hooks/use-toast';

// Helper function to dynamically import and get messaging functions
const getMessagingFns = async () => {
  // These checks ensure this code only runs in a browser environment
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return null;
  }
  try {
    // Dynamically import the module
    const { getMessaging, getToken, onTokenRefresh, isSupported } = await import('firebase/messaging');
    const supported = await isSupported();
    if (!supported) {
        console.log("Firebase Messaging is not supported in this browser.");
        return null;
    }
    // Return the functions if supported
    return { getMessaging, getToken, onTokenRefresh };
  } catch (error) {
    console.error("Failed to import or initialize firebase/messaging:", error);
    return null;
  }
};


export const requestPermission = async (firestore: Firestore, userId: string): Promise<string | null> => {
  const messagingFns = await getMessagingFns();

  if (!messagingFns) {
    toast({
      variant: "destructive",
      title: "Notifications Not Available",
      description: "Push notifications are not supported or could not be initialized in this browser.",
    });
    return null;
  }
  
  const { getMessaging, getToken } = messagingFns;

  try {
    const app = getApp();
    const messagingInstance = getMessaging(app);
    
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_KEY;
      if (!vapidKey) {
        console.error("VAPID key is not set in environment variables.");
        toast({
            variant: "destructive",
            title: "Configuration Error",
            description: "Cannot enable notifications due to a missing configuration key.",
        });
        return null;
      }

      const currentToken = await getToken(messagingInstance, { vapidKey });
      
      if (currentToken) {
        const userDocRef = doc(firestore, 'users', userId);
        updateDocumentNonBlocking(userDocRef, {
            fcmTokens: arrayUnion(currentToken)
        });
        toast({
          title: "Notifications Enabled!",
          description: "You're all set to receive push notifications."
        });
        return currentToken;
      } else {
         toast({
            variant: "destructive",
            title: "Token Error",
            description: "Could not get a notification token. Please try again.",
          });
        return null;
      }
    } else {
       toast({
          variant: "destructive",
          title: "Permission Denied",
          description: "You need to grant permission in your browser settings to enable notifications.",
        });
      return null;
    }
  } catch (error) {
    console.error('An error occurred while getting the token:', error);
     toast({
        variant: "destructive",
        title: "An Error Occurred",
        description: "Could not enable notifications. Please check the console for details.",
      });
    return null;
  }
};

/**
 * Sets up a listener for FCM token refreshes.
 * When a new token is generated, it's added to the user's profile in Firestore.
 * @param firestore - The Firestore instance.
 * @param userId - The ID of the current user.
 * @returns An unsubscribe function to clean up the listener.
 */
export const onTokenRefreshListener = async (firestore: Firestore, userId: string): Promise<() => void> => {
    const messagingFns = await getMessagingFns();

    if (!messagingFns) {
      return () => {}; // Return a no-op function if not supported
    }

    const { getMessaging, onTokenRefresh } = messagingFns;
    
    try {
        const app = getApp();
        const messagingInstance = getMessaging(app);
        
        return onTokenRefresh(messagingInstance, (newToken) => {
            console.log('FCM token refreshed:', newToken);
            toast({
            title: 'Notifications Updated',
            description: 'Your device token has been refreshed.',
            });
            const userDocRef = doc(firestore, 'users', userId);
            updateDocumentNonBlocking(userDocRef, {
            fcmTokens: arrayUnion(newToken),
            });
        });
    } catch (error) {
        console.error("Failed to setup FCM token refresh listener:", error);
    }

    return () => {}; // return a no-op unsubscribe function
};
