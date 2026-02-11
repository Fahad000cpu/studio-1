
'use client';

import { useState, useRef } from 'react';
import type { ChatGroup, UserProfile } from '@/types';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, deleteDoc, arrayRemove } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { getInitials } from '@/lib/utils';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetDescription } from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Users, Camera, Edit, LogOut, Trash2, Shield, Loader2 } from 'lucide-react';

interface GroupInfoSheetProps {
    group: ChatGroup;
    allUsersMap: Map<string, UserProfile>;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onGroupDeleted: () => void; // To reset chat view after deletion/exit
}

export function GroupInfoSheet({ group, allUsersMap, open, onOpenChange, onGroupDeleted }: GroupInfoSheetProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [isEditing, setIsEditing] = useState(false);
    const [groupName, setGroupName] = useState(group.name);
    const [isSaving, setIsSaving] = useState(false);
    const [showConfirm, setShowConfirm] = useState<'exit' | 'delete' | null>(null);

    const isCreator = user?.uid === group.creatorId;

    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setIsSaving(true);
            try {
                const photoUrl = await uploadToCloudinary(file);
                const groupRef = doc(firestore, 'groups', group.id);
                await updateDoc(groupRef, { groupPhotoUrl: photoUrl });
                toast({ title: 'Group photo updated!' });
            } catch (error) {
                console.error('Failed to upload group photo:', error);
                toast({ variant: 'destructive', title: 'Upload Failed', description: 'Could not update the group photo.' });
            } finally {
                setIsSaving(false);
            }
        }
    };
    
    const handleNameSave = async () => {
        if (!groupName.trim() || groupName.trim() === group.name) {
            setIsEditing(false);
            return;
        }
        setIsSaving(true);
        try {
            const groupRef = doc(firestore, 'groups', group.id);
            await updateDoc(groupRef, { name: groupName.trim() });
            toast({ title: 'Group name updated!' });
            setIsEditing(false);
        } catch (error) {
            console.error('Failed to update group name:', error);
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not update the group name.' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleExitGroup = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const groupRef = doc(firestore, 'groups', group.id);
            await updateDoc(groupRef, { memberIds: arrayRemove(user.uid) });
            toast({ title: 'You have left the group.' });
            onGroupDeleted(); // Use the same callback to reset the view
        } catch (error) {
            console.error('Failed to exit group:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not leave the group.' });
        } finally {
            setIsSaving(false);
            setShowConfirm(null);
            onOpenChange(false);
        }
    };

    const handleDeleteGroup = async () => {
        if (!isCreator) return;
        setIsSaving(true);
        try {
            const groupRef = doc(firestore, 'groups', group.id);
            await deleteDoc(groupRef);
            toast({ title: 'Group Deleted', description: `The group "${group.name}" has been permanently deleted.` });
            onGroupDeleted();
        } catch (error) {
            console.error('Failed to delete group:', error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the group.' });
        } finally {
            setIsSaving(false);
            setShowConfirm(null);
            onOpenChange(false);
        }
    }

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="flex flex-col">
                    <SheetHeader>
                        <SheetTitle>Group Information</SheetTitle>
                        <SheetDescription>{group.memberIds.length} members</SheetDescription>
                    </SheetHeader>
                    <div className="flex-grow overflow-y-auto -mx-6 px-6 py-4">
                        <div className="flex flex-col items-center gap-4 text-center">
                            <div className="relative group/avatar">
                                <Avatar className="h-32 w-32">
                                    <AvatarImage src={group.groupPhotoUrl} />
                                    <AvatarFallback>
                                        <Users className="h-16 w-16 text-muted-foreground" />
                                    </AvatarFallback>
                                </Avatar>
                                {isCreator && (
                                    <>
                                        <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" className="hidden" />
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            className="absolute inset-0 m-auto h-12 w-12 rounded-full bg-black/50 text-white opacity-0 group-hover/avatar:opacity-100 transition-opacity"
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
                                        </Button>
                                    </>
                                )}
                            </div>
                            {isEditing ? (
                                <div className="flex items-center gap-2 w-full max-w-sm">
                                    <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} disabled={isSaving} />
                                    <Button onClick={handleNameSave} disabled={isSaving} size="sm">
                                        {isSaving ? 'Saving...' : 'Save'}
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <h2 className="text-2xl font-bold font-headline">{group.name}</h2>
                                    {isCreator && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsEditing(true)}><Edit className="h-4 w-4"/></Button>}
                                </div>
                            )}
                            <p className="text-sm text-muted-foreground">{group.description || 'No description.'}</p>
                        </div>
                        
                        <div className="mt-8">
                            <h3 className="text-lg font-semibold mb-4">Members</h3>
                            <ScrollArea className="h-64">
                                <div className="space-y-4">
                                    {group.memberIds.map(memberId => {
                                        const member = allUsersMap.get(memberId);
                                        if (!member) return null;
                                        return (
                                            <div key={memberId} className="flex items-center gap-4">
                                                <Avatar>
                                                    <AvatarImage src={member.profilePictureUrl || `https://picsum.photos/seed/${member.id}/200`} />
                                                    <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                                                </Avatar>
                                                <div className="flex-grow">
                                                    <p className="font-medium">{member.name}</p>
                                                    <p className="text-xs text-muted-foreground">{member.email}</p>
                                                </div>
                                                {memberId === group.creatorId && <Badge variant="secondary"><Shield className="mr-1 h-3 w-3"/> Admin</Badge>}
                                            </div>
                                        )
                                    })}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                    <SheetFooter className="border-t pt-4">
                        {isCreator ? (
                            <Button variant="destructive" className="w-full" onClick={() => setShowConfirm('delete')}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Group
                            </Button>
                        ) : (
                            <Button variant="destructive" className="w-full" onClick={() => setShowConfirm('exit')}>
                                <LogOut className="mr-2 h-4 w-4" /> Exit Group
                            </Button>
                        )}
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            <AlertDialog open={showConfirm !== null} onOpenChange={() => setShowConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {showConfirm === 'exit'
                                ? "You will be removed from this group and will no longer receive messages. This action can only be undone by being re-invited by the group admin."
                                : "This action cannot be undone. This will permanently delete the group and all its messages for everyone."}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90"
                            onClick={showConfirm === 'exit' ? handleExitGroup : handleDeleteGroup}
                            disabled={isSaving}
                        >
                             {isSaving ? 'Processing...' : (showConfirm === 'exit' ? 'Exit Group' : 'Delete Group')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

    