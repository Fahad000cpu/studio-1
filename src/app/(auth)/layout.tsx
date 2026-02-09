
"use client";

import { useEffect } from "react";
import { useAuth, useFirestore, useUser } from "@/firebase";
import { FullScreenLoader } from "@/components/full-screen-loader";
import { getRedirectResult } from "firebase/auth";
import { handleUserProfileUpdate } from "@/lib/auth-helpers";
import { useToast } from "@/hooks/use-toast";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  useEffect(() => {
    const handleRedirect = async () => {
      if (user) return; // Don't run if user is already logged in

      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // This means the user has just come back from a redirect sign-in.
          const user = result.user;
          await handleUserProfileUpdate(firestore, user, {
              name: user.displayName,
              email: user.email,
              phoneNumber: user.phoneNumber,
              photoURL: user.photoURL,
          });
          // No need to redirect here, the useUser hook will detect the new user
          // and the RootPage or MainLayout will handle the redirection.
        }
      } catch (error: any) {
        console.error("Redirect Sign-In Error:", error);
        toast({
            variant: "destructive",
            title: "Sign-In Failed",
            description: error.message || "Could not complete sign-in. Please try again.",
            duration: 10000,
        });
      }
    };
    
    // isUserLoading is true on initial load, then false.
    // We want to check for redirect result after the initial auth state is resolved but before user is set.
    if (!isUserLoading) {
      handleRedirect();
    }
  }, [auth, firestore, toast, isUserLoading, user]);


  // This layout now acts as a simple guard.
  // If a user exists or auth state is loading, it shows a loader.
  // The redirection logic is centralized in `src/app/page.tsx`.
  if (isUserLoading || user) {
    return (
      <FullScreenLoader message={isUserLoading ? "Loading Session..." : "Redirecting..."} />
    );
  }

  // If we get here, it's safe to show the login/signup page.
  return (
    <main className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full bg-gradient-animation z-0" />
      <div className="relative z-10 w-full flex justify-center p-4">
        {children}
      </div>
    </main>
  );
}
