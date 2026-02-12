
"use client";

import Link from "next/link";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { updateProfile, createUserWithEmailAndPassword, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup, sendEmailVerification, signInWithRedirect } from "firebase/auth";
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
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth, useFirestore } from "@/firebase";
import { Flame, Check, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { countries, type Country } from "@/lib/countries";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { handleUserProfileUpdate } from "@/lib/auth-helpers";
import { useIsMobile } from "@/hooks/use-mobile";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  phone: z.string().optional(),
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


export default function SignupPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  const [openCountryPicker, setOpenCountryPicker] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries.find(c => c.code === 'IN') || countries[0]);
  const [authDomainError, setAuthDomainError] = useState<string | null>(null);
  const [isProviderErrorOpen, setIsProviderErrorOpen] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      
      await updateProfile(user, { displayName: values.name });
      
      const fullPhoneNumber = values.phone ? `${selectedCountry.dial_code}${values.phone}` : null;
      
      await handleUserProfileUpdate(firestore, user, {
        name: values.name,
        email: values.email,
        phoneNumber: fullPhoneNumber,
        photoURL: user.photoURL,
      });
      
      await sendEmailVerification(user);
      toast({
          title: "Verification Email Sent",
          description: "Please check your inbox to verify your email address. Redirecting to the app...",
      });
      
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
        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
            return;
        }
        if (error.code === 'auth/internal-error' || (error.message && (error.message.includes('403') || error.message.includes('access_denied')))) {
            setIsProviderErrorOpen(true);
            return;
        }
        if (error.code === 'auth/account-exists-with-different-credential') {
             toast({
                variant: "destructive",
                title: "Account Exists",
                description: "An account already exists with this email. Please sign in with your original method.",
            });
        } else if (error.code === 'auth/unauthorized-domain') {
            setAuthDomainError(window.location.hostname);
            return;
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
        if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
            return;
        }
        if (error.code === 'auth/internal-error' || (error.message && (error.message.includes('403') || error.message.includes('access_denied')))) {
            setIsProviderErrorOpen(true);
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
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number (Optional)</FormLabel>
                   <div className="flex gap-2">
                        <Popover open={openCountryPicker} onOpenChange={setOpenCountryPicker}>
                            <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openCountryPicker}
                                className="w-[130px] justify-between"
                            >
                                {selectedCountry.flag} {selectedCountry.dial_code}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[300px] p-0">
                                <Command>
                                    <CommandInput placeholder="Search country..." />
                                    <CommandList>
                                        <CommandEmpty>No country found.</CommandEmpty>
                                        <CommandGroup>
                                        {countries.map((country) => (
                                            <CommandItem
                                            key={country.code}
                                            value={`${country.name} (${country.dial_code})`}
                                            onSelect={() => {
                                                setSelectedCountry(country)
                                                setOpenCountryPicker(false)
                                            }}
                                            >
                                            <Check
                                                className={cn(
                                                "mr-2 h-4 w-4",
                                                selectedCountry.code === country.code ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {country.flag} <span className="ml-2 font-medium">{country.name}</span> <span className="ml-auto text-muted-foreground">{country.dial_code}</span>
                                            </CommandItem>
                                        ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <FormControl>
                            <Input placeholder="98765 43210" {...field} />
                        </FormControl>
                    </div>
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
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Login
          </Link>
        </div>

        <AlertDialog open={!!authDomainError} onOpenChange={() => setAuthDomainError(null)}>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Domain Not Authorized</AlertDialogTitle>
                <AlertDialogDescription>
                    To enable sign-up with this provider, you need to add your app's domain to the list of authorized domains in the Firebase console.
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
                    <AlertDialogDescription>
                        <div className="space-y-3 text-left">
                            <p>This sign-in failed due to a likely misconfiguration in your Google Cloud or Facebook Developer project, not a bug in the app code.</p>
                            <p className="font-bold">Please check the following in your project's cloud console:</p>
                            <ol className="list-decimal list-inside space-y-2">
                                <li>
                                    Go to the <strong>OAuth consent screen</strong> page.
                                </li>
                                <li>
                                    Ensure the <strong>"Publishing status"</strong> is <strong>"In production"</strong>. If it's "Testing", you must add your Google account's email to the "Test users" list.
                                </li>
                                <li>
                                    For both Google & Facebook, ensure your app's domain is listed in the <strong>"Authorized domains"</strong> section of the Firebase Console (Authentication → Settings).
                                </li>
                            </ol>
                            <p className="mt-4 text-xs text-muted-foreground">This is a necessary security step for all social sign-in providers.</p>
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

    
