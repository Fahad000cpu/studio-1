'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { FullScreenLoader } from '@/components/full-screen-loader';

/**
 * The root page of the application, acting as the primary gatekeeper for routing.
 * This client component waits for the authentication status to be resolved and then
 * executes a single, decisive redirect. This prevents race conditions between different
 * layouts trying to handle routing.
 */
export default function RootPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Wait until the authentication status is fully resolved.
    if (!isUserLoading) {
      if (user) {
        // If a user is logged in, go to the main content.
        router.replace('/discover');
      } else {
        // If no user is logged in, go to the login page.
        router.replace('/login');
      }
    }
    // This effect should run whenever the user's auth state or loading status changes.
  }, [user, isUserLoading, router]);

  // While waiting for the authentication check to complete, show a loader.
  // This prevents any flickering and ensures a smooth transition.
  return <FullScreenLoader message="Initializing ConnectSphere..." />;
}
