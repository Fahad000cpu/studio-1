'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export function useAdmin() {
  const { user, isUserLoading: isUserAuthLoading } = useUser();
  const firestore = useFirestore();

  // Memoize the document reference to prevent re-renders
  const adminRoleDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'roles_admin', user.uid) : null),
    [user, firestore]
  );

  // Use the useDoc hook to listen for the admin role document
  const { data: adminRoleDoc, isLoading: isAdminRoleLoading } = useDoc(adminRoleDocRef);

  // An admin is someone for whom the role document exists
  const isAdmin = !!adminRoleDoc;
  
  // The overall loading state depends on both user authentication and the Firestore doc read
  const isLoading = isUserAuthLoading || isAdminRoleLoading;

  return { isAdmin, isLoading };
}
