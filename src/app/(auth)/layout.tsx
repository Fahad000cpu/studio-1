
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/firebase";
import { Flame } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // If auth state is confirmed and there IS a user, redirect them away from auth pages.
    if (!isUserLoading && user) {
      router.push("/discover");
    }
  }, [user, isUserLoading, router]);

  // While checking auth OR if a user exists (which means we will redirect), show a loader.
  // This prevents a flash of the login page if the user is already logged in.
  if (isUserLoading || user) {
    return (
      <div className="flex items-center justify-center min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 w-full h-full bg-gradient-animation z-0" />
        <div className="relative z-10 flex flex-col items-center gap-4">
           <Flame className="h-12 w-12 text-primary animate-pulse" />
           <p className="text-muted-foreground bg-background/80 px-4 py-2 rounded-md">Loading Session...</p>
        </div>
      </div>
    );
  }

  // Only if loading is done and there is NO user, show the auth pages.
  return (
    <main className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full bg-gradient-animation z-0" />
      <div className="relative z-10 w-full flex justify-center p-4">
        {children}
      </div>
    </main>
  );
}
