import { useQuery } from '@tanstack/react-query';

import { fetchActiveTrips } from '@/api/modules/dropyou.api';
import { mapActiveTripToView } from '@/features/home/utils/mapActiveTripToView';
import { useAuthStore } from '@/store/authStore';
import type { ActiveTripCardVm } from '@/types/activeTrip.types';
import { queryKeys } from '@/utils/queryKeys';

export function useActiveTrips(): {
  trips: ActiveTripCardVm[];
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
} {
  const authed = useAuthStore((s) => s.session === 'authed');
  const q = useQuery({
    queryKey: queryKeys.dropyou.activeTrips,
    queryFn: fetchActiveTrips,
    enabled: authed,
    staleTime: 30_000,
  });

  const trips =
    q.data?.map((raw, i) => mapActiveTripToView(raw, i)) ?? [];

  return {
    trips,
    isLoading: q.isPending,
    isError: q.isError,
    refetch: () => {
      void q.refetch();
    },
  };
}
