'use client';

import React, { type ReactNode } from 'react';
import { FirebaseProvider } from '@/firebase/provider';
import { app, auth, firestore } from '@/firebase'; // Import instances directly

interface FirebaseClientProviderProps {
  children: ReactNode;
}

export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  // The instances are created once when the firebase/index.ts module is imported.
  // We pass them directly to the provider.
  return (
    <FirebaseProvider
      firebaseApp={app}
      auth={auth}
      firestore={firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
