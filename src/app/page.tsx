'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { FullScreenLoader } from '@/components/full-screen-loader';

/**
 * The root page of the application, acting as a gatekeeper.
 * This client component waits for the authentication state to be resolved
 * and then redirects the user to the appropriate page (/discover or /login).
 * This prevents race conditions between server-side and client-side redirects.
 */
export default function RootPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Don't do anything until the auth state is resolved
    if (isUserLoading) {
      return;
    }

    if (user) {
      // If user is logged in, go to the main app
      router.replace('/discover');
    } else {
      // If user is not logged in, go to the login page
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  // While checking the auth state, show a full-screen loader.
  // This is the only thing rendered until the redirect happens.
  return <FullScreenLoader message="Initializing..." />;
}
