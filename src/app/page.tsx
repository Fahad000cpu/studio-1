
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { FullScreenLoader } from '@/components/full-screen-loader';

/**
 * This is the root page and main entry point of the application.
 * It acts as a smart dispatcher, checking the user's authentication
 * state and redirecting them to the appropriate starting page.
 * This centralization prevents race conditions from multiple layouts
 * trying to handle initial routing.
 */
export default function RootPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Wait until the authentication state is determined.
    if (isUserLoading) {
      return; // Do nothing while loading.
    }

    // Once loading is complete, decide where to go.
    if (user) {
      router.replace('/discover'); // User is logged in, go to the main app.
    } else {
      router.replace('/login'); // User is not logged in, go to the login page.
    }
  }, [user, isUserLoading, router]);

  // Show a loader while checking auth and redirecting.
  // This screen is shown until the useEffect completes the redirect.
  return <FullScreenLoader message="Initializing ConnectSphere..." />;
}
