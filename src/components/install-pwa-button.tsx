
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
  const [isInstalled, setIsInstalled] = useState(true); // Assume installed to prevent flash on SSR

  useEffect(() => {
    // This effect runs only on the client.
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(isStandalone);

    if (isStandalone) {
      return; // No need for further listeners if already installed
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // This event fires after the user accepts the installation prompt
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) {
      return;
    }
    await installPrompt.prompt();
    // The 'appinstalled' event will handle hiding the button after success
  };
  
  if (isInstalled) {
    return null; // Don't render anything if the app is installed or on the server
  }

  // If not installed, always render the button. Its state will be managed by `installPrompt`.
  return (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
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
