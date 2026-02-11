
"use client";

import { LogOut, Settings } from "lucide-react";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { doc, updateDoc, arrayRemove } from "firebase/firestore";
import { getApp } from "firebase/app";

import { useAuth, useUser, useFirestore } from "@/firebase";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials } from "@/lib/utils";

export function UserNav() {
  const auth = useAuth();
  const { user } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Check if user and service worker are available
      if (user && firestore && typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        const swRegistration = await navigator.serviceWorker.ready;
        
        // Dynamically import messaging functions to avoid issues on server
        const { getMessaging, getToken, isSupported } = await import("firebase/messaging");
        const supported = await isSupported();

        if (supported) {
            const app = getApp();
            const messaging = getMessaging(app);

            // Attempt to get the current token
            const currentToken = await getToken(messaging, {
              serviceWorkerRegistration: swRegistration,
            }).catch(() => null); // Return null if it fails

            if (currentToken) {
              const userDocRef = doc(firestore, 'users', user.uid);
              // Fire-and-forget the update. No need to await.
              // This makes logout feel faster and prevents it from failing if the DB update has an issue.
              updateDoc(userDocRef, {
                fcmTokens: arrayRemove(currentToken),
              }).catch((err) => {
                console.error('Failed to remove FCM token on logout:', err);
              });
            }
        }
      }
    } catch (error) {
      console.error('Error during FCM token removal on logout:', error);
    } finally {
      // Always sign out the user, regardless of whether token removal succeeded
      await signOut(auth);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage key={user.photoURL} src={user.photoURL ?? ''} alt={user.displayName ?? ""} />
            <AvatarFallback>{getInitials(user.displayName)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user.displayName || 'User'}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {user.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => router.push('/settings')}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
