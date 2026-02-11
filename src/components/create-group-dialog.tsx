
'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp, addDoc } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, X, Users, Camera } from 'lucide-react';
import { Badge } from './ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

const groupSchema = z.object({
  name: z.string().min(3, 'Group name must be at least 3 characters.'),
  description: z.string().optional(),
  members: z.array(z.string()).min(1, 'You must add at least one other member to the group.'),
});

type GroupFormValues = z.infer<typeof groupSchema>;

export function CreateGroupDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const [groupPhotoFile, setGroupPhotoFile] = React.useState<File | null>(null);
  const [groupPhotoPreview, setGroupPhotoPreview] = React.useState<string | null>(null);

  const usersCollectionRef = useMemoFirebase(() => {
    return firestore && user ? collection(firestore, 'users') : null;
  }, [firestore, user]);
  const { data: allUsers, isLoading: usersLoading } = useCollection<UserProfile>(usersCollectionRef);

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: { name: '', description: '', members: [] },
  });

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        setGroupPhotoFile(file);
        setGroupPhotoPreview(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (data: GroupFormValues) => {
    if (!user || !firestore) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }

    try {
        let photoUrl: string | undefined = undefined;
        if (groupPhotoFile) {
            photoUrl = await uploadToCloudinary(groupPhotoFile);
        }

        const groupsCollection = collection(firestore, 'groups');
        const memberIds = [...new Set([user.uid, ...data.members])]; 

        await addDoc(groupsCollection, {
          name: data.name,
          description: data.description || '',
          creatorId: user.uid,
          memberIds: memberIds,
          groupPhotoUrl: photoUrl,
          timestamp: serverTimestamp(),
          lastMessageText: `Group created by ${user.displayName || 'a user'}.`,
          lastMessageTimestamp: serverTimestamp(),
        });

        toast({ title: 'Group Created!', description: `"${data.name}" has been successfully created.` });
        
        form.reset();
        setGroupPhotoFile(null);
        setGroupPhotoPreview(null);
        setOpen(false);

    } catch (error: any) {
        console.error("Group creation failed:", error);
        toast({ variant: "destructive", title: "Creation Failed", description: error.message || "Could not create the group." });
    }
  };
  
  const availableUsers = React.useMemo(() => {
    if (!allUsers || !user) return [];
    return allUsers.filter(u => u.id !== user.uid);
  }, [allUsers, user]);

  // Reset form when dialog is closed
  React.useEffect(() => {
    if (!open) {
      form.reset();
      setGroupPhotoFile(null);
      setGroupPhotoPreview(null);
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[90dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogDescription>
            Give your group a name and add members to start collaborating.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-grow overflow-y-auto -mx-6 px-6">
          <form id="create-group-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <div className="flex flex-col items-center gap-4">
                  <Avatar className="h-24 w-24">
                      <AvatarImage src={groupPhotoPreview || undefined} />
                      <AvatarFallback>
                          <Users className="h-10 w-10 text-muted-foreground" />
                      </AvatarFallback>
                  </Avatar>
                  <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                      <Camera className="mr-2 h-4 w-4" />
                      {groupPhotoFile ? 'Change' : 'Upload'} Photo
                  </Button>
                  <input type="file" ref={fileInputRef} onChange={handlePhotoChange} accept="image/*" className="hidden" />
              </div>

              <div>
                <Label htmlFor="name">Group Name</Label>
                <Input id="name" {...form.register('name')} placeholder="e.g., Project Team" className="mt-1" />
                {form.formState.errors.name && <p className="text-sm text-destructive mt-1">{form.formState.errors.name.message}</p>}
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea id="description" {...form.register('description')} placeholder="What is this group about?" className="mt-1" />
              </div>

              <Controller
                  control={form.control}
                  name="members"
                  render={({ field }) => (
                      <div>
                          <Label>Members</Label>
                          <MultiSelect aivailableUsers={availableUsers} selectedUsers={field.value} setSelectedUsers={field.onChange} isLoading={usersLoading} />
                          {form.formState.errors.members && <p className="text-sm text-destructive mt-1">{form.formState.errors.members.message}</p>}
                      </div>
                  )}
              />
          </form>
        </div>

        <DialogFooter className="pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" form="create-group-form" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Creating...' : 'Create Group'}
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function MultiSelect({ aivailableUsers, selectedUsers, setSelectedUsers, isLoading }: { aivailableUsers: UserProfile[], selectedUsers: string[], setSelectedUsers: (users: string[]) => void, isLoading: boolean }) {
    const [open, setOpen] = React.useState(false);
    
    const usersMap = React.useMemo(() => new Map(aivailableUsers.map(u => [u.id, u])), [aivailableUsers]);

    const handleSelect = (userId: string) => {
        setSelectedUsers([...selectedUsers, userId]);
    };

    const handleDeselect = (userId: string) => {
        setSelectedUsers(selectedUsers.filter(id => id !== userId));
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <div className="mt-1 flex items-center flex-wrap gap-2 p-2 border rounded-md min-h-10 cursor-text">
                    {selectedUsers.length > 0 ? (
                      <ScrollArea className="max-h-24 w-full">
                        <div className="flex flex-wrap gap-1 p-1">
                          {selectedUsers.map(userId => {
                              const user = usersMap.get(userId);
                              return (
                                  <Badge key={userId} variant="secondary" className="flex items-center gap-1">
                                      {user?.name || '...'}
                                      <button type="button" onClick={(e) => { e.stopPropagation(); handleDeselect(userId); }} className="rounded-full hover:bg-muted-foreground/20">
                                          <X className="h-3 w-3"/>
                                      </button>
                                  </Badge>
                              )
                          })}
                        </div>
                      </ScrollArea>
                    ) : (
                      <span className={cn("text-sm text-muted-foreground px-1 py-2")}>
                          Select members...
                      </span>
                    )}
                </div>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search users..." />
                    <CommandList>
                        <CommandEmpty>{isLoading ? "Loading users..." : "No users found."}</CommandEmpty>
                        <CommandGroup>
                            {aivailableUsers.map((user) => (
                                <CommandItem
                                    key={user.id}
                                    value={`${user.name} (${user.email})`}
                                    onSelect={() => {
                                        if (selectedUsers.includes(user.id)) {
                                            handleDeselect(user.id);
                                        } else {
                                            handleSelect(user.id);
                                        }
                                    }}
                                    className="cursor-pointer"
                                >
                                    <Check className={cn("mr-2 h-4 w-4", selectedUsers.includes(user.id) ? "opacity-100" : "opacity-0")} />
                                    <span>{user.name}</span>
                                    <span className="ml-auto text-xs text-muted-foreground">{user.email}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

    