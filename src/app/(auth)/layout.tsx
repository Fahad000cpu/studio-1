
"use client";

import { useEffect, useState } from "react";
import { useAuth, useFirestore, useUser } from "@/firebase";
import { FullScreenLoader } from "@/components/full-screen-loader";
import { getRedirectResult } from "firebase/auth";
import { handleUserProfileUpdate } from "@/lib/auth-helpers";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";

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
  
  const [isCheckingRedirect, setIsCheckingRedirect] = useState(true);
  const [domainError, setDomainError] = useState<string | null>(null);

  useEffect(() => {
    // This effect runs once on mount to check for a sign-in redirect result.
    const checkRedirect = async () => {
        try {
            const result = await getRedirectResult(auth);
            if (result) {
                const user = result.user;
                // Await the profile update to ensure it completes before any potential redirection.
                await handleUserProfileUpdate(firestore, user, {
                    name: user.displayName,
                    email: user.email,
                    phoneNumber: user.phoneNumber,
                    photoURL: user.photoURL,
                });
                // The user object will be updated by the main auth listener,
                // which will trigger the redirection effect below.
            }
        } catch (error: any) {
            // This comprehensive catch block handles all redirect errors.
            if (error.code === 'auth/unauthorized-domain') {
                setDomainError(window.location.hostname);
            } else if (error.code === 'auth/account-exists-with-different-credential') {
                toast({
                    variant: "destructive",
                    title: "Account Exists",
                    description: "An account with this email already exists using a different sign-in method (e.g., password).",
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
        } finally {
            // Whether it succeeds or fails, we are done checking.
            setIsCheckingRedirect(false);
        }
    };
    checkRedirect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, firestore]);

  useEffect(() => {
    // This effect handles redirecting the user once they are authenticated.
    if (!isAuthSessionLoading && !isCheckingRedirect && user) {
      router.replace("/discover");
    }
  }, [isAuthSessionLoading, isCheckingRedirect, user, router]);

  // While either auth state is loading or we're checking for redirect, show a loader.
  const isLoading = isAuthSessionLoading || isCheckingRedirect;

  const copyToClipboard = () => {
    if(domainError) {
      navigator.clipboard.writeText(domainError);
      toast({title: "Domain Copied!", description: `${domainError} has been copied to your clipboard.`});
    }
  }

  // If we are loading, or if the user is already authenticated, show the loader.
  // The second effect will handle the redirect. This prevents the login form from flashing.
  if (isLoading || user) {
     return <FullScreenLoader message="Authenticating your session..." />;
  }

  // Only render the children (login/signup page) if we are not loading and there is no user.
  return (
    <>
      <AlertDialog open={!!domainError} onOpenChange={() => setDomainError(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline text-xl">Domain Not Authorized</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-foreground space-y-4">
              <p>This domain is not authorized for Google Sign-In. Please add it to your project configuration.</p>
              
              <div className="p-3 bg-muted rounded-lg space-y-3 text-left">
                <div>
                  <p className="text-sm text-muted-foreground">Add this domain:</p>
                  <div className="flex items-center justify-between mt-1">
                    <code className="font-mono text-lg">{domainError}</code>
                    <Button variant="ghost" size="icon" onClick={copyToClipboard}>
                        <Copy className="h-5 w-5"/>
                    </Button>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">To this Firebase Project ID:</p>
                  <p className="font-mono text-lg font-bold">{auth.app.options.projectId}</p>
                </div>
              </div>

              <div>
                <p className="font-semibold text-left">Instructions:</p>
                <ol className="list-decimal list-inside mt-2 text-sm space-y-1 text-left">
                  <li>Go to your <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Firebase Console</a>.</li>
                  <li>Select the project shown above (`{auth.app.options.projectId}`).</li>
                  <li>Go to <strong>Authentication</strong> &gt; <strong>Settings</strong> tab &gt; <strong>Authorized domains</strong>.</li>
                  <li>Click <strong>Add domain</strong> and paste the domain from above.</li>
                </ol>
              </div>

            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDomainError(null)} className="w-full">I Understand</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <main className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden">
        <div className="absolute inset-0 w-full h-full bg-gradient-animation z-0" />
        <div className="relative z-10 w-full flex justify-center p-4">
          {children}
        </div>
      </main>
    </>
  );
}
