import { QueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

/**
 * Single QueryClient instance so axios interceptors (e.g. 401) and tests can clear the same cache.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, err) => {
        if (isAxiosError(err) && err.response?.status && err.response.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
