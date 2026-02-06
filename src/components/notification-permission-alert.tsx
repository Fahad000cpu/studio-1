'use client';

import { useFirebase } from '@/firebase';
import { requestPermission } from '@/firebase/messaging';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bell, BellRing, Loader2 } from 'lucide-react';
import { useNotificationStatus } from '@/hooks/use-notification-status';
import { cn } from '@/lib/utils';


export function NotificationPermissionAlert({ className }: { className?: string }) {
  const { user, firestore } = useFirebase();
  const { toast } = useToast();
  const { 
      isSupported, 
      permissionGranted, 
      tokenInFirestore, 
      isLoading,
      permission,
      serviceWorkerActive,
  } = useNotificationStatus();

  const handleEnableNotifications = async () => {
    if (!user || !firestore) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Cannot enable notifications right now. Please try again later.",
        });
        return;
    }
    await requestPermission(firestore, user);
  };
  
  if (isLoading.auth || isLoading.profile || isLoading.serviceWorker) {
     return (
        <Alert className={cn("flex items-center gap-2", className)}>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Checking notification status...</AlertDescription>
        </Alert>
    );
  }

  // Don't show if not supported or if everything is perfectly set up
  if (!isSupported || (permissionGranted && tokenInFirestore && serviceWorkerActive)) {
    return null;
  }

  let title = "Enable Push Notifications";
  let description = "Receive broadcast messages and updates from the admin by enabling notifications.";
  let showButton = true;
  let buttonText = "Allow Notifications";

  if (permission === 'denied') {
    title = 'Push Notifications Blocked';
    description = 'To receive important updates, you must enable notifications in your browser settings.';
    showButton = false;
  } else if (permissionGranted && (!tokenInFirestore || !serviceWorkerActive)) {
    title = 'Action Required';
    description = "Your notification setup is incomplete. Click to finalize.";
    showButton = true;
    buttonText = "Retry Setup";
  }

  return (
    <Alert variant={permission === 'denied' ? 'destructive' : 'default'} className={cn(className)}>
        <BellRing className="h-4 w-4" />
        <AlertTitle>{title}</AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <span>{description}</span>
            {showButton && (
                <Button onClick={handleEnableNotifications} size="sm" className="whitespace-nowrap mt-2 sm:mt-0">
                    <Bell className="mr-2 h-4 w-4" />
                    {buttonText}
                </Button>
            )}
        </AlertDescription>
    </Alert>
  );
}
