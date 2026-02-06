'use client';

import { getApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import { doc, arrayUnion, updateDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { getMessaging, getToken, isSupported } from 'firebase/messaging';

/**
 * Requests permission for push notifications and saves the token if granted.
 * This function should only be called from a client component on user interaction.
 */
export const requestPermission = async (firestore: Firestore, userId: string): Promise<string | null> => {
  try {
    const supported = await isSupported();
    if (!supported || !navigator.serviceWorker) {
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
    
    // Get the service worker registration. Use .ready to ensure it's active.
    const swRegistration = await navigator.serviceWorker.ready;
    if (!swRegistration) {
        toast({
            variant: "destructive",
            title: "Service Worker Error",
            description: "The notification service worker is not active. Please refresh the page and try again.",
        });
        return null;
    }

    const app = getApp();
    const messagingInstance = getMessaging(app);
    
    // The VAPID key is managed by the firebase-compat library in sw.js via the config.
    // We pass the service worker registration to ensure getToken uses it.
    const currentToken = await getToken(messagingInstance, { serviceWorkerRegistration: swRegistration });

    if (currentToken) {
      const userDocRef = doc(firestore, 'users', userId);
      // Use await and try/catch for robust error handling
      try {
        await updateDoc(userDocRef, {
          fcmTokens: arrayUnion(currentToken)
        });
        toast({
          title: "Notifications Enabled!",
          description: "You're all set to receive push notifications."
        });
        return currentToken;
      } catch (updateError) {
        console.error('Failed to save FCM token to Firestore:', updateError);
        toast({
          variant: "destructive",
          title: "Save Token Failed",
          description: "Could not save your notification token to your profile. Please check Firestore security rules.",
        });
        return null; // Return null on failure
      }
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
    const firebaseError = error as { code?: string; message?: string };
    if (firebaseError.code === 'messaging/failed-service-worker-registration') {
        toast({
            variant: "destructive",
            title: "Notification Setup Failed",
            description: "Could not set up notifications. Please ensure you are on a secure (HTTPS) connection and try refreshing.",
            duration: 10000,
        });
    } else {
        toast({
          variant: "destructive",
          title: "An Error Occurred",
          description: firebaseError.message || "Could not enable notifications. Please check the console for details.",
        });
    }
    return null;
  }
};
