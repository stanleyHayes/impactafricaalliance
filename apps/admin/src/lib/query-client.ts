import { QueryClient } from '@tanstack/react-query';

import { ApiError } from './api-client';

/** Shared React Query client for the admin console. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) =>
        error instanceof ApiError && error.status < 500 ? false : failureCount < 1,
    },
  },
});
