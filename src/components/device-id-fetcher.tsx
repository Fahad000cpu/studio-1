
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Info, Loader2, RefreshCw, Copy, CheckCircle, XCircle, BellRing } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getApp } from 'firebase/app';
import { getInstallations, getId } from 'firebase/installations';
import { cn } from '@/lib/utils';


export function DeviceIdFetcher() {
  const { toast } = useToast();
  const [installationId, setInstallationId] = useState('');
  const [isFetchingId, setIsFetchingId] = useState(true); // Start fetching on mount

  const [isInitializingIam, setIsInitializingIam] = useState(false);
  const [iamStatus, setIamStatus] = useState<'idle' | 'success' | 'error'>('idle');


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
  
  const handleInitializeIam = async () => {
    setIsInitializingIam(true);
    setIamStatus('idle');
    try {
        // Dynamically import to avoid server-side build errors by splitting the string.
        const { getInAppMessaging } = await import('firebase/in-app' + '-messaging');
        const app = getApp();
        getInAppMessaging(app); // This initializes the SDK
        setIamStatus('success');
        toast({
            title: 'In-App Messaging Initialized!',
            description: 'The app is now ready to receive and display In-App Messages.',
        });
    } catch (error: any) {
        console.error('Failed to initialize In-App Messaging:', error);
        setIamStatus('error');
        toast({
            variant: 'destructive',
            title: 'Initialization Failed',
            description: 'Could not start In-App Messaging. Check the browser console for more details.',
            duration: 10000,
        });
    } finally {
        setIsInitializingIam(false);
    }
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
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <Label htmlFor="installationId">Your In-App Messaging Installation ID</Label>
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
                    Use this ID in the Firebase Console to send a test message to this specific device.
                </p>
            </div>
            
            <div className="space-y-3">
                 <Label>In-App Messaging Service</Label>
                 <div className={cn(
                    "flex items-center justify-between rounded-lg border p-3",
                    iamStatus === 'success' && "border-green-500/50 bg-green-500/10",
                    iamStatus === 'error' && "border-destructive/50 bg-destructive/10",
                 )}>
                    <div className="flex items-center gap-3">
                         {iamStatus === 'success' && <CheckCircle className="h-5 w-5 text-green-600" />}
                         {iamStatus === 'error' && <XCircle className="h-5 w-5 text-destructive" />}
                         {iamStatus === 'idle' && <BellRing className="h-5 w-5 text-muted-foreground" />}
                        <div>
                             <p className="text-sm font-medium">
                                {iamStatus === 'success' ? 'Service Active' : (iamStatus === 'error' ? 'Service Failed' : 'Service Inactive')}
                             </p>
                              <p className="text-xs text-muted-foreground">
                                {iamStatus === 'success' ? 'Ready to receive messages.' : (iamStatus === 'error' ? 'Check console for errors.' : 'Click to initialize the service.')}
                              </p>
                        </div>
                    </div>
                     <Button onClick={handleInitializeIam} disabled={isInitializingIam || iamStatus === 'success'}>
                        {isInitializingIam ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellRing className="mr-2 h-4 w-4" />}
                        {iamStatus === 'success' ? 'Initialized' : 'Initialize'}
                    </Button>
                 </div>
                 <p className="text-xs text-muted-foreground pt-1">
                   Step 1: Click "Initialize". Step 2: Send a test message from Firebase. Step 3: Reload or re-open the app to trigger the message.
                </p>
            </div>
        </CardContent>
    </Card>
  );
}
