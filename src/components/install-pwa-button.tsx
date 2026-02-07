
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, Loader2 } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
  } from "@/components/ui/tooltip"

export const InstallPwaButton = () => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(true); // Start as true to prevent flash

  useEffect(() => {
    // This effect runs once to check the initial state.
    if (typeof window !== 'undefined') {
        if (!window.matchMedia('(display-mode: standalone)').matches) {
            setIsAppInstalled(false); // Only show button if not installed
        }
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      return;
    }
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      console.log('User accepted the PWA installation prompt');
      setIsAppInstalled(true); // Hide the button after installation
    } else {
      console.log('User dismissed the PWA installation prompt');
    }
    setInstallPrompt(null);
  };
  
  // Don't render the button if the app is already installed
  if (isAppInstalled) {
    return null;
  }

  return (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                {/* The button is disabled with a loading spinner if the prompt isn't ready */}
                <Button variant="ghost" size="icon" onClick={handleInstallClick} disabled={!installPrompt}>
                    {installPrompt ? <Download className="h-5 w-5" /> : <Loader2 className="h-5 w-5 animate-spin" />}
                    <span className="sr-only">Install App</span>
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>{installPrompt ? 'Install App' : 'Preparing install...'}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
  );
};
