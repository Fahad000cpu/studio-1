
'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Query,
  onSnapshot,
  DocumentData,
  FirestoreError,
  QuerySnapshot,
  CollectionReference,
  collection,
  query as firestoreQuery,
  where,
  orderBy,
  limit,
  startAfter,
} from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

/** Utility type to add an 'id' field to a given type T. */
export type WithId<T> = T & { id: string };

/**
 * Interface defining the options for ordering data in a Firestore query.
 */
export type OrderBy = [string, 'asc' | 'desc'];

/**
 * Interface defining the options for filtering data in a Firestore query.
 * The tuple represents [field, operator, value].
 */
export type Where = [string, '==' | '!=' | '<' | '<=' | '>' | '>=' | 'array-contains' | 'in' | 'not-in' | 'array-contains-any', any];

/**
 * Interface for the options that can be passed to the useCollection hook.
 */
export interface CollectionOptions {
  orderBy?: OrderBy | OrderBy[];
  where?: Where | Where[];
  limit?: number;
  startAfter?: any;
}


/**
 * Interface for the return value of the useCollection hook.
 * @template T Type of the document data.
 */
export interface UseCollectionResult<T> {
  data: WithId<T>[] | null; // Document data with ID, or null.
  isLoading: boolean;       // True if loading.
  error: FirestoreError | Error | null; // Error object, or null.
}

/* Internal implementation of Query:
  https://github.com/firebase/firebase-js-sdk/blob/c5f08a9bc5da0d2b0207802c972d53724ccef055/packages/firestore/src/lite-api/reference.ts#L143
*/
export interface InternalQuery extends Query<DocumentData> {
  _query: {
    path: {
      canonicalString(): string;
      toString(): string;
    }
  }
}

/**
 * React hook to subscribe to a Firestore collection or query in real-time.
 * Handles nullable references/queries and constructs queries from options.
 *
 * IMPORTANT! YOU MUST MEMOIZE the inputted targetRefOrQuery or options object, or performance issues will occur.
 * Use useMemo or useMemoFirebase to memoize it per React guidance. Ensure dependencies are stable.
 *
 * @template T Optional type for document data. Defaults to any.
 * @param {CollectionReference<DocumentData> | Query<DocumentData> | null | undefined} targetRefOrQuery -
 * The Firestore CollectionReference or a pre-built Query. Waits if null/undefined.
 * @param {CollectionOptions | undefined} options - Optional object to build a query dynamically. Ignored if targetRefOrQuery is a Query.
 * @returns {UseCollectionResult<T>} Object with data, isLoading, error.
 */
export function useCollection<T = any>(
    targetRefOrQuery: ((CollectionReference<DocumentData> | Query<DocumentData>) & {__memo?: boolean})  | null | undefined,
    options?: CollectionOptions,
): UseCollectionResult<T> {
  type ResultItemType = WithId<T>;
  type StateDataType = ResultItemType[] | null;

  const [data, setData] = useState<StateDataType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<FirestoreError | Error | null>(null);

  const finalQuery = useMemo(() => {
    if (!targetRefOrQuery) return null;

    // If it's already a query (e.g., from a subcollection), don't apply new options.
    if (targetRefOrQuery.type === 'query') {
      return targetRefOrQuery;
    }

    let q: Query = targetRefOrQuery as CollectionReference;

    if (options?.where) {
      const wheres = Array.isArray(options.where[0]) ? options.where as Where[] : [options.where as Where];
      wheres.forEach(w => {
        q = firestoreQuery(q, where(...w));
      });
    }

    if (options?.orderBy) {
        const orders = Array.isArray(options.orderBy[0]) ? options.orderBy as OrderBy[] : [options.orderBy as OrderBy];
        orders.forEach(o => {
            q = firestoreQuery(q, orderBy(...o));
        });
    }
    
    if (options?.startAfter) {
      q = firestoreQuery(q, startAfter(options.startAfter));
    }
    
    if (options?.limit) {
      q = firestoreQuery(q, limit(options.limit));
    }

    return q;
  }, [targetRefOrQuery, options]);


  useEffect(() => {
    if (!finalQuery) {
      setData(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const unsubscribe = onSnapshot(
      finalQuery,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const results: ResultItemType[] = [];
        for (const doc of snapshot.docs) {
          results.push({ ...(doc.data() as T), id: doc.id });
        }
        setData(results);
        setError(null);
        setIsLoading(false);
      },
      (err: FirestoreError) => {
        if (err.code === 'permission-denied') {
            const path: string = (finalQuery as unknown as InternalQuery)._query.path.toString();
            const contextualError = new FirestorePermissionError({
                operation: 'list',
                path: path,
            });
            // We set the raw error here so the UI can react to it.
            // We also emit it for global error handling / boundary.
            setError(contextualError); 
            errorEmitter.emit('permission-error', contextualError);
        } else {
             setError(err);
        }
        setData(null);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [finalQuery]);

  if(targetRefOrQuery && (targetRefOrQuery as any).__memo === false) {
    console.warn('The document reference passed to useCollection was not memoized. This can cause infinite loops. Please wrap it with useMemo or useMemoFirebase.');
  }


  return { data, isLoading, error };
}
