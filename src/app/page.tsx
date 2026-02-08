"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@/firebase';
import { FullScreenLoader } from '@/components/full-screen-loader';

/**
 * The root page of the application, acting as a "gatekeeper" for routing.
 * This client component waits for the authentication state to resolve and then
 * performs a single, definitive client-side redirect. This prevents race
 * conditions between different layouts trying to redirect simultaneously.
 */
export default function RootPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Wait until the authentication state is resolved.
    if (isUserLoading) {
      return; // Do nothing while loading.
    }

    // Once loading is complete, decide where to go.
    if (user) {
      router.replace('/discover');
    } else {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  // While waiting for the auth state to resolve, show a loader.
  // This is crucial to prevent other layouts from rendering and attempting
  // their own redirects, which causes the race condition.
  return <FullScreenLoader message="Initializing..." />;
}
