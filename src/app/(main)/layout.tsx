
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser, useFirestore, updateDocumentNonBlocking } from "@/firebase";
import { doc, arrayUnion } from 'firebase/firestore';
import { toast } from "@/hooks/use-toast";
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
import { Flame, Bell } from "lucide-react";
import Link from "next/link";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  useEffect(() => {
    // If auth state is confirmed and there is NO user, redirect them to the login page.
    if (!isUserLoading && !user) {
      router.push("/login");
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    // This will hold the unsubscribe function from the onTokenRefresh listener
    let unsubscribe = () => {};

    const setupFcmTokenListener = async () => {
      // Ensure this only runs on the client and when the user is logged in
      if (typeof window === 'undefined' || !user || !firestore) {
        return;
      }
      
      try {
        // NOTE: The onTokenRefresh listener logic has been temporarily disabled.
        // This is a workaround for a persistent Next.js build issue where the
        // onTokenRefresh function fails to import correctly, causing a runtime
        // crash. The core functionality of requesting and saving the initial
        // notification token remains active in other parts of the app.
        // This listener is for handling token refreshes that happen in the background.
        // ---
        // const messagingModule = await import('firebase/messaging');
        // const supported = await messagingModule.isSupported();
        // if (!supported) {
        //   console.log("Firebase Messaging is not supported in this browser.");
        //   return;
        // }
        // const messaging = messagingModule.getMessaging();
        // unsubscribe = messagingModule.onTokenRefresh(messaging, (newToken) => {
        //   console.log('FCM token refreshed:', newToken);
        //   toast({
        //     title: 'Notifications Updated',
        //     description: 'Your device token has been refreshed.',
        //   });
        //   const userDocRef = doc(firestore, 'users', user.uid);
        //   updateDocumentNonBlocking(userDocRef, {
        //     fcmTokens: arrayUnion(newToken),
        //   });
        // });
      } catch (error) {
        console.error("Error setting up FCM token refresh listener:", error);
      }
    };

    setupFcmTokenListener();
    
    // Cleanup the listener when the component unmounts
    return () => {
      unsubscribe();
    };
  }, [user, firestore]); // Rerun if user or firestore instance changes


  // While checking auth state, or if we have confirmed there is no user (and are about to redirect), show a loader.
  if (isUserLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 w-full h-full bg-gradient-animation z-0" />
        <div className="relative z-10 flex flex-col items-center gap-4">
           <Flame className="h-12 w-12 text-primary animate-pulse" />
           <p className="text-muted-foreground bg-background/80 px-4 py-2 rounded-md">Loading your sphere...</p>
        </div>
      </div>
    );
  }

  // If we have a user, render the main app layout.
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
              <div className="p-2 flex items-center justify-center group-data-[collapsible=icon]:hidden">
                <span className="text-xs text-muted-foreground">© 2024 ConnectSphere</span>
              </div>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset>
            <header className="flex h-14 items-center gap-4 border-b bg-card/30 backdrop-blur-sm px-4 lg:h-[60px] lg:px-6 sticky top-0 z-10">
              <SidebarTrigger className="md:hidden" />
              <div className="w-full flex-1">
                {/* Can add breadcrumbs or search here */}
              </div>
              <Button variant="ghost" size="icon" asChild>
                <Link href="https://pushall.ru/?fs=5965" target="_blank">
                  <Bell />
                  <span className="sr-only">Subscribe to PushAll</span>
                </Link>
              </Button>
              <ThemeToggle />
              <UserNav />
            </header>
            <main className="flex-1 p-4 md:p-6">
              {children}
            </main>
          </SidebarInset>
        </SidebarProvider>
      </div>
    </div>
  );
}
