
'use client';

import { getApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import { doc, arrayUnion } from 'firebase/firestore';
import { updateDocumentNonBlocking } from './non-blocking-updates';
import { toast } from '@/hooks/use-toast';

/**
 * Requests permission for push notifications and saves the token if granted.
 * Dynamically imports 'firebase/messaging' to ensure it only runs on the client.
 */
export const requestPermission = async (firestore: Firestore, userId: string): Promise<string | null> => {
  try {
    const { getMessaging, getToken, isSupported } = await import('firebase/messaging');
    
    const supported = await isSupported();
    if (!supported) {
      toast({
        variant: "destructive",
        title: "Notifications Not Supported",
        description: "Push notifications are not available in this browser.",
      });
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: "You need to grant permission in your browser settings to enable notifications.",
      });
      return null;
    }

    const app = getApp();
    const messagingInstance = getMessaging(app);
    
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
  } catch (error) {
    console.error('An error occurred while requesting notification permission:', error);
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
 * Dynamically imports 'firebase/messaging' to ensure it only runs on the client.
 * @returns An unsubscribe function to clean up the listener.
 */
export const onTokenRefreshListener = async (firestore: Firestore, userId: string): Promise<() => void> => {
  try {
    const { getMessaging, onTokenRefresh, isSupported } = await import('firebase/messaging');
    
    const supported = await isSupported();
    if (!supported) {
      // Return a no-op function if not supported
      return () => {};
    }

    const app = getApp();
    const messagingInstance = getMessaging(app);
    
    const unsubscribe = onTokenRefresh(messagingInstance, (newToken) => {
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

  } catch (error) {
    console.error("Failed to setup FCM token refresh listener:", error);
    // Return a no-op function on error
    return () => {};
  }
};
    