import type { UsersListParams } from '@/types/user.types';

/**
 * Centralized query keys = cache identity. Co-locate with feature names for predictable invalidation.
 */
export const queryKeys = {
  users: {
    all: ['users'] as const,
    list: (params: UsersListParams) => ['users', 'list', params] as const,
  },
  auth: {
    me: ['auth', 'me'] as const,
  },
  dropyou: {
    activeTrips: ['dropyou', 'active-trips'] as const,
    /** `GET /dropyou/user/:id` — all bookings for that user */
    userBookings: (userId: number) => ['dropyou', 'user-bookings', userId] as const,
  },
} as const;
