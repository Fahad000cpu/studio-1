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
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPrompt(event);
    };

    const handleAppInstalled = () => {
      // Hide the install button
      setInstallPrompt(null);
      setIsAppInstalled(true);
    };

    // Check if the app is already installed
    if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
      return; // No need to add listeners if already installed
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      // This should not happen if button is disabled, but as a fallback.
      return;
    }
    
    // Show the install prompt
    await installPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the PWA installation prompt');
    } else {
      console.log('User dismissed the PWA installation prompt');
    }

    // We can only use the prompt once. Clear it.
    setInstallPrompt(null);
  };

  // If the app is installed, don't show the banner
  if (isAppInstalled) {
    return null;
  }

  return (
    <Alert className="mb-8 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/20">
        <Rocket className="h-4 w-4" />
        <AlertTitle className="font-bold font-headline">Get the Full Experience!</AlertTitle>
        <AlertDescription className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <span>Install ConnectSphere on your device for faster access and a better experience.</span>
            <Button 
                onClick={handleInstallClick} 
                size="sm" 
                className="w-full sm:w-auto flex-shrink-0" 
                disabled={!installPrompt}
            >
                <Download className="mr-2 h-4 w-4" />
                {installPrompt ? 'Install App' : 'Ready to Install...'}
            </Button>
        </AlertDescription>
    </Alert>
  );
};
