
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
import { InstallPwaButton } from "@/components/install-pwa-button";
import { FullScreenLoader } from "@/components/full-screen-loader";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  // If we are still checking for a user, or if there is no user
  // and we are about to redirect, show a full-screen loader.
  // The redirection itself is handled by the useUser hook.
  if (isUserLoading || !user) {
    return (
      <FullScreenLoader message={isUserLoading ? "Loading your sphere..." : "Redirecting..."} />
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
              <InstallPwaButton />
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
