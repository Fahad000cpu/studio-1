'use client';

// This file is now primarily a barrel file for exporting Firebase-related
// hooks, providers, and utilities. The actual Firebase app initialization
// is handled within the FirebaseClientProvider to ensure it only happens
// once on the client.

// We no longer export app, auth, firestore instances from here to prevent
// potential multiple initializations. Components should use the provided
// hooks (useAuth, useFirestore, etc.) to access these instances.

export * from './provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
export * from './errors';
export * from './error-emitter';
export * from './messaging';

// Note: The config is not exported from here to discourage manual initialization elsewhere.
// It is used directly by the FirebaseClientProvider.
