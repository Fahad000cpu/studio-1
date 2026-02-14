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
// NOTE: InAppMessagingInitializer was removed to prevent a build crash.
// import { InAppMessagingInitializer } from '@/components/in-app-messaging-initializer';

interface FirebaseInstances {
  app: FirebaseApp;
  auth: Auth;
  firestore: Firestore;
  functions: Functions;
  analytics: Analytics | null;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const [instances, setInstances] = useState<FirebaseInstances | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    // Initialize core services immediately
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

    // Set core instances immediately, with analytics as null initially.
    // This allows the app to render without waiting for the analytics check.
    setInstances({ app, auth, firestore, functions, analytics: null });

    // Then, check for and initialize analytics in the background.
    isSupported().then(supported => {
      if (supported) {
        const analytics = getAnalytics(app);
        // Update the state with the analytics instance once it's ready.
        // This will cause a re-render, but the app is already interactive.
        setInstances(prev => prev ? { ...prev, analytics } : { app, auth, firestore, functions, analytics });
      }
    });

    // Register service worker in the background.
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker
          .register('/sw.js')
          .then((registration) => console.log('Service Worker registered with scope:', registration.scope))
          .catch((error) => console.error('Service Worker registration failed:', error));
    }
  // We want this to run only once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      {/* InAppMessagingInitializer was removed to prevent the app from crashing. */}
      {children}
    </FirebaseProvider>
  );
}
