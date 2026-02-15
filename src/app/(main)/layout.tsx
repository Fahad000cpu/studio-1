"use client";

import { useUser, useFirestore, updateDocumentNonBlocking } from "@/firebase";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import Link from 'next/link';
import { doc } from 'firebase/firestore';
import { MainNav } from "@/components/main-nav";
import { UserNav } from "@/components/user-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Flame } from "lucide-react";
import { InstallPwaButton } from "@/components/install-pwa-button";
import { FullScreenLoader } from "@/components/full-screen-loader";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const firestore = useFirestore();

  const publicPaths = ['/terms-of-service', '/privacy-policy'];
  const isPublicPath = publicPaths.includes(pathname);

  useEffect(() => {
    // If it's a public path, we don't need to do any auth checks.
    if (isPublicPath) {
      return;
    }
    
    // For protected paths, redirect if auth is resolved and there's no user.
    if (!isUserLoading && !user) {
      router.replace("/login");
    }
  }, [isUserLoading, user, router, isPublicPath]);

  useEffect(() => {
    if (!user || !firestore) return;

    const userRef = doc(firestore, 'users', user.uid);
    let intervalId: NodeJS.Timeout;

    const updatePresence = () => {
      // Use non-blocking update for a smoother user experience
      updateDocumentNonBlocking(userRef, {
        lastActive: new Date(),
      });
    };

    // Update immediately when layout mounts and user is available
    updatePresence();

    // Set up an interval to update presence periodically (e.g., every 60 seconds)
    intervalId = setInterval(updatePresence, 60 * 1000);

    // Update presence when the tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Clean up on component unmount
    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, firestore]);

  // If we are on a protected path and the auth state is loading or there's no user, show a loader.
  // The useEffect above will handle the redirection.
  // Don't show a loader for public paths.
  if (!isPublicPath && (isUserLoading || !user)) {
    return <FullScreenLoader message="Loading your sphere..." />;
  }

  // If we get here, the user is authenticated OR it's a public path, so render the app.
  return (
      <div className="relative min-h-screen">
      <div className="absolute inset-0 w-full h-full bg-gradient-animation z-0" />
      <div className="relative z-10">
          <SidebarProvider>
          <Sidebar>
              <SidebarHeader className="p-4">
              <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-10 w-10 text-primary">
                  <Flame className="h-6 w-6" />
                  </Button>
                  <h1 className="text-xl font-headline font-bold text-sidebar-foreground group-data-[collapsible=icon]:hidden">
                  ConnectSphere
                  </h1>
              </div>
              </SidebarHeader>
              <SidebarContent>
              <MainNav />
              </SidebarContent>
              <SidebarFooter>
                <Separator className="my-2" />
                <div className="p-2 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                  <span>© 2024 ConnectSphere</span>
                  <div className="flex items-center gap-2">
                    <Link href="/terms-of-service" className="underline-offset-4 hover:underline hover:text-foreground">Terms</Link>
                    <Separator orientation="vertical" className="h-4 bg-muted-foreground/50" />
                    <Link href="/privacy-policy" className="underline-offset-4 hover:underline hover:text-foreground">Privacy</Link>
                  </div>
                </div>
              </SidebarFooter>
          </Sidebar>
          <SidebarInset>
              <header className="flex h-14 items-center gap-4 border-b bg-card/30 backdrop-blur-sm px-4 lg:h-[60px] lg:px-6 sticky top-0 z-10">
              <SidebarTrigger className="md:hidden" />
              <div className="w-full flex-1">
                  {/* Can add breadcrumbs or search here */}
              </div>
              <ThemeToggle />
              <UserNav />
              </header>
              <main className="flex-1">
              {children}
              </main>
              <InstallPwaButton />
          </SidebarInset>
          </SidebarProvider>
      </div>
      </div>
  );
}
