'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { Auth, initializeAuth, indexedDBLocalPersistence, browserLocalPersistence } from 'firebase/auth';
import { Firestore, getFirestore } from 'firebase/firestore';


// IMPORTANT: DO NOT MODIFY THIS FUNCTION
export function initializeFirebase() {
  const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
  return getSdks(app);
}

export function getSdks(firebaseApp: FirebaseApp) {
  // Replace getAuth with initializeAuth to explicitly set persistence.
  // This explicitly tells Firebase to prefer IndexedDB or LocalStorage for session
  // persistence, avoiding SessionStorage which can cause issues in some
  // mobile/partitioned environments.
  const auth = initializeAuth(firebaseApp, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence]
  });
  const firestore = getFirestore(firebaseApp);
  
  return {
    firebaseApp,
    auth,
    firestore,
  };
}

export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
export * from './messaging';
