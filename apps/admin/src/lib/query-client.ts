import { QueryCache, QueryClient } from '@tanstack/react-query';

import { ApiError } from './api-client';

/** Shared React Query client for the admin console. */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      // Surface failed background fetches so they don't fail silently.
      const message = error instanceof ApiError ? error.message : 'Unexpected error loading data';
       
      console.error('Query error:', error);
      // In a real app this would dispatch to a toast/notification context.
      if (import.meta.env.DEV) {
         
        console.warn(message);
      }
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) =>
        error instanceof ApiError && error.status < 500 ? false : failureCount < 1,
    },
    mutations: {
      onError: (error) => {
         
        console.error('Mutation error:', error);
      },
    },
  },
});
