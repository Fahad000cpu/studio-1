
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
    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent the default mini-infobar from appearing on mobile
      event.preventDefault();
      // Stash the event so it can be triggered later by our button.
      setInstallPrompt(event);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

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
    installPrompt.prompt();
  };
  
  // Only render the button if the installation prompt is available.
  if (!installPrompt) {
    return null;
  }

  return (
    <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    variant="default"
                    size="icon"
                    onClick={handleInstallClick}
                    className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-accent text-accent-foreground hover:bg-accent/90 z-50"
                >
                    <Download className="h-6 w-6" />
                    <span className="sr-only">Install App</span>
                </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
                <p>Install ConnectSphere</p>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
  );
};
