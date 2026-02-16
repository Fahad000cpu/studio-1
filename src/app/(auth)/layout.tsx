
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
    getRedirectResult(auth)
      .then(async (result) => {
        if (result) {
          const user = result.user;
          await handleUserProfileUpdate(firestore, user, {
            name: user.displayName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            photoURL: user.photoURL,
          });
        }
      })
      .catch((error: any) => {
        if (error.code === 'auth/unauthorized-domain') {
            setDomainError(window.location.hostname);
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
        setIsCheckingRedirect(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth, firestore]);

  useEffect(() => {
    if (!isAuthSessionLoading && !isCheckingRedirect && user) {
      router.replace("/discover");
    }
  }, [isAuthSessionLoading, isCheckingRedirect, user, router]);

  const isLoading = isAuthSessionLoading || isCheckingRedirect;

  const copyToClipboard = () => {
    if(domainError) {
      navigator.clipboard.writeText(domainError);
      toast({title: "Domain Copied!", description: `${domainError} has been copied to your clipboard.`});
    }
  }

  if (isLoading || user) {
     return <FullScreenLoader message="Authenticating your session..." />;
  }

  return (
    <>
      <AlertDialog open={!!domainError} onOpenChange={() => setDomainError(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline text-xl">Domain Authorized Nahi Hai</AlertDialogTitle>
            <AlertDialogDescription className="text-base text-foreground space-y-4">
              <p>Google Sign-In ke liye is domain ko anumati nahi hai. Kripya ise apne Firebase project mein jodein.</p>
              
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Yeh domain add karein:</p>
                <div className="flex items-center justify-between mt-1">
                  <code className="font-mono text-lg">{domainError}</code>
                  <Button variant="ghost" size="icon" onClick={copyToClipboard}>
                      <Copy className="h-5 w-5"/>
                  </Button>
                </div>
              </div>

              <div>
                <p className="font-semibold">Nirdesh (Steps):</p>
                <ol className="list-decimal list-inside mt-2 text-sm space-y-1">
                  <li>Apne <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-primary underline">Firebase Console</a> par jayein.</li>
                  <li>Apna project chunein: <strong>connect-sphere-ba19a</strong>.</li>
                  <li><strong>Authentication</strong> &gt; <strong>Settings</strong> tab &gt; <strong>Authorized domains</strong> par jayein.</li>
                  <li><strong>Add domain</strong> par click karein aur upar diya gaya domain paste karein.</li>
                </ol>
              </div>

            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setDomainError(null)} className="w-full">Main Samajh Gaya</AlertDialogAction>
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
