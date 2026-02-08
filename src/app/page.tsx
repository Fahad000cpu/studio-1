
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from "@/firebase";
import { FullScreenLoader } from "@/components/full-screen-loader";

/**
 * The root page of the application, acting as the primary gatekeeper for routing.
 * This client component waits for the authentication state to be resolved
 * and then performs a single, definitive redirect to the appropriate section
 * of the app ('/discover' for logged-in users, '/login' for logged-out users).
 * It shows a loader during the initial auth check to prevent content flashes.
 */
export default function RootPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Wait until the authentication state is resolved.
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

  // While we wait for the auth state and the redirect to happen,
  // show a full-screen loader. This is the default state.
  return <FullScreenLoader message="Initializing your experience..." />;
}
