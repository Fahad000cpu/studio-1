
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { FullScreenLoader } from '@/components/full-screen-loader';

/**
 * The root page of the application, acting as a "gatekeeper" for routing.
 * This client component is the *single source of truth* for initial redirection.
 * It waits for the authentication state to resolve and then performs a
 * definitive client-side redirect, preventing race conditions from other layouts.
 */
export default function RootPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Wait until the authentication state is fully resolved.
    if (isUserLoading) {
      return; // Do nothing while we wait.
    }

    // Once resolved, perform the one and only initial redirect.
    if (user) {
      router.replace('/discover');
    } else {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  // Render a loader while the redirection logic is determining the destination.
  return <FullScreenLoader message="Initializing..." />;
}
