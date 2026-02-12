
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
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    if (instances || initError) {
        return;
    }

    if (!firebaseConfig.apiKey) {
      const errorMessage = "Firebase API Key is missing. Please get your key from the Firebase console (Project settings > General) and add it to the .env file as NEXT_PUBLIC_FIREBASE_API_KEY.";
      console.error(errorMessage);
      setInitError(errorMessage);
      return;
    }

    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const firestore = getFirestore(app);
    const functions = getFunctions(app);

    // This block contains all client-specific initializations to prevent server-side errors.
    if (typeof window !== 'undefined') {
        // Dynamically import and initialize services that are client-only.
        
        // Installations - needed for In-App Messaging
        import('firebase/installations')
          .then(({ getInstallations }) => {
            try {
              getInstallations(app); // Needed to get the unique installation ID (FID).
            } catch(err) {
              console.error("Firebase Installations SDK failed to initialize:", err);
            }
          })
          .catch((err) => {
            console.error("Failed to dynamically import Firebase Installations module:", err);
          });
    }

    isSupported().then(supported => {
        const analytics = supported ? getAnalytics(app) : null;
        const newInstances: FirebaseInstances = { app, auth, firestore, functions, analytics };
        setInstances(newInstances);
    });

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => console.log('Service Worker registered with scope:', registration.scope))
          .catch((error) => console.error('Service Worker registration failed:', error));
    }
  // We want this to run only once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instances, initError]);
  
  if (initError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background p-4">
        <div className="max-w-lg text-center bg-card p-8 rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-destructive mb-4">Firebase Configuration Error</h1>
          <p className="text-card-foreground">{initError}</p>
        </div>
      </div>
    );
  }


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
