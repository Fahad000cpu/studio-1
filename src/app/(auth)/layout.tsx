
"use client";

import { useEffect, useState } from "react";
import { useAuth, useFirestore, useUser } from "@/firebase";
import { FullScreenLoader } from "@/components/full-screen-loader";
import { getRedirectResult } from "firebase/auth";
import { handleUserProfileUpdate } from "@/lib/auth-helpers";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [authDomainError, setAuthDomainError] = useState<string | null>(null);

  useEffect(() => {
    // If auth state is resolved and a user exists, redirect to the main app.
    if (!isUserLoading && user) {
      router.replace("/discover");
    }
  }, [isUserLoading, user, router]);

  useEffect(() => {
    const handleRedirect = async () => {
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
            setAuthDomainError(window.location.hostname);
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
      <FullScreenLoader message={isUserLoading ? "Session load ho raha hai..." : "Redirect kar rahe hain..."} />
    );
  }

  // If we get here, it's safe to show the login/signup page.
  return (
    <>
      <main className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden">
        <div className="absolute inset-0 w-full h-full bg-gradient-animation z-0" />
        <div className="relative z-10 w-full flex justify-center p-4">
          {children}
        </div>
      </main>
      <AlertDialog open={!!authDomainError} onOpenChange={() => setAuthDomainError(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Zaroori Kadam: Domain Authorize Karein</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 text-left text-sm pt-2">
                <p>Yeh ek zaroori suraksha kadam hai. Aapke app ko protect karne ke liye, Firebase ko yeh janna zaroori hai ki kaun si websites uski authentication services istemal kar sakti hain.</p>
                <p className="font-bold">Kripya is domain ko apne Firebase project mein jodein:</p>
                <div className="mt-2 p-2 bg-muted rounded-md font-mono text-sm break-all">
                  {authDomainError}
                </div>
                <p className="font-bold mt-4">Steps:</p>
                <ol className="list-decimal list-inside space-y-2">
                  <li><a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="underline text-primary">Firebase Console</a> par jayein.</li>
                  <li>Apna project chunein: <code className="bg-muted px-1 py-0.5 rounded">connectsphere2132-709496-dcb23</code></li>
                  <li>Left menu mein, <span className="font-semibold">Authentication</span> par jayein.</li>
                  <li><span className="font-semibold">Settings</span> tab par click karein.</li>
                  <li><span className="font-semibold">Authorized domains</span> section tak scroll karein aur <span className="font-semibold">Add domain</span> par click karein.</li>
                  <li>Upar dikhaye gaye domain ko copy karke paste karein aur Add par click karein.</li>
                </ol>
                <p className="text-xs text-muted-foreground pt-2">Jodne ke baad, ise activate hone mein ek minute lag sakta hai. Uske baad kripya dobara login karne ki koshish karein.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAuthDomainError(null)}>Main Samajh Gaya</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
