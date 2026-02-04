
'use client';

import { getMessaging, getToken, isSupported, onTokenRefresh } from 'firebase/messaging';
import { getApp } from 'firebase/app';
import { Firestore, doc, arrayUnion } from 'firebase/firestore';
import { updateDocumentNonBlocking } from './non-blocking-updates';
import { toast } from '@/hooks/use-toast';

export const requestPermission = async (firestore: Firestore, userId: string): Promise<string | null> => {
  const messagingSupported = await isSupported();
  if (!messagingSupported) {
    toast({
      variant: "destructive",
      title: "Not Supported",
      description: "Push notifications are not supported in this browser.",
    });
    return null;
  }
  
  try {
    const app = getApp();
    const messaging = getMessaging(app);
    
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

      const currentToken = await getToken(messaging, { vapidKey });
      
      if (currentToken) {
        const userDocRef = doc(firestore, 'users', userId);
        updateDocumentNonBlocking(userDocRef, {
            fcmTokens: arrayUnion(currentToken)
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
export const onTokenRefreshListener = (firestore: Firestore, userId: string) => {
  const app = getApp();
  const messaging = getMessaging(app);
  
  const unsubscribe = onTokenRefresh(messaging, (newToken) => {
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

  return unsubscribe;
};
