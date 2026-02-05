
'use client';

import { getApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import { doc, arrayUnion } from 'firebase/firestore';
import { updateDocumentNonBlocking } from './non-blocking-updates';
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
    
    // Get the service worker registration.
    // The service worker is registered by Serwist at the root scope.
    const swRegistration = await navigator.serviceWorker.getRegistration();
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

    // Pass the registration to getToken to use the custom service worker.
    const currentToken = await getToken(messagingInstance, { vapidKey, serviceWorkerRegistration: swRegistration });
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
    // Check if error is a FirebaseError and has a specific code
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
