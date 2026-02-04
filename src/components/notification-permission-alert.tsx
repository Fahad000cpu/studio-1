'use client';

import { useFirebase, requestPermission } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Bell, BellRing } from 'lucide-react';
import { useNotificationPermission } from '@/hooks/use-notification-permission';
import { cn } from '@/lib/utils';

export function NotificationPermissionAlert({ className }: { className?: string }) {
  const { user, firestore } = useFirebase();
  const { toast } = useToast();
  const { permission: notificationPermission, isSupported } = useNotificationPermission();

  const handleEnableNotifications = async () => {
    if (!user || !firestore) {
        toast({
            variant: "destructive",
            title: "Error",
            description: "Cannot enable notifications right now. Please try again later.",
        });
        return;
    }

    if (notificationPermission === 'prompt') {
        const token = await requestPermission(firestore, user.uid);
        if (token) {
            toast({
                title: "Notifications Enabled!",
                description: "You'll now receive broadcast messages from the admin.",
            });
        }
    }
  };
  
  if (!isSupported || notificationPermission === 'granted') {
    return null;
  }

  return (
    <Alert variant={notificationPermission === 'denied' ? 'destructive' : 'default'} className={cn(className)}>
        <BellRing className="h-4 w-4" />
        <AlertTitle>
            {notificationPermission === 'denied'
                ? 'Push Notifications Blocked'
                : 'Enable Push Notifications'}
        </AlertTitle>
        <AlertDescription className="flex items-center justify-between gap-4">
            <span>
              {notificationPermission === 'denied'
                  ? 'To receive important updates, you must enable them in your browser settings.'
                  : 'Receive broadcast messages and updates from the admin by enabling notifications.'}
            </span>
            {notificationPermission === 'prompt' && (
                <Button onClick={handleEnableNotifications} size="sm" className="whitespace-nowrap">
                    <Bell className="mr-2 h-4 w-4" />
                    Allow Notifications
                </Button>
            )}
        </AlertDescription>
    </Alert>
  );
}
