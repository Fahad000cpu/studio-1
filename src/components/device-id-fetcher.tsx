
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Info, Loader2, RefreshCw, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function DeviceIdFetcher() {
  const { toast } = useToast();
  const [installationId, setInstallationId] = useState('');
  const [isFetchingId, setIsFetchingId] = useState(false);

  const handleFetchId = async () => {
    setIsFetchingId(true);
    setInstallationId(''); // Clear previous ID
    try {
        // Dynamically import to ensure client-side execution
        const { getApp } = await import('firebase/app');
        
        // This trick prevents Next.js from trying to bundle the client-only module on the server.
        const path = ['firebase', 'in-app-messaging'].join('/');
        const { getInAppMessaging, getInstallationId } = await import(path);
        
        const app = getApp();
        const inAppMessaging = getInAppMessaging(app);
        const fid = await getInstallationId(inAppMessaging);

        setInstallationId(fid);
        toast({
            title: 'Installation ID Fetched!',
            description: 'The ID has been retrieved and displayed below.',
        });

    } catch (error: any) {
        console.error('Failed to fetch Firebase Installation ID:', error);
        toast({
            variant: 'destructive',
            title: 'Fetch Failed',
            description: 'Could not get the Installation ID. Check console for errors.',
        });
    } finally {
        setIsFetchingId(false);
    }
  };

  const handleCopyId = () => {
    if (!installationId) return;
    navigator.clipboard.writeText(installationId);
    toast({ title: 'Installation ID Copied!' });
  };

  return (
    <Card className="bg-card/80 backdrop-blur-sm">
        <CardHeader>
            <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5"/>
                Device & Testing Information
            </CardTitle>
            <CardDescription>
                Use this information to test features like In-App Messaging for your specific device.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <Button onClick={handleFetchId} disabled={isFetchingId}>
                {isFetchingId ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Fetching ID...
                    </>
                ) : (
                    <>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Fetch Device ID
                    </>
                )}
            </Button>
            {installationId && (
                <div className="space-y-2">
                    <Label htmlFor="installationId">Your In-App Messaging Installation ID</Label>
                    <div className="flex items-center gap-2">
                        <Input id="installationId" readOnly value={installationId} className="font-mono"/>
                        <Button variant="outline" size="icon" onClick={handleCopyId}>
                            <Copy className="h-4 w-4"/>
                        </Button>
                    </div>
                </div>
            )}
            <p className="text-xs text-muted-foreground pt-2">
                Click the button to get the unique ID for this browser. To test an In-App Message, go to the Firebase Console, navigate to In-App Messaging, start a campaign, and use this ID on the "Test on device" screen.
            </p>
        </CardContent>
    </Card>
  );
}
