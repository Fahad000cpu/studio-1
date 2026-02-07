
'use client';

import { useEffect } from 'react';
import { getApp } from 'firebase/app';

export function FiamInitializer() {
    useEffect(() => {
        const initializeFiam = async () => {
            try {
                // Dynamically import here inside the effect to guarantee client-side only execution
                const { getInAppMessaging } = await import('firebase/in-app-messaging');
                const app = getApp();
                getInAppMessaging(app);
                console.log('Firebase In-App Messaging initialized successfully.');
            } catch (error) {
                console.error('Failed to initialize Firebase In-App Messaging:', error);
            }
        };

        initializeFiam();
    }, []);

    return null; // This component renders nothing.
}
