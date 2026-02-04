
'use client';

import { useState, useEffect } from 'react';
import { useUser } from '@/firebase';
import { useNotificationPermission } from './use-notification-permission';

export interface NotificationStatus {
  isSupported: boolean;
  serviceWorkerActive: boolean | null;
  permissionGranted: boolean | null;
  tokenInFirestore: boolean | null;
  isLoading: boolean;
  permission: NotificationPermission;
}

export function useNotificationStatus() {
  const { user, isUserLoading } = useUser();
  const { permission: notificationPermission, isSupported } = useNotificationPermission();
  
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
        // Set loading state true at the beginning of the check
        setStatus(prev => ({...prev, isLoading: true}));

        if (isUserLoading) {
            return; // Wait until user data is loaded, isLoading is already true
        }
        
        // 1. Check for browser support
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

        // 2. Check Service Worker status
        let swActive = false;
        try {
            const swRegistration = await navigator.serviceWorker.ready;
            swActive = !!swRegistration?.active;
        } catch (e) {
            console.warn("Could not check service worker status:", e);
        }
        

        // 3. Check Notification Permission
        const permGranted = notificationPermission === 'granted';

        // 4. Check for FCM token in user's Firestore document
        // This check is simple: does the user object we have contain a non-empty fcmTokens array?
        const tokenPresent = !!(user?.fcmTokens && user.fcmTokens.length > 0);

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
    
    // Rerun when user object changes (e.g., after token is added) or permission changes
  }, [isSupported, notificationPermission, user, isUserLoading]);

  return status;
}
