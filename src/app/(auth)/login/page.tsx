
"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import React, { useState } from "react";
import { signInWithEmailAndPassword, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup, sendPasswordResetEmail, signInWithRedirect } from "firebase/auth";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth, useFirestore } from "@/firebase";
import { Flame } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { handleUserProfileUpdate } from "@/lib/auth-helpers";
import { useIsMobile } from "@/hooks/use-mobile";


const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(1, { message: "Password is required." }),
});

const GoogleIcon = () => (
    <svg className="h-5 w-5" viewBox="0 0 24 24" >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
      <path d="M1 1h22v22H1z" fill="none" />
    </svg>
  );

const FacebookIcon = () => (
    <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3l-.5 3h-2.5v6.95c5.05-.5 9-4.76 9-9.95z" fill="#1877F2"/>
    </svg>
);


export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [isResetAlertOpen, setIsResetAlertOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [authDomainError, setAuthDomainError] = useState<string | null>(null);
  const [isProviderErrorOpen, setIsProviderErrorOpen] = useState(false);

  const emailForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });


  async function onEmailSubmit(values: z.infer<typeof formSchema>) {
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
    } catch (error: any) {
        if (error.code === 'auth/operation-not-allowed') {
            toast({
                variant: "destructive",
                title: "Login Method Disabled",
                description: "Email/Password sign-in is not enabled. An admin must enable it in the Firebase Console.",
                duration: 10000,
            });
        } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            toast({
                variant: "destructive",
                title: "Login Failed",
                description: "Invalid email or password. Please check your credentials and try again.",
            });
        }
        else {
            console.error("Login error:", error);
            toast({
                variant: "destructive",
                title: "Login Failed",
                description: "An unexpected error occurred. Please try again later.",
            });
        }
    }
}


  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    if (isMobile) {
      await signInWithRedirect(auth, provider);
      return;
    }
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        await handleUserProfileUpdate(firestore, user, {
            name: user.displayName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            photoURL: user.photoURL,
        });
        
    } catch (error: any) {
        // If the user closes the popup, it could be because of a config error shown inside the popup window.
        // We also catch generic internal errors which often hide underlying config issues from the provider.
        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request' || error.code === 'auth/internal-error' || (error.message && (error.message.includes('403') || error.message.includes('access_denied')))) {
            setIsProviderErrorOpen(true); // Show the helpful configuration dialog.
            return;
        }
        if (error.code === 'auth/account-exists-with-different-credential') {
            toast({
                variant: "destructive",
                title: "Account Exists",
                description: "An account with this email already exists using a different sign-in method. Please log in with your original method.",
                duration: 10000,
            });
            return;
        }
        if (error.code === 'auth/unauthorized-domain') {
            setAuthDomainError(window.location.hostname);
            return;
        }
        console.error("Google Sign-In Error:", error);
        toast({
            variant: "destructive",
            title: "Google Sign-In Failed",
            description: error.message || "Could not sign in with Google. Please try again later.",
            duration: 10000,
        });
    }
  };

  const handleFacebookSignIn = async () => {
    const provider = new FacebookAuthProvider();
    if (isMobile) {
      await signInWithRedirect(auth, provider);
      return;
    }
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        await handleUserProfileUpdate(firestore, user, {
            name: user.displayName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            photoURL: user.photoURL,
        });
        
    } catch (error: any) {
        // If the user closes the popup, it could be because of a config error shown inside the popup window.
        // We also catch generic internal errors which often hide underlying config issues from the provider.
        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request' || error.code === 'auth/internal-error' || (error.message && (error.message.includes('403') || error.message.includes('access_denied')))) {
            setIsProviderErrorOpen(true); // Show the helpful configuration dialog.
            return;
        }
        if (error.code === 'auth/account-exists-with-different-credential') {
            toast({
                variant: "destructive",
                title: "Account Exists",
                description: "An account with this email already exists using a different sign-in method. Please log in with your original method.",
                duration: 10000,
            });
        } else if (error.code === 'auth/unauthorized-domain') {
            setAuthDomainError(window.location.hostname);
            return;
        } else {
            console.error("Facebook Sign-In Error:", error);
            toast({
                variant: "destructive",
                title: "Facebook Sign-In Failed",
                description: error.message || "Could not sign in with Facebook. Ensure it is configured correctly in the Firebase Console.",
                duration: 10000,
            });
        }
    }
  };
  
  const handlePasswordReset = async () => {
    if (!resetEmail) {
        toast({
            variant: "destructive",
            title: "Email Required",
            description: "Please enter your email address to reset your password.",
        });
        return;
    }
    if (!auth) return;
    setIsSendingReset(true);
    try {
        await sendPasswordResetEmail(auth, resetEmail);
        toast({
            title: "Password Reset Email Sent",
            description: `If an account exists for ${resetEmail}, you will receive an email with instructions.`,
        });
        setIsResetAlertOpen(false);
        setResetEmail('');
    } catch (error: any) {
        toast({
            title: "Password Reset Email Sent",
            description: `If an account exists for ${resetEmail}, you will receive an email with instructions.`,
        });
        setIsResetAlertOpen(false);
        setResetEmail('');
        console.error("Password reset error:", error);
    } finally {
        setIsSendingReset(false);
    }
  };


  return (
    <Card className="w-full max-w-md mx-4">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center mb-4">
            <Flame className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-headline">Welcome Back!</CardTitle>
        <CardDescription>Sign in to your ConnectSphere account</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...emailForm}>
        <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4 pt-4">
            <FormField
            control={emailForm.control}
            name="email"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                    <Input placeholder="name@example.com" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <FormField
            control={emailForm.control}
            name="password"
            render={({ field }) => (
                <FormItem>
                    <div className="flex items-center justify-between">
                    <FormLabel>Password</FormLabel>
                    <button
                        type="button"
                        onClick={() => setIsResetAlertOpen(true)}
                        className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                    >
                        Forgot password?
                    </button>
                </div>
                <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
            <Button type="submit" className="w-full" disabled={emailForm.formState.isSubmitting}>
            {emailForm.formState.isSubmitting ? "Logging in..." : "Login"}
            </Button>
        </form>
        </Form>

        <div className="relative my-6">
        <Separator />
        <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
            Or continue with
            </span>
        </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
                <GoogleIcon />
                <span className="ml-2">Google</span>
            </Button>
            <Button variant="outline" className="w-full" onClick={handleFacebookSignIn}>
                <FacebookIcon />
                <span className="ml-2">Facebook</span>
            </Button>
        </div>

        <div className="mt-6 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="underline">
            Sign up
          </Link>
        </div>

        <AlertDialog open={isResetAlertOpen} onOpenChange={setIsResetAlertOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Forgot Password?</AlertDialogTitle>
              <AlertDialogDescription>
                Enter your email address below and we'll send you a link to reset your password.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 py-2">
                <Label htmlFor="reset-email">Email Address</Label>
                <Input 
                    id="reset-email"
                    type="email"
                    placeholder="name@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handlePasswordReset} disabled={isSendingReset}>
                {isSendingReset ? "Sending..." : "Send Reset Link"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!authDomainError} onOpenChange={() => setAuthDomainError(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Domain Not Authorized</AlertDialogTitle>
                <AlertDialogDescription>
                    To enable sign-in with this provider, you need to add your app's domain to the list of authorized domains in the Firebase console.
                    <br/><br/>
                    <span className="font-bold">Domain to add:</span>
                    <div className="mt-2 p-2 bg-muted rounded-md font-mono text-sm break-all">
                    {authDomainError}
                    </div>
                    <br/>
                    Go to your Firebase project, then **Authentication → Settings → Authorized domains**, and click **Add domain**.
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogAction onClick={() => setAuthDomainError(null)}>I Understand</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isProviderErrorOpen} onOpenChange={setIsProviderErrorOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Sign-In Configuration Error</AlertDialogTitle>
                    <AlertDialogDescription asChild>
                        <div className="space-y-4 text-left text-sm pt-2">
                            <p>This sign-in failed. This is almost always a **configuration problem** in the cloud console, not a bug in the app's code.</p>
                            <p className="font-bold">Please check the following in your provider's developer console (e.g., Google Cloud):</p>
                            <ol className="list-decimal list-inside space-y-3">
                                <li>
                                    <span className="font-semibold">OAuth Consent Screen:</span> Ensure the "Publishing status" is **"In production"**. If it's "Testing", you MUST add your account's email to the "Test users" list.
                                </li>
                                <li>
                                    <span className="font-semibold">Authorized Redirect URIs (for 404/redirect errors):</span> In your OAuth Client ID settings, ensure you have an entry in "Authorized redirect URIs" that looks like this:
                                    <div className="mt-2 p-2 bg-muted rounded-md font-mono text-xs break-all">
                                    https://{auth.config.authDomain}/__/auth/handler
                                    </div>
                                </li>
                                <li>
                                    <span className="font-semibold">Authorized Domains (Firebase):</span> Ensure your app's domain is listed in the Firebase Console under **Authentication → Settings → Authorized domains**.
                                </li>
                            </ol>
                            <p className="mt-4 text-xs text-muted-foreground">These are necessary security steps for all social sign-in providers.</p>
                        </div>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => setIsProviderErrorOpen(false)}>I Understand</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>

      </CardContent>
    </Card>
  );
}

    

    