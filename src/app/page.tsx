
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { FullScreenLoader } from '@/components/full-screen-loader';

/**
 * This is the root page of the application. It acts as a gatekeeper.
 * 1. It shows a loader while Firebase auth state is being determined.
 * 2. Once the state is known, it redirects the user to the appropriate page:
 *    - `/login` if the user is not authenticated.
 *    - `/discover` if the user is authenticated.
 * This centralized client-side approach prevents race conditions between different layouts.
 */
export default function RootPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Wait until the authentication status is fully determined.
    if (!isUserLoading) {
      if (user) {
        // If user is logged in, redirect to the main app.
        router.replace('/discover');
      } else {
        // If user is not logged in, redirect to the login page.
        router.replace('/login');
      }
    }
  }, [user, isUserLoading, router]);

  // Show a loader while we determine the user's auth state and redirect.
  return <FullScreenLoader message="Initializing..." />;
}
