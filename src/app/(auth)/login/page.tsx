
"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import React, { useEffect, useState, useRef } from "react";
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, User, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult, sendPasswordResetEmail } from "firebase/auth";
import { doc, getDoc } from 'firebase/firestore';
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
import { Flame, Phone, Check, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { countries, type Country } from "@/lib/countries";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";


const formSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(1, { message: "Password is required." }),
});

const phoneFormSchema = z.object({
    phone: z.string().min(1, { message: "Please enter a valid phone number." }),
    otp: z.string().optional(),
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

export default function LoginPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState("email");
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isRecaptchaInitialized, setIsRecaptchaInitialized] = useState(false);

  const [isResetAlertOpen, setIsResetAlertOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  
  const [openCountryPicker, setOpenCountryPicker] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries[0]);

  const emailForm = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  const phoneForm = useForm<z.infer<typeof phoneFormSchema>>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: {
        phone: "",
        otp: "",
    },
  });

  useEffect(() => {
    // This effect manages the lifecycle of the reCAPTCHA verifier.
    if (!auth || activeTab !== 'phone') {
        return;
    }

    const recaptchaContainer = document.getElementById('recaptcha-container');
    if (!recaptchaContainer) {
        console.error("reCAPTCHA container not found");
        return;
    }

    // Ensure a clean state for the verifier on each render.
    if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
    }
    recaptchaContainer.innerHTML = '';

    try {
        const verifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            size: 'invisible',
            callback: () => {
                // This callback is for user actions on a visible reCAPTCHA.
                // For invisible, signInWithPhoneNumber triggers the process.
            },
            'expired-callback': () => {
                // Handle expired verification
                toast({
                    variant: "destructive",
                    title: "Verification Expired",
                    description: "The security check expired. Please try sending the OTP again."
                });
                setIsOtpSent(false); // Go back to the phone number input screen
            }
        });
        recaptchaVerifierRef.current = verifier;
        setIsRecaptchaInitialized(true);
    } catch (e) {
        console.error("Error creating RecaptchaVerifier", e);
        toast({
            variant: "destructive",
            title: "Security Setup Failed",
            description: "Could not initialize security check. Please refresh the page.",
        });
    }
    
    // Cleanup function to clear the verifier when the component unmounts or tab changes.
    return () => {
        if (recaptchaVerifierRef.current) {
            recaptchaVerifierRef.current.clear();
        }
    };
  }, [auth, activeTab, toast]);


  async function onEmailSubmit(values: z.infer<typeof formSchema>) {
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      router.push("/discover");
    } catch (error: any) {
        if (error.code === 'auth/operation-not-allowed') {
            toast({
                variant: "destructive",
                title: "Login Method Disabled",
                description: "Email/Password sign-in is not enabled for this project. An admin must enable it in the Firebase Console.",
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
    try {
        await signInWithPopup(auth, provider);
        router.push("/discover");
    } catch (error: any) {
        if (error.code === 'auth/popup-closed-by-user') {
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
        console.error("Google Sign-In Error:", error);
        toast({
            variant: "destructive",
            title: "Google Sign-In Failed",
            description: error.message || "Could not sign in with Google. Please ensure your domain is authorized in the Firebase console and try again.",
            duration: 10000,
        });
    }
  };
  
  const handleSendOtp = async (values: z.infer<typeof phoneFormSchema>) => {
    const verifier = recaptchaVerifierRef.current;
    if (!verifier) {
        toast({ 
            variant: "destructive", 
            title: "Error", 
            description: "Security verification failed. Please try switching tabs or refreshing the page." 
        });
        return;
    }
    
    setIsSendingOtp(true);
    try {
        const phoneNumber = `${selectedCountry.dial_code}${values.phone}`;
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, verifier);
        confirmationResultRef.current = confirmationResult;
        setIsOtpSent(true);
        toast({ title: "OTP Sent", description: "Please check your phone for the verification code." });
    } catch (error: any) {
        console.error("Error sending OTP:", error);
        if (error.code === 'auth/invalid-phone-number') {
            toast({
                variant: "destructive",
                title: "Invalid Phone Number",
                description: "Please enter the number in international format, including the country code (e.g., +919876543210).",
                duration: 10000,
            });
        } else if (error.code === 'auth/operation-not-allowed') {
            toast({
                variant: "destructive",
                title: "Phone Sign-In Disabled",
                description: "Phone sign-in is not enabled. Please check two things: 1) In the Firebase Console, go to Authentication > Sign-in method and ensure 'Phone' is enabled. 2) In your Google Cloud project, ensure the 'Identity Platform' API is enabled.",
                duration: 20000,
            });
        } else if (error.code === 'auth/internal-error') {
            toast({
                variant: "destructive",
                title: "Configuration Error",
                description: "An internal error occurred. This can happen if the 'Identity Platform API' is not enabled in your Google Cloud project. Please check your project settings.",
                duration: 20000,
            });
        } else {
            toast({
                variant: "destructive",
                title: "Failed to Send OTP",
                description: error.message || "An unexpected error occurred. Please check the number and try again.",
            });
        }
    } finally {
        setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (values: z.infer<typeof phoneFormSchema>) => {
     const confirmationResult = confirmationResultRef.current;
     if (!confirmationResult || !values.otp) {
        toast({ variant: "destructive", title: "Error", description: "Something went wrong. Please try sending the OTP again." });
        return;
     }

     setIsVerifyingOtp(true);
     try {
        await confirmationResult.confirm(values.otp);
        router.push("/discover");
     } catch (error: any) {
        console.error("Error verifying OTP:", error);
        toast({ variant: "destructive", title: "Invalid OTP", description: "The code you entered is incorrect. Please try again." });
     } finally {
        setIsVerifyingOtp(false);
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
        // To prevent email enumeration attacks, we show the same message for success and "user not found".
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
        <Tabs defaultValue="email" className="w-full" onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email">Email</TabsTrigger>
                <TabsTrigger value="phone">Phone</TabsTrigger>
            </TabsList>
            
            <TabsContent value="email">
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

                <Button variant="outline" className="w-full" onClick={handleGoogleSignIn}>
                <GoogleIcon />
                <span className="ml-2">Sign in with Google</span>
                </Button>
            </TabsContent>

            <TabsContent value="phone">
                 <Form {...phoneForm}>
                    <form onSubmit={phoneForm.handleSubmit(isOtpSent ? handleVerifyOtp : handleSendOtp)} className="space-y-4 pt-4">
                        {!isOtpSent ? (
                            <FormField
                                control={phoneForm.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phone Number</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 flex items-center">
                                                    <Popover open={openCountryPicker} onOpenChange={setOpenCountryPicker}>
                                                        <PopoverTrigger asChild>
                                                            <Button
                                                                variant="outline"
                                                                role="combobox"
                                                                aria-expanded={openCountryPicker}
                                                                className="w-[130px] justify-between rounded-r-none border-r-0"
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
                                                                                <span className="mr-2">{country.flag}</span>
                                                                                <span>{country.name}</span>
                                                                                <span className="ml-auto text-muted-foreground">{country.dial_code}</span>
                                                                            </CommandItem>
                                                                        ))}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                </div>
                                                <Input placeholder="98765 43210" {...field} className="pl-[140px]" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        ) : (
                            <FormField
                                control={phoneForm.control}
                                name="otp"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Verification Code</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter the 6-digit code" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                             />
                        )}
                        <Button type="submit" className="w-full" disabled={isSendingOtp || isVerifyingOtp}>
                            {isOtpSent 
                                ? (isVerifyingOtp ? "Verifying..." : "Verify OTP") 
                                : (isSendingOtp ? "Sending OTP..." : "Send OTP")
                            }
                        </Button>
                        {isOtpSent && (
                            <Button variant="link" size="sm" className="w-full" onClick={() => setIsOtpSent(false)}>
                                Back to phone number
                            </Button>
                        )}
                    </form>
                 </Form>
            </TabsContent>
        </Tabs>

        <div id="recaptcha-container"></div>

        <div className="mt-4 text-center text-sm">
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

      </CardContent>
    </Card>
  );
}

    
