
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/firebase";
import { FullScreenLoader } from "@/components/full-screen-loader";

// The root page is now a client component that acts as a gatekeeper.
// It waits for the Firebase auth state to be determined before routing,
// which prevents the race condition that caused intermittent 404 errors.
export default function RootPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // Don't do anything until the auth state is resolved.
    if (isUserLoading) {
      return;
    }

    // Once loading is complete, decide where to go.
    if (user) {
      router.replace('/discover');
    } else {
      router.replace('/login');
    }
  }, [user, isUserLoading, router]);

  // While checking the auth state, show a generic loader.
  // This is what the user will see on initial app load.
  return <FullScreenLoader message="Initializing..." />;
}
