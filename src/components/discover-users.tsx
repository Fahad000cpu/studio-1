'use client';

import * as React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase'; // Import useDoc
import { collection, query, orderBy, getDocs, doc, GeoPoint } from 'firebase/firestore'; // Import doc, GeoPoint
import type { UserProfile } from '@/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import {
  Card,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquarePlus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { getInitials } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast'; // Import useToast

interface DiscoverUsersProps {
  searchTerm: string;
}

const userPlaceholders = PlaceHolderImages.filter(p => p.id.startsWith('user-'));
const getPlaceholderImage = (id: string) => {
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const placeholder = userPlaceholders[hash % userPlaceholders.length];
    return placeholder || userPlaceholders[0];
}

// Haversine distance calculation
function getDistance(geo1: GeoPoint, geo2: GeoPoint) {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(geo2.latitude - geo1.latitude);
  const dLon = toRad(geo2.longitude - geo1.longitude);
  const lat1 = toRad(geo1.latitude);
  const lat2 = toRad(geo2.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}


export default function DiscoverUsers({ searchTerm }: DiscoverUsersProps) {
  const router = useRouter();
  const { user: authUser } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();

  const [allUsers, setAllUsers] = React.useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetch current user's full profile to get coordinates
  const currentUserDocRef = useMemoFirebase(
    () => (authUser ? doc(firestore, 'users', authUser.uid) : null),
    [authUser, firestore]
  );
  const { data: currentUserProfile, isLoading: isCurrentUserLoading } = useDoc<UserProfile>(currentUserDocRef);
  
  React.useEffect(() => {
    if (!firestore || !authUser) return;

    const fetchAllUsers = async () => {
      setIsLoading(true);
      try {
        const usersCollectionRef = collection(firestore, 'users');
        const q = query(usersCollectionRef, orderBy('name', 'asc'));
        
        const querySnapshot = await getDocs(q);
        const fetchedUsers = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as UserProfile))
          .filter(u => u.id !== authUser.uid);
        
        setAllUsers(fetchedUsers);

      } catch (error) {
        console.error("Error fetching users:", error);
        toast({
          variant: "destructive",
          title: "Error fetching users",
          description: "Could not load user data. Please try again later."
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchAllUsers();
  }, [firestore, authUser, toast]);

  const sortedAndFilteredUsers = React.useMemo(() => {
    let usersToSort = [...allUsers];

    // Sort by distance if current user's location is available
    if (currentUserProfile?.coordinates) {
      usersToSort.sort((a, b) => {
        const distA = a.coordinates ? getDistance(currentUserProfile.coordinates!, a.coordinates) : Infinity;
        const distB = b.coordinates ? getDistance(currentUserProfile.coordinates!, b.coordinates) : Infinity;
        return distA - distB;
      });
    }

    // Apply search term filter
    if (!searchTerm) {
      return usersToSort;
    }
    
    const searchTermLower = searchTerm.toLowerCase();
    return usersToSort.filter(u => {
      const nameMatch = (u.name || '').toLowerCase().includes(searchTermLower);
      const emailMatch = (u.email || '').toLowerCase().includes(searchTermLower);
      return nameMatch || emailMatch;
    });

  }, [allUsers, currentUserProfile, searchTerm]);


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

  if (isLoading || isCurrentUserLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
        {renderSkeletons()}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
        {sortedAndFilteredUsers.map((userProfile) => {
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
      </div>

      {!isLoading && sortedAndFilteredUsers.length === 0 && (
         <div className="col-span-full text-center py-16">
              <h2 className="text-2xl font-bold font-headline">No Users Found</h2>
              <p className="text-muted-foreground mt-2">Try adjusting your search filters.</p>
          </div>
      )}
    </>
  );
}
