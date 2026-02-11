
'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, addDocumentNonBlocking, useCollection, useMemoFirebase } from '@/firebase';
import { collection, serverTimestamp } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, X, Users } from 'lucide-react';
import { Badge } from './ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from '@/lib/utils';

const groupSchema = z.object({
  name: z.string().min(3, 'Group name must be at least 3 characters.'),
  description: z.string().optional(),
  members: z.array(z.string()).min(1, 'You must add at least one member to the group.'),
});

type GroupFormValues = z.infer<typeof groupSchema>;

export function CreateGroupDialog({ children, open, onOpenChange }: { children: React.ReactNode, open: boolean, onOpenChange: (open: boolean) => void }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const usersCollectionRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: allUsers, isLoading: usersLoading } = useCollection<UserProfile>(usersCollectionRef);

  const form = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: { name: '', description: '', members: [] },
  });

  const onSubmit = (data: GroupFormValues) => {
    if (!user) {
      toast({ variant: 'destructive', title: 'Authentication Error', description: 'You must be logged in.' });
      return;
    }

    const groupsCollection = collection(firestore, 'groups');
    const memberIds = [...new Set([user.uid, ...data.members])]; // Ensure creator is a member

    addDocumentNonBlocking(groupsCollection, {
      name: data.name,
      description: data.description || '',
      creatorId: user.uid,
      memberIds: memberIds,
      timestamp: serverTimestamp(),
    });

    toast({ title: 'Group Created!', description: `"${data.name}" has been successfully created.` });
    form.reset();
    onOpenChange(false);
  };
  
  const availableUsers = React.useMemo(() => {
    if (!allUsers || !user) return [];
    return allUsers.filter(u => u.id !== user.uid);
  }, [allUsers, user]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Create New Group</DialogTitle>
          <DialogDescription>
            Give your group a name and add members to start collaborating.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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

             <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? 'Creating...' : 'Create Group'}
                </Button>
            </DialogFooter>
        </form>
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
                <div className="mt-1 flex flex-wrap gap-2 p-2 border rounded-md min-h-10 cursor-text">
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
                    <span className={cn("text-sm text-muted-foreground", selectedUsers.length > 0 && "hidden")}>
                        Select members...
                    </span>
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

