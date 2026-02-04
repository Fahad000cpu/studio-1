
'use client';

import { getMessaging, getToken, isSupported } from 'firebase/messaging';
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
      const currentToken = await getToken(messaging, {
        vapidKey: 'BM_xqZMh6RwDGXDr5L3AwT_A-T6qXRnAKpAy-EZGndn7TgrAIbUiUxUvbCJrnMeCb2FzC9hLic6-SjpsBpFNl3o'
      });
      
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

    