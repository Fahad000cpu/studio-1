'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

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

  // Initialize App Check only on the client side
  if (typeof window !== 'undefined') {
    try {
      if (!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY === 'YOUR_RECAPTCHA_V3_SITE_KEY') {
        console.warn("reCAPTCHA Site Key is not set for App Check. Phone auth and other services may fail. Please add it to your .env file.");
      } else {
        // App Check can only be initialized once
        // We'll add a flag to window to prevent re-initialization just in case.
        if (!(window as any).appCheckInitialized) {
            initializeAppCheck(app, {
                provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
                isTokenAutoRefreshEnabled: true
            });
            (window as any).appCheckInitialized = true;
        }
      }
    } catch (error) {
      console.error("Error initializing Firebase App Check:", error);
    }
  }

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
