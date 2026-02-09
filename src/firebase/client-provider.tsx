'use client';

import React, { type ReactNode, useEffect, useState } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported, type Analytics } from 'firebase/analytics';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getFunctions, type Functions } from 'firebase/functions';
import { FullScreenLoader } from '@/components/full-screen-loader';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

interface FirebaseInstances {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  functions: Functions;
  analytics: Analytics | null; // Can be null
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [instances, setInstances] = useState<FirebaseInstances | null>(null);

  useEffect(() => {
    const F_INSTANCES_KEY = Symbol.for("firebase_instances_for_studio_app");
    if (typeof window !== 'undefined' && (window as any)[F_INSTANCES_KEY]) {
        setInstances((window as any)[F_INSTANCES_KEY]);
        return;
    }

    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    const functions = getFunctions(app);

    isSupported().then(supported => {
        const analytics = supported ? getAnalytics(app) : null;
        const newInstances: FirebaseInstances = { app, auth, firestore, functions, analytics };
        
        if (typeof window !== 'undefined') {
            (window as any)[F_INSTANCES_KEY] = newInstances;
        }
        setInstances(newInstances);
    });

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => console.log('Service Worker registered with scope:', registration.scope))
          .catch((error) => console.error('Service Worker registration failed:', error));
    }
  }, []);

  if (!instances) {
    return <FullScreenLoader message="Initializing Connection..." />;
  }

  return (
    <FirebaseProvider
      firebaseApp={instances.app}
      auth={instances.auth}
      firestore={instances.firestore}
      functions={instances.functions}
      analytics={instances.analytics}
    >
      {children}
    </FirebaseProvider>
  );
}
