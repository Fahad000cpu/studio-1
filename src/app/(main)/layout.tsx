
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/firebase";
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

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    // If auth state is confirmed and there is NO user, redirect them to the login page.
    if (!isUserLoading && !user) {
      router.push("/login");
    }
  }, [user, isUserLoading, router]);

  // The service worker (sw.js) now handles all push notifications,
  // ensuring a consistent experience whether the app is in the foreground or background.

  // If we are checking auth, or if there's no user and we are about to redirect, show a loader.
  if (isUserLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen relative overflow-hidden">
        <div className="absolute inset-0 w-full h-full bg-gradient-animation z-0" />
        <div className="relative z-10 flex flex-col items-center gap-4">
           <Flame className="h-12 w-12 text-primary animate-pulse" />
           <p className="text-muted-foreground bg-background/80 px-4 py-2 rounded-md">
             {isUserLoading ? "Loading your sphere..." : "Redirecting..."}
           </p>
        </div>
      </div>
    );
  }

  // Otherwise, we are done loading and have a user, render the main app layout.
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
