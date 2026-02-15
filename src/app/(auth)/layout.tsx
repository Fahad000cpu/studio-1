
"use client";

import { useEffect } from "react";
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
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    // If auth state is resolved and a user exists, redirect to the main app.
    if (!isUserLoading && user) {
      router.replace("/discover");
    }
  }, [isUserLoading, user, router]);

  useEffect(() => {
    const handleRedirect = async () => {
      // This function now runs regardless of the initial `user` state,
      // as getRedirectResult is the source of truth after a redirect.
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // This means the user has just come back from a redirect sign-in.
          // The other useEffect will now detect the new `user` object and redirect.
          const user = result.user;
          await handleUserProfileUpdate(firestore, user, {
              name: user.displayName,
              email: user.email,
              phoneNumber: user.phoneNumber,
              photoURL: user.photoURL,
          });
        }
      } catch (error: any) {
        if (error.code === 'auth/unauthorized-domain') {
            const domain = window.location.hostname;
            toast({
                variant: "destructive",
                title: "Domain Not Authorized",
                description: `The domain '${domain}' is not authorized. You must add it to the 'Authorized domains' list in BOTH the Firebase Console (Authentication -> Sign-in method) AND your Google/Facebook OAuth client settings.`,
                duration: 15000,
            });
            return;
        }
        console.error("Redirect Sign-In Error:", error);
        toast({
            variant: "destructive",
            title: "Sign-In Failed",
            description: error.message || "Could not complete sign-in. Please try again.",
            duration: 10000,
        });
      }
    };
    
    // Only check for redirect result after initial auth state is resolved.
    if (!isUserLoading) {
      handleRedirect();
    }
  }, [auth, firestore, toast, isUserLoading]);


  // If auth is loading, or if a user exists (and is about to be redirected), show a loader.
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
