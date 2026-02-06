
"use client";

import Link from "next/link";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateProfile, UserCredential, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, User, getAdditionalUserInfo } from "firebase/auth";
import { doc, GeoPoint, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
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
import { useAuth, useFirestore, requestPermission } from "@/firebase";
import { Flame } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
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

export default function SignupPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const createUserProfile = async (user: User, name: string, email: string, initialTokens: string[], phoneNumber?: string | null, photoURL?: string | null) => {
    const userRef = doc(firestore, "users", user.uid);
  
    const createUserDoc = (coordinates: GeoPoint | null) => {
      const userProfile = {
        id: user.uid,
        name: name,
        email: email,
        phoneNumber: phoneNumber || user.phoneNumber || null,
        profilePictureUrl: photoURL || `https://picsum.photos/seed/${user.uid}/200`,
        coordinates,
        fcmTokens: initialTokens,
        createdAt: new Date(),
      };
      // Use await to ensure the document is created before proceeding.
      return setDoc(userRef, userProfile);
    };
  
    return new Promise<void>((resolve) => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            await createUserDoc(new GeoPoint(latitude, longitude));
            resolve();
          },
          async () => {
            await createUserDoc(null);
            resolve();
          }
        );
      } else {
        createUserDoc(null).then(resolve);
      }
    });
  };


  const handlePostSignup = async (user: User, name: string, email: string, phoneNumber?: string | null, photoURL?: string | null) => {
    const userRef = doc(firestore, 'users', user.uid);
    try {
        // First, request notification permission and get the token.
        const token = await requestPermission(firestore, user.uid);
        const initialTokens = token ? [token] : [];
  
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
            // Now, create the profile, including the token from the start.
            await createUserProfile(user, name, email, initialTokens, phoneNumber, photoURL);
        } else if (token) {
            // If the profile already exists (e.g., from a previous failed signup), just add the token.
            await updateDoc(userRef, {
                fcmTokens: arrayUnion(token)
            });
        }
    } catch (error) {
        console.error("Post-signup actions failed:", error);
    }
  }

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const userCredential: UserCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      if (user) {
        await updateProfile(user, { displayName: values.name });
        await handlePostSignup(user, values.name, values.email, user.phoneNumber, user.photoURL);
        router.push("/discover");
      }
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        toast({
            variant: "destructive",
            title: "Signup Failed",
            description: "This email is already registered. Please login.",
        });
      } else {
        console.error("Signup error:", error);
        toast({
            variant: "destructive",
            title: "Signup Failed",
            description: "Could not create your account. Please try again.",
        });
      }
    }
  }
  
  const handleGoogleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        const user = result.user;
        
        // Always run post-signup actions to ensure token is present.
        await handlePostSignup(user, user.displayName!, user.email!, user.phoneNumber, user.photoURL);
        
        router.push("/discover");
    } catch (error: any) {
        if (error.code === 'auth/popup-closed-by-user') {
            return;
        }
        if (error.code === 'auth/account-exists-with-different-credential') {
             toast({
                variant: "destructive",
                title: "Account Exists",
                description: "An account already exists with this email. Please sign in with your original method.",
            });
        } else {
            console.error("Google Sign-In Error:", error);
            toast({
                variant: "destructive",
                title: "Google Sign-Up Failed",
                description: error.message || "Could not sign up with Google. Please try again.",
            });
        }
    }
  };

  return (
    <Card className="w-full max-w-md mx-4">
      <CardHeader className="text-center">
         <div className="flex justify-center items-center mb-4">
            <Flame className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl font-headline">Create an Account</CardTitle>
        <CardDescription>Join ConnectSphere today!</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
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
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Creating Account..." : "Create Account"}
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

        <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
          <GoogleIcon />
          <span className="ml-2">Sign up with Google</span>
        </Button>

        <div className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Login
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
