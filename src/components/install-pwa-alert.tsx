'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Rocket } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const InstallPwaAlert = () => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsAppInstalled(true);
    };

    // Check if running in standalone mode (already installed)
    if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
      return;
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    
    await installPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await installPrompt.userChoice;
    
    // We can handle the outcome if needed (e.g., for analytics)
    if (outcome === 'accepted') {
      // The 'appinstalled' event will hide the button.
      console.log('User accepted the A2HS prompt');
    } else {
      console.log('User dismissed the A2HS prompt');
    }
    // We can only use the prompt once. Clear it regardless.
    setInstallPrompt(null);
  };

  if (!installPrompt || isAppInstalled) {
    return null;
  }

  return (
    <Alert className="mb-8 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/20">
        <Rocket className="h-4 w-4" />
        <AlertTitle className="font-bold font-headline">Get the Full Experience!</AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <span>Install ConnectSphere on your device for faster access and a better experience.</span>
            <Button onClick={handleInstallClick} size="sm" className="w-full sm:w-auto flex-shrink-0">
                <Download className="mr-2 h-4 w-4" />
                Install App
            </Button>
        </AlertDescription>
    </Alert>
  );
};
