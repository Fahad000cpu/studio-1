
"use client";

import { useUser } from "@/firebase";
import { FullScreenLoader } from "@/components/full-screen-loader";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();

  // This layout now only acts as a guard.
  // If the user is being checked or is already logged in, show a loader.
  // The actual redirection away from this page is handled by the root page.tsx.
  if (isUserLoading || user) {
    return (
      <FullScreenLoader message={isUserLoading ? "Loading Session..." : "Redirecting..."} />
    );
  }

  // If we get here, it means there's no authenticated user, so show the login/signup page.
  return (
    <main className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full bg-gradient-animation z-0" />
      <div className="relative z-10 w-full flex justify-center p-4">
        {children}
      </div>
    </main>
  );
}
