
'use client';

import { useState, useMemo } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
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
import { Shield, Send, BellRing, Copy, Link, Image as ImageIcon, Trash2, Search } from 'lucide-react';
import { useAdmin } from '@/hooks/use-admin';
import { collection, doc, arrayRemove, updateDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { sendFcmNotification } from '@/ai/flows/send-fcm-notification';
import { Badge } from '@/components/ui/badge';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "@/components/ui/alert-dialog";
import { DeviceIdFetcher } from '@/components/device-id-fetcher';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function AdminPage() {
  const { isAdmin, isLoading: isAdminLoading } = useAdmin();
  const { user: currentUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const usersCollectionRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersCollectionRef);
  
  const adminRolesCollection = useMemoFirebase(() => collection(firestore, 'roles_admin'), [firestore]);
  const { data: adminRoles, isLoading: adminRolesLoading } = useCollection(adminRolesCollection);
  
  const adminUids = useMemo(() => new Set(adminRoles?.map(role => role.id) || []), [adminRoles]);

  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationBody, setNotificationBody] = useState('');
  const [notificationUrl, setNotificationUrl] = useState('');
  const [notificationImage, setNotificationImage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [tokenToDelete, setTokenToDelete] = useState<{userId: string, token: string, userName: string} | null>(null);
  const [isDeletingToken, setIsDeletingToken] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  const isLoading = isAdminLoading || usersLoading || adminRolesLoading;

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    if (!userSearchTerm) return users;

    const lowercasedTerm = userSearchTerm.toLowerCase();
    return users.filter(u => 
        (u.name || '').toLowerCase().includes(lowercasedTerm) || 
        (u.email || '').toLowerCase().includes(lowercasedTerm)
    );
  }, [users, userSearchTerm]);

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
        icon: '/logo192.png',
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

  const handleConfirmDeleteToken = async () => {
    if (!tokenToDelete || !firestore) return;

    setIsDeletingToken(true);
    const userDocRef = doc(firestore, 'users', tokenToDelete.userId);
    
    try {
      await updateDoc(userDocRef, {
        fcmTokens: arrayRemove(tokenToDelete.token)
      });

      toast({
          title: "Token Deleted",
          description: `The token has been removed from ${tokenToDelete.userName}'s profile.`,
      });
      setTokenToDelete(null);
    } catch (error) {
       console.error("Failed to delete token:", error);
       toast({
            variant: "destructive",
            title: "Deletion Failed",
            description: "Could not remove the token. Please check the console for errors or verify your admin permissions.",
       });
    } finally {
      setIsDeletingToken(false);
    }
  };

  const handleToggleAdminRole = async (targetUserId: string, newIsAdmin: boolean, targetUserName: string) => {
    if (!firestore || !currentUser || currentUser.uid === targetUserId) return;

    const roleDocRef = doc(firestore, 'roles_admin', targetUserId);
    try {
        if (newIsAdmin) {
            await setDoc(roleDocRef, { grantedAt: serverTimestamp() });
            toast({ title: "Admin Role Granted", description: `${targetUserName} is now an admin.` });
        } else {
            await deleteDoc(roleDocRef);
            toast({ title: "Admin Role Revoked", description: `${targetUserName} is no longer an admin.` });
        }
    } catch (error) {
        console.error("Error toggling admin role:", error);
        toast({ variant: "destructive", title: "Operation Failed", description: "Could not update admin role. See console for details." });
    }
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

      <AlertDialog open={!!tokenToDelete} onOpenChange={() => setTokenToDelete(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the selected FCM token for user <strong>{tokenToDelete?.userName}</strong>.
                <Badge variant="secondary" className="font-mono text-xs max-w-full truncate block mt-2 p-2">
                    {tokenToDelete?.token}
                </Badge>
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDeleteToken} className="bg-destructive hover:bg-destructive/90" disabled={isDeletingToken}>
                {isDeletingToken ? 'Deleting...' : 'Delete Token'}
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


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
                  <BellRing className="h-5 w-5"/>
                  Broadcast Push Notifications
                </CardTitle>
                <CardDescription>
                  Bhejein aise notifications jo user ke device par dikhein, **jab app band ho**. Iske liye neeche diye gaye 'FCM Tokens' ki zaroorat hoti hai.
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

            <DeviceIdFetcher />

            <Card>
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage users, their notification tokens, and roles.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative mb-6">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search users by name or email..."
                        className="pl-10"
                        value={userSearchTerm}
                        onChange={(e) => setUserSearchTerm(e.target.value)}
                    />
                </div>
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
                        <TableHead className="text-right">Admin</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers?.map(u => (
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
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => setTokenToDelete({ userId: u.id, token, userName: u.name })}>
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                );
                              }
                              return <span className="text-muted-foreground text-xs">No tokens</span>;
                            })()}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end space-x-2">
                                <Label htmlFor={`admin-switch-${u.id}`} className={cn("text-xs", currentUser?.uid === u.id && "text-muted-foreground")}>
                                    {adminUids.has(u.id) ? 'Admin' : 'User'}
                                </Label>
                                <Switch
                                    id={`admin-switch-${u.id}`}
                                    checked={adminUids.has(u.id)}
                                    onCheckedChange={(checked) => handleToggleAdminRole(u.id, checked, u.name)}
                                    disabled={currentUser?.uid === u.id}
                                    aria-label={`Toggle admin status for ${u.name}`}
                                />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {filteredUsers?.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">
                      <p>No users found{userSearchTerm ? ` for "${userSearchTerm}"` : ''}.</p>
                    </div>
                  )}
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
