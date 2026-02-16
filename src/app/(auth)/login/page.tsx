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
import { useAuth } from "@/firebase";
import { Flame } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(1, { message: "Password is required." }),
});

const GoogleIcon = () => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
      <title>Google</title>
      <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.05 1.05-2.36 1.67-4.66 1.67-3.86 0-6.99-3.16-6.99-7.12s3.13-7.12 6.99-7.12c1.93 0 3.21.79 4.18 1.71l2.54-2.54C18.17 2.1 15.64 1 12.48 1 7.23 1 3.19 4.92 3.19 10.19s4.04 9.19 9.29 9.19c2.83 0 4.88-1.02 6.6-2.65 1.8-1.63 2.66-3.9 2.66-6.26 0-.6-.06-1.12-.15-1.62z" />
    </svg>
);

export default function LoginPage() {
  const auth = useAuth();
  const { toast } = useToast();
  
  const [isResetAlertOpen, setIsResetAlertOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

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
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithRedirect(auth, provider);
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
    <>
    <Card className="w-full max-w-md mx-4">
      <CardHeader className="text-center">
        <div className="flex justify-center items-center mb-4">
            <Flame className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-headline">Welcome Back!</CardTitle>
        <CardDescription>Sign in to your ConnectSphere account</CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" className="w-full" onClick={signInWithGoogle}>
          <GoogleIcon />
          Sign in with Google
        </Button>
        <div className="flex items-center my-4">
          <Separator className="flex-grow" />
          <span className="mx-4 text-xs text-muted-foreground">OR CONTINUE WITH</span>
          <Separator className="flex-grow" />
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
