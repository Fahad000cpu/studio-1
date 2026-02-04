
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

export function useNotificationStatus() {
  const { user: authUser, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const { permission: notificationPermission, isSupported } = useNotificationPermission();

  const userDocRef = useMemoFirebase(
    () => (authUser ? doc(firestore, 'users', authUser.uid) : null),
    [authUser, firestore]
  );
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);
  
  const [status, setStatus] = useState<NotificationStatus>({
    isSupported: true,
    serviceWorkerActive: null,
    permissionGranted: null,
    tokenInFirestore: null,
    isLoading: true,
    permission: 'default',
  });

  useEffect(() => {
    const checkStatus = async () => {
        const isLoading = isAuthLoading || (!!authUser && isProfileLoading);
        setStatus(prev => ({...prev, isLoading }));

        if (isLoading) {
            return;
        }
        
        if (!isSupported) {
            setStatus({
                isSupported: false,
                serviceWorkerActive: false,
                permissionGranted: false,
                tokenInFirestore: false,
                isLoading: false,
                permission: 'default',
            });
            return;
        }

        let swActive = false;
        try {
            const swRegistration = await navigator.serviceWorker.ready;
            swActive = !!swRegistration?.active;
        } catch (e) {
            console.warn("Could not check service worker status:", e);
        }
        
        const permGranted = notificationPermission === 'granted';
        
        const tokenPresent = !!(userProfile?.fcmTokens?.some(token => token && token.length > 0));

        setStatus({
            isSupported: true,
            serviceWorkerActive: swActive,
            permissionGranted: permGranted,
            tokenInFirestore: tokenPresent,
            isLoading: false,
            permission: notificationPermission,
        });
    };

    checkStatus();
    
  }, [isSupported, notificationPermission, authUser, isAuthLoading, userProfile, isProfileLoading]);

  return status;
}
