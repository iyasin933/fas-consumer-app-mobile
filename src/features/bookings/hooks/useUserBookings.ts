import { useQuery } from '@tanstack/react-query';

import { fetchUserBookings } from '@/api/modules/dropyou.api';
import { mapActiveTripToView } from '@/features/home/utils/mapActiveTripToView';
import * as tokenStorage from '@/services/tokenStorage';
import { useAuthStore } from '@/store/authStore';
import type { ActiveTripCardVm } from '@/types/activeTrip.types';
import { pickUserIdFromProfile, userIdFromJwt } from '@/utils/authIdentity';
import { queryKeys } from '@/utils/queryKeys';

export function useUserBookings(): {
  bookings: ActiveTripCardVm[];
  isLoading: boolean;
  isRefetching: boolean;
  isError: boolean;
  /** Resolving id from profile + JWT (async). */
  profileLoading: boolean;
  /** Profile + token parsed but no numeric user id found. */
  missingUserId: boolean;
  refetch: () => void;
  userId: number | null;
} {
  const session = useAuthStore((s) => s.session);
  const authed = session === 'authed';

  const idQuery = useQuery({
    queryKey: ['auth', 'resolved-user-id'],
    queryFn: async (): Promise<number | null> => {
      const user = useAuthStore.getState().user;
      const fromProfile = pickUserIdFromProfile(user);
      if (fromProfile != null) return fromProfile;
      const token = await tokenStorage.getAccessToken();
      return userIdFromJwt(token);
    },
    enabled: authed,
    staleTime: 60_000,
  });

  const userId = idQuery.data ?? null;

  const bookingsQuery = useQuery({
    queryKey: userId != null ? queryKeys.dropyou.userBookings(userId) : ['dropyou', 'user-bookings', 'pending'],
    queryFn: () => fetchUserBookings(userId!),
    enabled: authed && userId != null,
    staleTime: 30_000,
  });

  const bookings = bookingsQuery.data?.map((raw, i) => mapActiveTripToView(raw, i)) ?? [];

  const profileLoading = idQuery.isPending;
  const missingUserId = idQuery.isSuccess && userId === null;

  const refetchAll = () => {
    void idQuery.refetch();
    void bookingsQuery.refetch();
  };

  return {
    bookings,
    isLoading: profileLoading || (userId != null && bookingsQuery.isPending),
    isRefetching: bookingsQuery.isFetching && !bookingsQuery.isPending,
    isError: idQuery.isError || bookingsQuery.isError,
    profileLoading,
    missingUserId,
    refetch: refetchAll,
    userId,
  };
}
