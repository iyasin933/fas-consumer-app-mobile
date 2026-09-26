import { useQuery } from '@tanstack/react-query';

import { fetchUserBookings } from '@/api/modules/dropyou.api';
import { isPendingLoad } from '@/features/bookings/utils/bookingStatus';
import { mapActiveTripToView } from '@/features/home/utils/mapActiveTripToView';
import * as tokenStorage from '@/services/tokenStorage';
import { useAuthStore } from '@/store/authStore';
import { pickUserIdFromProfile, userIdFromJwt } from '@/utils/authIdentity';
import { queryKeys } from '@/utils/queryKeys';

/**
 * Number of PENDING bookings for the signed-in user. Shares the same
 * react-query cache as `useUserBookings`, so the tab badge stays in sync
 * with the Bookings screen without extra fetches.
 */
export function usePendingBookingsCount(): number {
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
        : ['dropyou', 'user-bookings', 'pending-count'],
    queryFn: () => fetchUserBookings(userId!),
    enabled: authed && userId != null,
    staleTime: 30_000,
  });

  if (!authed) return 0;

  const rows = bookingsQuery.data ?? [];
  let pending = 0;
  for (const raw of rows) {
    if (isPendingLoad(mapActiveTripToView(raw, 0))) pending += 1;
  }
  return pending;
}
