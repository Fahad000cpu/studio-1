'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { CollectionOptions } from '@/firebase/firestore/use-collection';

interface DiscoverUsersProps {
  searchTerm: string;
}

export default function DiscoverUsers({ searchTerm }: DiscoverUsersProps) {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();

  // 1. Create a memoized reference to the users collection.
  const usersCollectionRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);

  // 2. Define query options to order users by name. This is much faster than fetching all and sorting on client.
  const collectionOptions = useMemoFirebase<CollectionOptions>(() => ({
      orderBy: ['name', 'asc']
  }), []);

  // 3. Use the hook with the query options. It will now fetch users in a sorted manner directly from Firestore.
  const { data: allUsers, isLoading } = useCollection<UserProfile>(usersCollectionRef, collectionOptions);

  // 4. Filter the results on the client (this is fast).
  const filteredUsers = React.useMemo(() => {
    if (!allUsers) return [];
    
    // Filter out the current user, then apply the search term.
    return allUsers.filter(u => {
      if (u.id === user?.uid) return false;

      if (!searchTerm) return true; // If no search term, show all other users
      
      const searchTermLower = searchTerm.toLowerCase();
      const nameMatch = (u.name || '').toLowerCase().includes(searchTermLower);
      const emailMatch = (u.email || '').toLowerCase().includes(searchTermLower);
      return nameMatch || emailMatch;
    });
  }, [allUsers, user, searchTerm]);


  const handleStartChat = (selectedUser: UserProfile) => {
    router.push(`/chat?chatWith=${selectedUser.id}`);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
        {Array.from({ length: 8 }).map((_, i) => (
           <Card
            key={`skeleton-${i}`}
            className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl overflow-hidden bg-card"
          >
            <div className="relative h-24 bg-gradient-to-b from-primary/20 via-primary/5 to-transparent">
               <div className='absolute -bottom-12 left-1/2 -translate-x-1/2'>
                  <Skeleton className="w-24 h-24 rounded-full border-4 border-card bg-background ring-1 ring-border"/>
               </div>
            </div>
            
            <CardContent className="pt-16 pb-6 px-6">
              <Skeleton className="h-6 w-3/4 mx-auto" />
              <Skeleton className="h-10 w-full mx-auto mt-2" />
            </CardContent>
            <CardFooter className="px-6 pb-6">
              <Skeleton className="h-10 w-full" />
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }

  if (!isLoading && filteredUsers.length === 0) {
      return (
          <div className="col-span-full text-center py-16">
              <h2 className="text-2xl font-bold font-headline">No Users Found</h2>
              <p className="text-muted-foreground mt-2">Try adjusting your search filters.</p>
          </div>
      );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
      {filteredUsers.map((userProfile) => (
        <Card
          key={userProfile.id}
          className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl overflow-hidden bg-card"
        >
          <div className="relative h-24 bg-gradient-to-b from-primary/20 via-primary/5 to-transparent">
             <div className='absolute -bottom-12 left-1/2 -translate-x-1/2'>
                <Avatar className="w-24 h-24 border-4 border-card bg-background ring-1 ring-border">
                    <AvatarImage
                    src={userProfile.profilePictureUrl || `https://picsum.photos/seed/${userProfile.id}/200/200`}
                    alt={userProfile.name || ''}
                    data-ai-hint="person portrait"
                    />
                    <AvatarFallback>{(userProfile.name || userProfile.email || '?').charAt(0)}</AvatarFallback>
                </Avatar>
             </div>
          </div>
          
          <CardContent className="pt-16 pb-6 px-6">
            <h3 className="font-headline text-xl font-bold truncate">{userProfile.name || userProfile.email}</h3>
            <p className="text-muted-foreground mt-1 text-sm h-10">{userProfile.bio || 'Loves connecting with new people.'}</p>
          </CardContent>
          <CardFooter className="px-6 pb-6">
            <Button className="w-full" variant="outline" onClick={() => handleStartChat(userProfile)}>
              <MessageSquarePlus className="mr-2 h-4 w-4" /> Start Chat
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
