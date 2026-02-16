"use client";

import Link from "next/link";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  updateProfile,
  createUserWithEmailAndPassword,
  sendEmailVerification,
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
import { useAuth, useFirestore } from "@/firebase";
import { Flame, Check, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { countries, type Country } from "@/lib/countries";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { handleUserProfileUpdate } from "@/lib/auth-helpers";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
  phone: z.string().optional(),
});


export default function SignupPage() {
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [openCountryPicker, setOpenCountryPicker] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>(countries.find(c => c.code === 'IN') || countries[0]);

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
            description: `Could not create your account: ${error.message}.`,
        });
      }
    }
  }

  return (
    <>
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
        
        <div className="mt-6 text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Login
          </Link>
        </div>
        
        <div className="mt-4 px-8 text-center text-xs text-muted-foreground">
          By creating an account, you agree to our{" "}
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
      </CardContent>
    </Card>
      </>
  );
}
