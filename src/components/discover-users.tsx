
'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, orderBy, limit, getDocs, startAfter, type DocumentData, type QueryDocumentSnapshot } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getInitials } from '@/lib/utils';

interface DiscoverUsersProps {
  searchTerm: string;
}

const PAGE_SIZE = 8;
const userPlaceholders = PlaceHolderImages.filter(p => p.id.startsWith('user-'));
const getPlaceholderImage = (id: string) => {
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const placeholder = userPlaceholders[hash % userPlaceholders.length];
    return placeholder || userPlaceholders[0];
}

export default function DiscoverUsers({ searchTerm }: DiscoverUsersProps) {
  const router = useRouter();
  const { user } = useUser();
  const firestore = useFirestore();

  const [users, setUsers] = React.useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [lastDoc, setLastDoc] = React.useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = React.useState(true);

  const fetchUsers = React.useCallback(async (lastVisible: QueryDocumentSnapshot<DocumentData> | null) => {
    if (!firestore || !user) return;
    
    lastVisible ? setIsLoadingMore(true) : setIsLoading(true);

    try {
      const usersCollectionRef = collection(firestore, 'users');
      let q = query(
        usersCollectionRef, 
        orderBy('name', 'asc'), 
        limit(PAGE_SIZE)
      );

      if (lastVisible) {
        q = query(q, startAfter(lastVisible));
      }
      
      const querySnapshot = await getDocs(q);
      const newUsers = querySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as UserProfile))
        .filter(u => u.id !== user.uid);

      setUsers(prev => lastVisible ? [...prev, ...newUsers] : newUsers);
      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1]);
      setHasMore(querySnapshot.docs.length === PAGE_SIZE);

    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [firestore, user]);

  React.useEffect(() => {
    fetchUsers(null);
  }, [fetchUsers]);

  const handleLoadMore = () => {
    if (lastDoc) {
      fetchUsers(lastDoc);
    }
  };

  const filteredUsers = React.useMemo(() => {
    if (!searchTerm) return users;
    
    const searchTermLower = searchTerm.toLowerCase();
    return users.filter(u => {
      const nameMatch = (u.name || '').toLowerCase().includes(searchTermLower);
      const emailMatch = (u.email || '').toLowerCase().includes(searchTermLower);
      return nameMatch || emailMatch;
    });
  }, [users, searchTerm]);

  const handleStartChat = (selectedUser: UserProfile) => {
    router.push(`/chat?chatWith=${selectedUser.id}`);
  };

  const renderSkeletons = () => (
    Array.from({ length: 4 }).map((_, i) => (
      <Card
        key={`skeleton-${i}`}
        className="text-center shadow-lg rounded-xl overflow-hidden bg-card"
      >
        <div className="relative h-24 bg-muted/50">
           <Skeleton className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-24 h-24 rounded-full border-4 border-card bg-background ring-1 ring-border"/>
        </div>
        <CardContent className="pt-16 pb-6 px-6">
          <Skeleton className="h-6 w-3/4 mx-auto" />
          <Skeleton className="h-10 w-full mx-auto mt-2" />
        </CardContent>
        <CardFooter className="px-6 pb-6">
          <Skeleton className="h-10 w-full" />
        </CardFooter>
      </Card>
    ))
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
        {renderSkeletons()}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
        {filteredUsers.map((userProfile) => {
          const placeholder = getPlaceholderImage(userProfile.id);
          
          return (
              <Card
                key={userProfile.id}
                className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300 rounded-xl overflow-hidden bg-card flex flex-col"
              >
                <div className="relative h-24 bg-muted/50">
                    <Image 
                        src={placeholder.imageUrl} 
                        alt={`${userProfile.name}'s banner`} 
                        fill
                        className="object-cover"
                        data-ai-hint={placeholder.imageHint}
                    />
                    <div className='absolute -bottom-12 left-1/2 -translate-x-1/2'>
                        <Avatar className="w-24 h-24 border-4 border-card bg-background ring-1 ring-border">
                            <AvatarImage
                            src={userProfile.profilePictureUrl}
                            alt={userProfile.name || ''}
                            />
                            <AvatarFallback className="text-3xl">{getInitials(userProfile.name)}</AvatarFallback>
                        </Avatar>
                    </div>
                </div>
                
                <CardContent className="pt-16 pb-6 px-6 flex-grow">
                    <h3 className="font-headline text-xl font-bold truncate">{userProfile.name || userProfile.email}</h3>
                    <p className="text-muted-foreground mt-1 text-sm h-10">{userProfile.bio || 'Loves connecting with new people.'}</p>
                </CardContent>
                <CardFooter className="px-6 pb-6">
                    <Button className="w-full" variant="outline" onClick={() => handleStartChat(userProfile)}>
                    <MessageSquarePlus className="mr-2 h-4 w-4" /> Start Chat
                    </Button>
                </CardFooter>
              </Card>
          );
        })}
        {isLoadingMore && renderSkeletons()}
      </div>

      {!searchTerm && hasMore && !isLoadingMore && (
        <div className="text-center mt-12">
          <Button onClick={handleLoadMore}>
            Load More
          </Button>
        </div>
      )}
      
      {!isLoading && filteredUsers.length === 0 && (
         <div className="col-span-full text-center py-16">
              <h2 className="text-2xl font-bold font-headline">No Users Found</h2>
              <p className="text-muted-foreground mt-2">Try adjusting your search filters.</p>
          </div>
      )}
    </>
  );
}
