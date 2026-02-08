
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
    // This is a failsafe guard. If auth is resolved and a user EXISTS,
    // it means a logged-in user has somehow navigated to the login/signup page.
    // Redirect them to the main app.
    if (!isUserLoading && user) {
      router.replace('/discover');
    }
  }, [user, isUserLoading, router]);

  // Show a loader while auth state is resolving, or if a user exists
  // (which means a redirect is about to happen). This prevents rendering
  // the login form for a split second before redirecting.
  if (isUserLoading || user) {
    return (
      <FullScreenLoader message={isUserLoading ? "Loading Session..." : "Redirecting..."} />
    );
  }

  // If we get here, it's safe to show the login/signup page.
  return (
    <main className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full bg-gradient-animation z-0" />
      <div className="relative z-10 w-full flex justify-center p-4">
        {children}
      </div>
    </main>
  );
}
