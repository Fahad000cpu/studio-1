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
      // Prevent re-initialization
      if (!(window as any).appCheckInitialized) {
        const reCaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

        // For local development, if the key is missing, use the debug token.
        // This avoids needing a reCAPTCHA setup for local dev.
        if (!reCaptchaKey || reCaptchaKey === 'YOUR_RECAPTCHA_V3_SITE_KEY') {
          console.warn("reCAPTCHA Site Key not found. Using App Check debug token for local development. For production, set NEXT_PUBLIC_RECAPTCHA_SITE_KEY in your .env file.");
          (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
        }

        initializeAppCheck(app, {
          // Use ReCaptchaV3Provider if key is available, otherwise the debug provider will be used automatically
          provider: new ReCaptchaV3Provider(reCaptchaKey || 'dummy-site-key'),
          isTokenAutoRefreshEnabled: true,
        });
        
        (window as any).appCheckInitialized = true;
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
