
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Info, Loader2, RefreshCw, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getApp } from 'firebase/app';
import { getInstallations, getId } from 'firebase/installations';

export function DeviceIdFetcher() {
  const { toast } = useToast();
  const [installationId, setInstallationId] = useState('');
  const [isFetchingId, setIsFetchingId] = useState(true); // Start fetching on mount

  const handleFetchId = async () => {
    setIsFetchingId(true);
    setInstallationId(''); // Clear previous ID
    try {
        const app = getApp();
        const installations = getInstallations(app);
        const fid = await getId(installations);

        setInstallationId(fid);
        if(!isFetchingId) { // Avoid toast on initial load
          toast({
              title: 'Device ID Fetched!',
              description: 'The ID has been retrieved and displayed below.',
          });
        }

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

  useEffect(() => {
    handleFetchId();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
                Use this ID to test features like In-App Messaging from the Firebase Console.
            </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="installationId">Your Firebase Installation ID</Label>
                <div className="flex items-center gap-2">
                    <Input id="installationId" readOnly value={installationId || "Fetching..."} disabled={isFetchingId} className="font-mono"/>
                    <Button variant="outline" size="icon" onClick={handleCopyId} disabled={!installationId}>
                        <Copy className="h-4 w-4"/>
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleFetchId} disabled={isFetchingId}>
                        {isFetchingId ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                </div>
                 <p className="text-xs text-muted-foreground pt-1">
                    This ID is unique to your browser. The In-App Messaging SDK could not be initialized in this environment, but you can still use this ID for targeting.
                </p>
            </div>
        </CardContent>
    </Card>
  );
}
