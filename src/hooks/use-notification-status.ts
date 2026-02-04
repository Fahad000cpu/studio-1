'use client';

import { useState, useEffect } from 'react';
import { doc } from 'firebase/firestore';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { useNotificationPermission } from './use-notification-permission';
import type { UserProfile } from '@/types';


export interface NotificationStatus {
  isSupported: boolean;
  serviceWorkerActive: boolean | null;
  permissionGranted: boolean | null;
  tokenInFirestore: boolean | null;
  isLoading: {
    auth: boolean;
    profile: boolean;
    serviceWorker: boolean;
  };
  permission: NotificationPermission;
}

export function useNotificationStatus(): NotificationStatus {
  const { user: authUser, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const { permission: notificationPermission, isSupported } = useNotificationPermission();

  const userDocRef = useMemoFirebase(
    () => (authUser ? doc(firestore, 'users', authUser.uid) : null),
    [authUser, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);
  
  const [swActive, setSwActive] = useState<boolean|null>(null);
  const [isSwLoading, setIsSwLoading] = useState(true);

  useEffect(() => {
    async function checkSw() {
      setIsSwLoading(true);
      if (!isSupported || typeof navigator === 'undefined' || !navigator.serviceWorker) {
        setSwActive(false);
        setIsSwLoading(false);
        return;
      }
      try {
        // Use getRegistration() for a potentially faster initial check
        const swRegistration = await navigator.serviceWorker.getRegistration();
        setSwActive(!!swRegistration?.active);
      } catch (e) {
        console.warn("Could not check service worker status:", e);
        setSwActive(false);
      } finally {
        setIsSwLoading(false);
      }
    }
    checkSw();
  }, [isSupported]);


  const permissionGranted = isSupported && notificationPermission === 'granted';
  
  // A token is considered in Firestore if the fcmTokens array exists and contains at least one non-empty string.
  const tokenInFirestore = !!(userProfile?.fcmTokens && userProfile.fcmTokens.some(token => typeof token === 'string' && token.length > 0));

  return {
    isSupported,
    serviceWorkerActive: swActive,
    permissionGranted,
    tokenInFirestore,
    isLoading: {
        auth: isAuthLoading,
        profile: isProfileLoading,
        serviceWorker: isSwLoading,
    },
    permission: notificationPermission,
  };
}

    