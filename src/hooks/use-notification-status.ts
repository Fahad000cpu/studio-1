
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
  isLoading: boolean;
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

  useEffect(() => {
    // Check Service Worker status once on the client side.
    async function checkSw() {
      if (!isSupported || typeof navigator === 'undefined' || !navigator.serviceWorker) {
        setSwActive(false);
        return;
      }
      try {
        const swRegistration = await navigator.serviceWorker.ready;
        setSwActive(!!swRegistration?.active);
      } catch (e) {
        console.warn("Could not check service worker status:", e);
        setSwActive(false);
      }
    }
    checkSw();
  }, [isSupported]);


  const isLoading = isAuthLoading || isProfileLoading || swActive === null;
  const permissionGranted = isSupported && notificationPermission === 'granted';
  const tokenInFirestore = !!(userProfile?.fcmTokens?.some(token => token && token.length > 0));

  return {
    isSupported,
    serviceWorkerActive: swActive,
    permissionGranted,
    tokenInFirestore,
    isLoading,
    permission: notificationPermission,
  };
}
