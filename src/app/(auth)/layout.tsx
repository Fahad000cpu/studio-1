
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
    // If auth is done loading and a user EXISTS, it means a logged-in user
    // has landed on a page within the (auth) group (e.g., /login).
    // They should be redirected to the main app.
    if (!isUserLoading && user) {
      router.replace('/discover');
    }
  }, [user, isUserLoading, router]);

  // While authentication is loading, or if a user exists (which means a redirect
  // is imminent), show a full-screen loader. This prevents the login/signup
  // page from flashing for logged-in users.
  if (isUserLoading || user) {
    return (
      <FullScreenLoader message={isUserLoading ? "Loading Session..." : "Redirecting..."} />
    );
  }

  // If we get here, it means there's no authenticated user and auth is resolved,
  // so it's safe to show the login/signup page.
  return (
    <main className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full bg-gradient-animation z-0" />
      <div className="relative z-10 w-full flex justify-center p-4">
        {children}
      </div>
    </main>
  );
}
