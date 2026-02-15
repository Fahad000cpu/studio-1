"use client";

import { useEffect } from "react";
import { useUser } from "@/firebase";
import { useRouter } from "next/navigation";
import { FullScreenLoader } from "@/components/full-screen-loader";

/**
 * The root page of the application, which acts as a gatekeeper.
 * It's a client component that waits for the authentication state to be determined,
 * then redirects the user to the appropriate page (`/discover` or `/signup`).
 * This centralized approach prevents routing race conditions between different layouts.
 */
export default function RootPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Wait until the authentication status is no longer loading.
    if (!isUserLoading) {
      // If a user is logged in, redirect them to the main app.
      if (user) {
        router.replace("/discover");
      } else {
        // If no user is logged in, redirect them to the signup page.
        router.replace("/signup");
      }
    }
    // The effect depends on the user's loading status, the user object itself, and the router.
  }, [isUserLoading, user, router]);

  // While we are determining the auth state, show a full-screen loader
  // to provide feedback to the user and prevent any content flashing.
  return <FullScreenLoader message="Initializing..." />;
}
