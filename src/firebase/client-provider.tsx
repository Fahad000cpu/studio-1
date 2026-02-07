
'use client';

import React, { useMemo, type ReactNode, useEffect } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

interface FirebaseInstances {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
}

// Function to initialize and/or retrieve Firebase instances
const initializeFirebaseClient = (): FirebaseInstances => {
  // Use a symbol on the window object to store instances, ensuring it's unique
  const F_INSTANCES_KEY = Symbol.for("firebase_instances_for_studio_app");

  // If instances are already on the window object, return them
  if (typeof window !== 'undefined' && (window as any)[F_INSTANCES_KEY]) {
    return (window as any)[F_INSTANCES_KEY];
  }

  // Otherwise, initialize for the first time
  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const firestore = getFirestore(app);

  // Store instances on the window object
  const instances: FirebaseInstances = { app, auth, firestore };
  if (typeof window !== 'undefined') {
      (window as any)[F_INSTANCES_KEY] = instances;
  }
  
  return instances;
};


export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const instances = useMemo(() => {
    return initializeFirebaseClient();
  }, []);

  useEffect(() => {
    // This effect registers the vanilla JavaScript service worker.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => console.log('Service Worker registered with scope:', registration.scope))
        .catch((error) => console.error('Service Worker registration failed:', error));
    }
    
    // Initialize In-App Messaging as soon as the provider mounts on the client.
    // This ensures the SDK is active and can communicate with the Firebase backend.
    if (instances.app) {
      import('@/firebase/init-in-app-messaging').then(({ initializeInAppMessaging }) => {
        initializeInAppMessaging(instances.app);
      });
    }

  }, [instances.app]);

  return (
    <FirebaseProvider
      firebaseApp={instances.app}
      auth={instances.auth}
      firestore={instances.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
