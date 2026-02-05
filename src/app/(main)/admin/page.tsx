
'use client';

import { useState, useEffect } from 'react';
import { useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
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
import { Shield, Send, BellRing, Info } from 'lucide-react';
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
      // Flatten all tokens from all users into a single array, filtering out undefined/null tokens
      const allTokens = users.flatMap(u => u.fcmTokens || []).filter(Boolean);
      const uniqueTokens = [...new Set(allTokens)];

      if (uniqueTokens.length === 0) {
          toast({
            variant: "destructive",
            title: "No FCM Tokens",
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
        image: '/logo.svg',
      });

      toast({
        title: 'Notification Sent',
        description: 'The notification has been sent to all registered users.',
      });
      setNotificationTitle('');
      setNotificationBody('');
    } catch (error) {
      console.error('Failed to send notification', error);
      toast({
        variant: 'destructive',
        title: 'Send Failed',
        description: 'An error occurred while sending the notification.',
      });
    } finally {
      setIsSending(false);
    }
  };


  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold font-headline tracking-tight">
          Admin Controls
        </h1>
        <p className="text-muted-foreground">
          Use this page to manage application settings and users.
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
             <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>How FCM Tokens Work</AlertTitle>
              <AlertDescription>
                FCM tokens will only appear for users after they have gone to the <strong>Settings</strong> page and enabled Push Notifications.
              </AlertDescription>
            </Alert>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BellRing className="h-5 w-5"/>
                  Send Broadcast Notification
                </CardTitle>
                <CardDescription>
                  Send a push notification to all users who have enabled them.
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
                <Button onClick={handleSendNotification} disabled={isSending}>
                  <Send className="mr-2 h-4 w-4" />
                  {isSending ? 'Sending...' : 'Send Notification'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>User FCM Tokens</CardTitle>
                <CardDescription>
                  List of users and their registered Firebase Cloud Messaging tokens.
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
                                  <div className="flex flex-col gap-1">
                                    {uniqueValidTokens.map((token, i) => (
                                      <Badge key={i} variant="secondary" className="font-mono text-xs max-w-xs truncate">
                                        {token}
                                      </Badge>
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
