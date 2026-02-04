
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection } from 'firebase/firestore';
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
import { suggestUsersByLocation } from '@/ai/flows/suggest-users-by-location';

interface DiscoverUsersProps {
  searchTerm: string;
}

export default function DiscoverUsers({ searchTerm }: DiscoverUsersProps) {
  const router = useRouter();
  const { user } = useUser();
  const { toast } = useToast();
  const firestore = useFirestore();
  const [allSuggestedUsers, setAllSuggestedUsers] = React.useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const usersCollectionRef = useMemoFirebase(() => collection(firestore, 'users'), [firestore]);
  const { data: usersCollection, isLoading: usersCollectionLoading } = useCollection<UserProfile>(usersCollectionRef);

  React.useEffect(() => {
    const fetchUsers = async (latitude?: number, longitude?: number) => {
      setIsLoading(true);
      if (usersCollectionLoading) return;

      try {
        if (!usersCollection) {
          setAllSuggestedUsers([]);
          return;
        }

        const otherUsers = usersCollection.filter((u) => u.id !== user?.uid);

        // Prepare users for the server flow, ensuring 'name' and 'email' are strings.
        // The Zod schema in the flow requires them.
        const usersForFlow = otherUsers
          .filter(u => u.id && u.email) // Ensure email exists as the schema requires it
          .map(u => ({
            ...u,
            name: u.name || u.email, // Fallback to email if name is missing
            coordinates: u.coordinates ? { latitude: u.coordinates.latitude, longitude: u.coordinates.longitude } : null,
          }));

        if (latitude && longitude) {
            const suggestions = await suggestUsersByLocation({
              latitude,
              longitude,
              users: usersForFlow,
            });
            setAllSuggestedUsers(suggestions as UserProfile[]);
        } else {
             setAllSuggestedUsers(usersForFlow);
        }
      } catch (error) {
        console.error("Failed to fetch or sort users:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not load user suggestions.",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (user && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchUsers(position.coords.latitude, position.coords.longitude);
        },
        (error: GeolocationPositionError) => {
          if (error.code === error.PERMISSION_DENIED) {
            toast({
              title: 'Location Access Denied',
              description: 'Showing default user suggestions.',
            });
          } else {
            console.error('Geolocation error:', error.message);
            toast({
              variant: 'destructive',
              title: 'Location Error',
              description: 'Could not retrieve location. Showing default suggestions.',
            });
          }
          fetchUsers();
        }
      );
    } else if (user) {
      toast({
        title: "Geolocation not supported",
        description: "Showing default user suggestions.",
      });
      fetchUsers();
    }
  }, [user?.uid, firestore, toast, user, usersCollection, usersCollectionLoading]);

  const filteredUsers = React.useMemo(() => {
    if (!allSuggestedUsers) return [];
    if (!searchTerm) return allSuggestedUsers;
    
    return allSuggestedUsers.filter(u => {
      const searchTermLower = searchTerm.toLowerCase();
      const nameMatch = u.name && u.name.toLowerCase().includes(searchTermLower);
      const emailMatch = u.email && u.email.toLowerCase().includes(searchTermLower);
      return nameMatch || emailMatch;
    });
  }, [allSuggestedUsers, searchTerm]);


  const handleStartChat = () => {
    router.push('/chat');
  };

  if (isLoading || usersCollectionLoading) {
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
                    src={`https://picsum.photos/seed/${userProfile.id}/200/200`}
                    alt={userProfile.name}
                    data-ai-hint="person portrait"
                    />
                    <AvatarFallback>{userProfile.name?.charAt(0)}</AvatarFallback>
                </Avatar>
             </div>
          </div>
          
          <CardContent className="pt-16 pb-6 px-6">
            <h3 className="font-headline text-xl font-bold">{userProfile.name || userProfile.email}</h3>
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

    

    