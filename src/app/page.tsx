'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { FullScreenLoader } from '@/components/full-screen-loader';

/**
 * The root page of the application, acting as a gatekeeper.
 * It waits for the Firebase authentication state to be determined and then
 * redirects the user to the appropriate part of the app.
 * This prevents race conditions between different layouts trying to redirect.
 */
export default function GatekeeperPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Wait until the authentication state is resolved
    if (!isUserLoading) {
      if (user) {
        // If user is logged in, redirect to the main app
        router.replace('/discover');
      } else {
        // If no user is logged in, redirect to the login page
        router.replace('/login');
      }
    }
  }, [user, isUserLoading, router]);

  // While checking the auth state, show a full-screen loader.
  // This page will never render anything else, as it will always redirect.
  return <FullScreenLoader message="Initializing..." />;
}
