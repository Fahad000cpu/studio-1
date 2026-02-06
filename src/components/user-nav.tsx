
"use client";

import { LogOut, Settings, User } from "lucide-react";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { doc, updateDoc, arrayRemove } from 'firebase/firestore';

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
  const firestore = useFirestore();
  const { user } = useUser();
  const router = useRouter();

  const handleLogout = async () => {
    if (user) {
      try {
        const supported = await isSupported();
        if (supported) {
          const messaging = getMessaging();
          const currentToken = await getToken(messaging);
          if (currentToken) {
            // Remove this device's token from the logged-out user's profile
            const userDocRef = doc(firestore, 'users', user.uid);
            await updateDoc(userDocRef, {
              fcmTokens: arrayRemove(currentToken)
            });
          }
        }
      } catch (error) {
        console.error('Error removing FCM token from user profile on logout:', error);
        // Do not block logout if this fails, just log it.
      }
    }

    await signOut(auth);
    router.push("/");
  };

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage key={user.photoURL} src={user.photoURL ?? `https://picsum.photos/seed/${user.uid}/200`} alt={user.displayName ?? ""} />
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
            <User className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </DropdownMenuItem>
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
