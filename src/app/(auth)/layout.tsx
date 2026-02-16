"use client";

import { useEffect } from "react";
import { useUser, useAuth, useFirestore } from "@/firebase";
import { FullScreenLoader } from "@/components/full-screen-loader";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // This effect handles the result of a redirect-based sign-in.
    // NOTE: This is less relevant now with signInWithPopup, but is kept for other potential redirect flows.
    const handleRedirect = async () => {
      // Avoid running this if a user session already exists or auth is still loading
      if (user || isUserLoading || !auth || !firestore) return;
      
      try {
        const result = await getRedirectResult(auth);
        if (result && result.user) {
          // A user has just signed in via redirect.
          // Ensure their profile exists in Firestore.
          await handleUserProfileUpdate(firestore, result.user, {
            name: result.user.displayName,
            email: result.user.email,
            photoURL: result.user.photoURL,
          });
          // Toast and redirect are handled by the next effect.
        }
      } catch (error: any) {
        console.error("Auth Redirect Error:", error);
        toast({
          variant: "destructive",
          title: "Sign-In Failed",
          description: error.message || "Could not complete sign-in. Please try again.",
        });
      }
    };
    
    handleRedirect();

  }, [isUserLoading, auth, firestore, toast, user]);

  useEffect(() => {
    // This effect handles redirecting the user once they are authenticated.
    if (!isUserLoading && user) {
      router.replace("/discover");
    }
  }, [isUserLoading, user, router]);

  // If we are loading, or if the user is already authenticated, show the loader.
  // The effects above will handle the logic and redirect. This prevents content flashing.
  if (isUserLoading || user) {
     return <FullScreenLoader message="Authenticating your session..." />;
  }

  // Only render the children (login/signup page) if we are not loading and there is no user.
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
