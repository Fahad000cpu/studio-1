
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/firebase";
import { Flame } from "lucide-react";
import { InstallPwaButton } from "@/components/install-pwa-button";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push("/discover");
    }
  }, [user, isUserLoading, router]);

  // If we are checking auth, or if we have a user and are about to redirect, show a loader.
  if (isUserLoading || user) {
    return (
      <div className="flex items-center justify-center min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 w-full h-full bg-gradient-animation z-0" />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Flame className="h-12 w-12 text-primary animate-pulse" />
          <p className="text-muted-foreground bg-background/80 px-4 py-2 rounded-md">
            {isUserLoading ? "Loading Session..." : "Redirecting..."}
          </p>
        </div>
      </div>
    );
  }

  // Otherwise, we are done loading and there's no user, so show the auth page.
  return (
    <main className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full bg-gradient-animation z-0" />
      <div className="absolute top-4 right-4 z-20">
        <InstallPwaButton />
      </div>
      <div className="relative z-10 w-full flex justify-center p-4">
        {children}
      </div>
    </main>
  );
}
