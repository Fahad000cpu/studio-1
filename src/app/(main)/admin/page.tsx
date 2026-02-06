
'use client';

import { useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Shield, Send, BellRing, Info, Copy, Link, Image as ImageIcon, Smartphone } from 'lucide-react';
import { useAdmin } from '@/hooks/use-admin';
import { collection } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { sendFcmNotification } from '@/ai/flows/send-fcm-notification';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function AdminPage() {
  const { isAdmin, isLoading: isAdminLoading } = useAdmin();
  const firestore = useFirestore();
  const { toast } = useToast();

  const usersCollectionRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersCollectionRef);

  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationBody, setNotificationBody] = useState('');
  const [notificationUrl, setNotificationUrl] = useState('');
  const [notificationImage, setNotificationImage] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const isLoading = isAdminLoading || usersLoading;

  const handleSendNotification = async () => {
    if (!notificationTitle || !notificationBody) {
      toast({
        variant: 'destructive',
        title: 'Missing fields',
        description: 'Please enter a title and body for the notification.',
      });
      return;
    }
    if (!users || users.length === 0) {
      toast({
        variant: 'destructive',
        title: 'No users',
        description: 'There are no users to send notifications to.',
      });
      return;
    }

    setIsSending(true);
    try {
      const allTokens = users.flatMap(u => u.fcmTokens || []).filter(Boolean);
      const uniqueTokens = [...new Set(allTokens)];

      if (uniqueTokens.length === 0) {
          toast({
            variant: "destructive",
            title: "No Push Tokens Found",
            description: "No users have registered for push notifications.",
          });
          setIsSending(false);
          return;
      }

      await sendFcmNotification({
        tokens: uniqueTokens,
        title: notificationTitle,
        body: notificationBody,
        icon: '/logo.svg',
        url: notificationUrl || '/discover',
        image: notificationImage,
      });

      toast({
        title: 'Push Notification Sent',
        description: 'The notification has been broadcast to all users with valid tokens.',
      });
      setNotificationTitle('');
      setNotificationBody('');
      setNotificationUrl('');
      setNotificationImage('');
    } catch (error) {
      console.error('Failed to send notification', error);
      toast({
        variant: 'destructive',
        title: 'Send Failed',
        description: 'An error occurred while sending the push notification.',
      });
    } finally {
      setIsSending(false);
    }
  };
  
  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token);
    toast({
        title: "Token Copied",
        description: "The FCM token has been copied to your clipboard.",
    });
  };


  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Admin Controls
        </h1>
        <p className="text-muted-foreground">
          Manage application settings, users, and messaging.
        </p>
      </div>
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle>Administrator Role</CardTitle>
            <CardDescription>
              This section shows your current administrator status. Admins can access special features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAdminLoading ? (
              <p className="text-muted-foreground">Checking your admin status...</p>
            ) : isAdmin ? (
              <div className="flex items-center gap-2 text-green-600">
                  <Shield className="h-5 w-5" />
                  <p className='font-medium'>You are an administrator.</p>
              </div>
            ) : (
              <p className="text-muted-foreground">You are not an administrator. Admin rights must be granted manually via the Firestore console.</p>
            )}
          </CardContent>
        </Card>

        {isAdmin && (
          <>
             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Smartphone className="h-5 w-5"/>
                        In-App Messaging (Pop-ups & Banners)
                    </CardTitle>
                    <CardDescription>
                       Bhejein aise messages jo users ko **app ke andar** dikhein, jab woh app use kar rahe hon.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Kaise Kaam Karta Hai?</AlertTitle>
                        <AlertDescription>
                            <p>In-App messages Firebase Console se control hote hain. Testing ke liye aapko device ka **Installation ID** chahiye hoga, jo aapke browser ke Developer Console (F12) mein dikhega.</p>
                        </AlertDescription>
                    </Alert>
                    
                    <div className="pt-2">
                        <h4 className="font-semibold text-md mb-2">Isko Kab Use Karein? (Example Ideas)</h4>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            <li><b>Naye Features Promote Karna:</b> "Dekhiye hamara naya Status feature!"</li>
                            <li><b>Special Offers Dena:</b> "Affiliate products par is hafte 20% ki chhoot!"</li>
                            <li><b>Users ko Guide Karna:</b> "Welcome! Yahan se aap naye dost dhoondh sakte hain."</li>
                            <li><b>Announcements Karna:</b> "ConnectSphere ka naya version aa gaya hai!"</li>
                        </ul>
                    </div>
                </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BellRing className="h-5 w-5"/>
                  Broadcast Push Notifications
                </CardTitle>
                <CardDescription>
                  Bhejein aise notifications jo user ke device par dikhein, **jab app band ho**. Iske liye FCM Push Tokens ki zaroorat hoti hai.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  placeholder="Notification Title"
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  disabled={isSending}
                />
                <Textarea
                  placeholder="Notification Body"
                  value={notificationBody}
                  onChange={(e) => setNotificationBody(e.target.value)}
                  disabled={isSending}
                />
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Optional: Notification URL (e.g., /products)"
                    className="pl-10"
                    value={notificationUrl}
                    onChange={(e) => setNotificationUrl(e.target.value)}
                    disabled={isSending}
                  />
                </div>
                 <div className="relative">
                  <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Optional: Notification Image URL"
                    className="pl-10"
                    value={notificationImage}
                    onChange={(e) => setNotificationImage(e.target.value)}
                    disabled={isSending}
                  />
                </div>
                <Button onClick={handleSendNotification} disabled={isSending}>
                  <Send className="mr-2 h-4 w-4" />
                  {isSending ? 'Sending...' : 'Send Push Notification'}
                </Button>
              </CardContent>
            </Card>
            
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>How Push Tokens Work</AlertTitle>
              <AlertDescription>
                FCM tokens for Push Notifications will only appear below after users have gone to the <strong>Settings</strong> page and enabled them.
              </AlertDescription>
            </Alert>


            <Card>
              <CardHeader>
                <CardTitle>User Push Notification Tokens (FCM)</CardTitle>
                <CardDescription>
                  List of users and their registered Firebase Cloud Messaging (FCM) tokens for Push Notifications.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground">Loading user data...</p>
                ) : (
                 <div className="w-full overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>FCM Tokens</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users?.map(u => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.name}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>
                            {(() => {
                              const validTokens = u.fcmTokens?.filter(Boolean) ?? [];
                              const uniqueValidTokens = [...new Set(validTokens)];
                              if (uniqueValidTokens.length > 0) {
                                return (
                                  <div className="flex flex-col gap-2">
                                    {uniqueValidTokens.map((token, i) => (
                                      <div key={i} className="flex items-center gap-2">
                                        <Badge variant="secondary" className="font-mono text-xs max-w-xs truncate">
                                            {token}
                                        </Badge>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleCopyToken(token)}>
                                            <Copy className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                );
                              }
                              return <span className="text-muted-foreground text-xs">No tokens</span>;
                            })()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
