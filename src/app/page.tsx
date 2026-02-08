"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/firebase";
import { FullScreenLoader } from "@/components/full-screen-loader";

/**
 * The root page of the application, acting as a "gatekeeper" for routing.
 * This client component determines the user's authentication status and performs
 * a single, definitive redirect to either the main app or the login page.
 * This centralized approach prevents race conditions between different layouts.
 */
export default function RootPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Wait until the authentication status is fully determined.
    if (!isUserLoading) {
      if (user) {
        // If user is logged in, redirect to the main discover page.
        router.replace('/discover');
      } else {
        // If user is not logged in, redirect to the login page.
        router.replace('/login');
      }
    }
    // This effect should run whenever the auth state changes.
  }, [user, isUserLoading, router]);

  // While the auth state is being checked, display a full-screen loader
  // to prevent any other part of the app from rendering or attempting to redirect.
  // This is crucial to avoid the 404 error.
  return <FullScreenLoader message="Initializing..." />;
}
