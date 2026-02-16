
"use client";

import { useEffect, useState } from "react";
import { useAuth, useFirestore, useUser } from "@/firebase";
import { FullScreenLoader } from "@/components/full-screen-loader";
import { getRedirectResult } from "firebase/auth";
import { handleUserProfileUpdate } from "@/lib/auth-helpers";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading: isAuthSessionLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  // This new state tracks if we are actively checking for a redirect result.
  const [isCheckingRedirect, setIsCheckingRedirect] = useState(true);

  // This effect runs ONLY ONCE on mount to check for a sign-in redirect result.
  useEffect(() => {
    // getRedirectResult should only run once on page load.
    // It captures the result of a signInWithRedirect operation.
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          // A user successfully signed in via redirect.
          // The main `useUser` hook will now pick up this new authenticated state.
          // We just need to ensure their profile is created or updated.
          const user = result.user;
          await handleUserProfileUpdate(firestore, user, {
            name: user.displayName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            photoURL: user.photoURL,
          });
          // The `useUser` hook will cause a re-render with the new user object,
          // which will trigger the redirect effect below.
        }
      })
      .catch((error: any) => {
        // Handle specific errors that can happen during the redirect itself.
        if (error.code === 'auth/unauthorized-domain') {
            toast({
                variant: "destructive",
                title: "Domain Not Authorized",
                description: `The domain ${window.location.hostname} is not authorized for this project. Please add it to the Firebase Console.`,
                duration: 10000,
            });
        } else {
            console.error("Redirect Sign-In Error:", error);
            toast({
                variant: "destructive",
                title: "Sign-In Failed",
                description: error.message || "Could not complete sign-in. Please try again.",
                duration: 10000,
            });
        }
      })
      .finally(() => {
        // Whether there was a result, an error, or nothing, we are done checking for the redirect.
        setIsCheckingRedirect(false);
      });
  // The empty dependency array ensures this effect runs only once on mount.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, firestore]);

  // This effect handles redirecting a user who is confirmed to be logged in.
  useEffect(() => {
    // It waits for BOTH the initial session check AND the one-time redirect check to complete.
    if (!isAuthSessionLoading && !isCheckingRedirect && user) {
      router.replace("/discover");
    }
  }, [isAuthSessionLoading, isCheckingRedirect, user, router]);

  // The overall loading state is true if we're either checking the session OR the redirect.
  const isLoading = isAuthSessionLoading || isCheckingRedirect;

  // Show a loader while we're authenticating. If the user object becomes available,
  // we continue showing the loader because the redirect effect is about to fire.
  // This prevents flashing the login page for a split second.
  if (isLoading || user) {
     return <FullScreenLoader message="Authenticating your session..." />;
  }

  // If we get here, all loading is complete and there's definitely no user, 
  // so it's safe to show the login/signup page.
  return (
    <>
      <main className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden">
        <div className="absolute inset-0 w-full h-full bg-gradient-animation z-0" />
        <div className="relative z-10 w-full flex justify-center p-4">
          {children}
        </div>
      </main>
    </>
  );
}
