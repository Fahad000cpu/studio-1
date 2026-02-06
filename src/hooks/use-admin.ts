
'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export function useAdmin() {
  const { user, isUserLoading: isUserAuthLoading } = useUser();
  const firestore = useFirestore();

  // Create a memoized reference to the user's admin role document.
  // This depends on the user's UID, so it's re-evaluated when the user changes.
  const adminRoleDocRef = useMemoFirebase(
    () => (user ? doc(firestore, 'roles_admin', user.uid) : null),
    [user, firestore]
  );

  // Use the useDoc hook to listen for the existence of this document.
  const { data: adminRoleDoc, isLoading: isAdminRoleLoading } = useDoc(adminRoleDocRef);

  // An admin is a user for whom a document exists in the 'roles_admin' collection.
  // We check if adminRoleDoc is not null.
  const isAdmin = adminRoleDoc !== null;

  // The overall loading state depends on both user authentication and checking the admin role document.
  const isLoading = isUserAuthLoading || isAdminRoleLoading;

  return { isAdmin, isLoading };
}
