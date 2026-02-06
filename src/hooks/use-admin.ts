'use client';

import { useUser } from '@/firebase';

export function useAdmin() {
  const { user, isUserLoading: isUserAuthLoading } = useUser();

  // An admin is the user with the specified email.
  const isAdmin = user?.email === 'fahadkhanamrohivi@gmail.com';
  
  // The overall loading state only depends on user authentication.
  const isLoading = isUserAuthLoading;

  return { isAdmin, isLoading };
}
