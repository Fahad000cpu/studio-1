'use client';

import { useState, useEffect } from 'react';

export function useNotificationPermission() {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isSupported, setIsSupported] = useState(true);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'Notification' in window && 'permissions' in navigator) {
            const checkPermission = () => {
                setPermission(Notification.permission);
            };
            
            checkPermission(); // Initial check

            // Listen for changes
            const queryPromise = navigator.permissions.query({ name: 'notifications' });
            queryPromise.then((permissionStatus) => {
                permissionStatus.onchange = () => {
                    checkPermission();
                };
            }).catch(() => {
              // This can fail in some private browsing modes.
              // Fallback to checking Notification.permission directly, though it won't be reactive.
              checkPermission();
            });
        } else {
            setIsSupported(false);
        }
    }, []);

    return { permission, isSupported };
}
