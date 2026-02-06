
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

  // While checking auth state, show a loader.
  if (isUserLoading) {
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

  // If loading is done and there is NO user, show the auth pages.
  if (!user) {
    return (
        <main className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden">
        <div className="absolute inset-0 w-full h-full bg-gradient-animation z-0" />
        <div className="relative z-10 w-full flex justify-center p-4">
            {children}
        </div>
        </main>
    );
  }

  // If loading is done and a user exists, it means we are about to redirect. Show a loader.
  return (
      <div className="flex items-center justify-center min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 w-full h-full bg-gradient-animation z-0" />
        <div className="relative z-10 flex flex-col items-center gap-4">
           <Flame className="h-12 w-12 text-primary animate-pulse" />
           <p className="text-muted-foreground bg-background/80 px-4 py-2 rounded-md">Redirecting...</p>
        </div>
      </div>
  );
}
