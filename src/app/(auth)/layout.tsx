"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/firebase";
import { FullScreenLoader } from "@/components/full-screen-loader";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // If the user is loaded and exists, redirect from auth pages to the main app.
    if (!isUserLoading && user) {
      router.replace('/discover');
    }
  }, [user, isUserLoading, router]);

  // Show a loader while checking auth state or if a user is found (and redirect is in progress).
  if (isUserLoading || user) {
    return (
      <FullScreenLoader message={isUserLoading ? "Loading Session..." : "Redirecting..."} />
    );
  }

  // If loading is complete and there's no user, show the children (Login/Signup page).
  return (
    <main className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full bg-gradient-animation z-0" />
      <div className="relative z-10 w-full flex justify-center p-4">
        {children}
      </div>
    </main>
  );
}
