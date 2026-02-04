'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, GeoPoint } from 'firebase/firestore';
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

interface DiscoverUsersProps {
  searchTerm: string;
}

// Haversine distance formula to calculate distance between two points on Earth
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    if (lat1 === lat2 && lon1 === lon2) {
        return 0;
    }
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in km
    return distance;
}


export default function DiscoverUsers({ searchTerm }: DiscoverUsersProps) {
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [sortedUsers, setSortedUsers] = React.useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const usersCollectionRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: usersCollection, isLoading: usersCollectionLoading } = useCollection<UserProfile>(usersCollectionRef);

  React.useEffect(() => {
    const fetchAndSortUsers = (latitude?: number, longitude?: number) => {
      setIsLoading(true);
      if (usersCollectionLoading || !usersCollection) {
          if (!usersCollectionLoading) {
              setIsLoading(false);
              setSortedUsers([]);
          }
          return;
      };

      try {
        const otherUsers = usersCollection.filter((u) => u.id !== user?.uid);

        // Sort users directly on the client
        const sorted = otherUsers.sort((a, b) => {
            if (latitude && longitude) {
                const locationA = a.coordinates;
                const locationB = b.coordinates;

                if (locationA && locationB) {
                    const distanceA = getDistance(latitude, longitude, locationA.latitude, locationA.longitude);
                    const distanceB = getDistance(latitude, longitude, locationB.latitude, locationB.longitude);
                    return distanceA - distanceB;
                }
                if (locationA) return -1; // A has location, B does not
                if (locationB) return 1;  // B has location, A does not
            }
             // Fallback sort by name (or email)
            const nameA = a.name || a.email || '';
            const nameB = b.name || b.email || '';
            return nameA.localeCompare(nameB);
        });
        
        setSortedUsers(sorted);

      } catch (error) {
        console.error("Failed to sort users:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load user suggestions.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    fetchAndSortUsers(position.coords.latitude, position.coords.longitude);
                },
                (error: GeolocationPositionError) => {
                    fetchAndSortUsers(); // Sort alphabetically on geo error
                }
            );
        } else {
            fetchAndSortUsers(); // Sort alphabetically if geo is not supported
        }
    } else if (!usersCollectionLoading) {
        setIsLoading(false);
    }
  }, [user, firestore, toast, usersCollection, usersCollectionLoading]);

  const filteredUsers = React.useMemo(() => {
    if (!sortedUsers) return [];
    if (!searchTerm) return sortedUsers;
    
    return sortedUsers.filter(u => {
      const searchTermLower = searchTerm.toLowerCase();
      // Ensure name and email are treated as strings even if null/undefined
      const nameMatch = (u.name || '').toLowerCase().includes(searchTermLower);
      const emailMatch = (u.email || '').toLowerCase().includes(searchTermLower);
      return nameMatch || emailMatch;
    });
  }, [sortedUsers, searchTerm]);


  const handleStartChat = () => {
    router.push('/chat');
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
            <Button className="w-full" variant="outline" onClick={handleStartChat}>
              <MessageSquarePlus className="mr-2 h-4 w-4" /> Start Chat
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
