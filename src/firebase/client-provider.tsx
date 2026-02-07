
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

const initializeFirebaseClient = (): FirebaseInstances => {
  const F_INSTANCES_KEY = Symbol.for("firebase_instances_for_studio_app");

  if (typeof window !== 'undefined' && (window as any)[F_INSTANCES_KEY]) {
    return (window as any)[F_INSTANCES_KEY];
  }

  const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const firestore = getFirestore(app);

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
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => console.log('Service Worker registered with scope:', registration.scope))
        .catch((error) => console.error('Service Worker registration failed:', error));
    }
  }, []);

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
