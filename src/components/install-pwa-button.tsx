
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
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
      // Prevent the default mini-infobar from appearing on mobile
      event.preventDefault();
      // Stash the event so it can be triggered later by our button.
      setInstallPrompt(event);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // After the app is installed, the browser will not fire the 'beforeinstallprompt' event again.
    // We can listen for the 'appinstalled' event to clear our prompt state.
    const handleAppInstalled = () => {
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
    // Show the browser's installation prompt.
    await installPrompt.prompt();
  };

  // The button is always rendered permanently in the header. 
  // It is only enabled (clickable) when the browser is ready for installation.
  return (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" onClick={handleInstallClick} disabled={!installPrompt}>
                    <Download className="h-5 w-5" />
                    <span className="sr-only">Install App</span>
                </Button>
            </TooltipTrigger>
            <TooltipContent>
                <p>{installPrompt ? 'Install App' : 'Installation not available'}</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
  );
};
