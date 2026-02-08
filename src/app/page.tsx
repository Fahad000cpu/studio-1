"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { FullScreenLoader } from '@/components/full-screen-loader';

/**
 * The root page now acts as a "gatekeeper" on the client side.
 * It waits for the authentication state to be resolved and then redirects
 * the user to the appropriate page ('/discover' or '/login').
 * This centralized approach prevents the race conditions that were causing
 * the "404 Not Found" errors during app startup, where multiple layouts
 * were attempting to redirect simultaneously.
 */
export default function RootPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Wait until the user's auth state is known.
    if (isUserLoading) {
      return; // Do nothing while loading.
    }

    // Once loading is complete, decide where to redirect.
    if (user) {
      router.replace('/discover'); // User is logged in.
    } else {
      router.replace('/login'); // User is not logged in.
    }
  }, [user, isUserLoading, router]);

  // Show a loader while determining the auth state and redirecting.
  return <FullScreenLoader message="Initializing..." />;
}
