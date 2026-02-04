'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';


// Initialize Firebase and export the instances.
// This code runs once on the client when the module is first loaded, ensuring a true singleton.
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth: Auth = getAuth(app);
const firestore: Firestore = getFirestore(app);

// Initialize App Check only on the client side
if (typeof window !== 'undefined') {
  try {
    // Ensure you have NEXT_PUBLIC_RECAPTCHA_SITE_KEY in your .env file
    if (!process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY === 'YOUR_RECAPTCHA_V3_SITE_KEY') {
      console.warn("reCAPTCHA Site Key is not set for App Check. Phone auth and other services may fail. Please add it to your .env file.");
    } else {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: true
      });
    }
  } catch (error) {
    console.error("Error initializing Firebase App Check:", error);
  }
}


// A separate initialization function is no longer needed as we export the initialized instances directly.
export { app, auth, firestore };


export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
export * from './messaging';
