
"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithRedirect,
  signInWithPopup,
} from "firebase/auth";

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
import { Flame, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { handleUserProfileUpdate } from "@/lib/auth-helpers";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(1, { message: "Password is required." }),
});

const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
      <title>Google</title>
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.08-2.58 2.03-4.56 2.03-3.86 0-7-3.15-7-7s3.14-7 7-7c1.93 0 3.38.79 4.3 1.7l2.16-2.16C18.2 3.18 15.83 2 12.48 2 7.42 2 3.44 5.92 3.44 10.92s3.98 8.92 9.04 8.92c5.06 0 8.54-3.57 8.54-8.72 0-.75-.08-1.5-.2-2.2z" fill="currentColor"/>
    </svg>
  );

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [isResetAlertOpen, setIsResetAlertOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);

  const emailForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

    const handleGoogleSignIn = async () => {
        const provider = new GoogleAuthProvider();
        try {
        if (isMobile) {
            await signInWithRedirect(auth, provider);
            return;
        }
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        await handleUserProfileUpdate(firestore, user, {
            name: user.displayName,
            email: user.email,
            phoneNumber: user.phoneNumber,
            photoURL: user.photoURL,
        });
        } catch (error: any) {
            if (error.code === 'auth/unauthorized-domain') {
                 setDomainError(window.location.hostname);
            } else if (error.code !== 'auth/popup-closed-by-user') {
                console.error("Google Sign-In Error:", error);
                toast({
                    variant: "destructive",
                    title: "Sign-In Failed",
                    description: error.message || "Could not sign in with Google.",
                    duration: 10000,
                });
            }
        }
    };

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

  const copyToClipboard = () => {
    if(domainError) {
      navigator.clipboard.writeText(domainError);
      toast({title: "Domain Copied!", description: `${domainError} has been copied to your clipboard.`});
    }
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

    <Card className="w-full max-w-md mx-4">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center mb-4">
            <Flame className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-headline">Welcome Back!</CardTitle>
        <CardDescription>Sign in to your ConnectSphere account</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4">
            <Button variant="outline" onClick={handleGoogleSignIn}>
                <GoogleIcon className="mr-2 h-4 w-4" />
                Login with Google
            </Button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              Or with email
            </span>
          </div>
        </div>
        
        <Form {...emailForm}>
        <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
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

        <div className="mt-6 text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="underline">
            Sign up
          </Link>
        </div>

        <div className="mt-4 px-8 text-center text-xs text-muted-foreground">
          By continuing, you agree to our{" "}
          <Link
            href="/terms-of-service"
            className="underline underline-offset-4 hover:text-primary"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy-policy"
            className="underline underline-offset-4 hover:text-primary"
          >
            Privacy Policy
          </Link>
          .
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

      </CardContent>
    </Card>
    </>
  );
}
