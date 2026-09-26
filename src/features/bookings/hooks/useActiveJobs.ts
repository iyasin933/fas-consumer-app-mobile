import { useQuery } from '@tanstack/react-query';

import { fetchUserBookings } from '@/api/modules/dropyou.api';
import { mapActiveTripToView } from '@/features/home/utils/mapActiveTripToView';
import * as tokenStorage from '@/services/tokenStorage';
import { useAuthStore } from '@/store/authStore';
import type { ActiveTripCardVm } from '@/types/activeTrip.types';
import { pickUserIdFromProfile, userIdFromJwt } from '@/utils/authIdentity';
import { queryKeys } from '@/utils/queryKeys';

function isActiveJob(trip: ActiveTripCardVm): boolean {
  const status = trip.statusLabel.trim().toLowerCase();
  return status === 'accepted' && trip.podSubmitted === false;
}

/**
 * Active jobs (ACCEPTED and no POD yet) for the signed-in user. Shares the
 * same react-query cache as `useUserBookings`, so the banner stays in sync
 * with the Bookings screen without extra fetches.
 */
export function useActiveJobs(): {
  count: number;
  first: ActiveTripCardVm | null;
} {
  const authed = useAuthStore((s) => s.session === 'authed');

  const idQuery = useQuery({
    queryKey: ['auth', 'resolved-user-id'],
    queryFn: async (): Promise<number | null> => {
      const fromProfile = pickUserIdFromProfile(useAuthStore.getState().user);
      if (fromProfile != null) return fromProfile;
      const token = await tokenStorage.getAccessToken();
      return userIdFromJwt(token);
    },
    enabled: authed,
    staleTime: 60_000,
  });

  const userId = idQuery.data ?? null;

  const bookingsQuery = useQuery({
    queryKey:
      userId != null
        ? queryKeys.dropyou.userBookings(userId)
        : ['dropyou', 'user-bookings', 'active-jobs'],
    queryFn: () => fetchUserBookings(userId!),
    enabled: authed && userId != null,
    staleTime: 30_000,
  });

  if (!authed) return { count: 0, first: null };

  const rows = bookingsQuery.data ?? [];
  const active = rows
    .map((raw, index) => mapActiveTripToView(raw, index))
    .filter(isActiveJob);
  return { count: active.length, first: active[0] ?? null };
}
