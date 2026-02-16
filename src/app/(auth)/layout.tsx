
"use client";

import { useEffect, useState } from "react";
import { useUser } from "@/firebase";
import { FullScreenLoader } from "@/components/full-screen-loader";
import { useRouter } from "next/navigation";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // This effect handles redirecting the user once they are authenticated.
    if (!isUserLoading && user) {
      router.replace("/discover");
    }
  }, [isUserLoading, user, router]);

  // If we are loading, or if the user is already authenticated, show the loader.
  // The second effect will handle the redirect. This prevents the login form from flashing.
  if (isUserLoading || user) {
     return <FullScreenLoader message="Authenticating your session..." />;
  }

  // Only render the children (login/signup page) if we are not loading and there is no user.
  return (
    <>
      <main className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden">
        <div className="absolute inset-0 w-full h-full bg-gradient-animation z-0" />
        <div className="relative z-10 w-full flex justify-center p-4">
          {children}
        </div>
      </main>
    </>
  );
}
