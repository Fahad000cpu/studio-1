
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

  useEffect(() => {
    // This effect runs only on the client
    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPrompt(event);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const handleAppInstalled = () => {
      // After installation, clear the prompt to disable the button
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
    // Show the install prompt to the user
    await installPrompt.prompt();
  };
  
  // As per your request, the button is now permanently visible in the header.
  // It will be disabled with a loading spinner until the browser is ready for installation.
  // After installation, it will return to this disabled state on future visits.
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
