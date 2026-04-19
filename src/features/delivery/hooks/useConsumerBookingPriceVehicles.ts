import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  buildConsumerBookingPriceParams,
  fetchConsumerBookingPriceVehicles,
} from '@/features/delivery/api/consumerBookingPriceApi';
import { useDeliveryOrderDraftStore } from '@/features/delivery/store/deliveryOrderDraftStore';
import { useDeliveryFormStore } from '@/features/map/store/deliveryFormStore';

export function useConsumerBookingPriceVehicles() {
  const pickup = useDeliveryOrderDraftStore((s) => s.pickup);
  const dropoff = useDeliveryOrderDraftStore((s) => s.dropoff);
  const pallets = useDeliveryOrderDraftStore((s) => s.pallets);
  const dimensions = useDeliveryOrderDraftStore((s) => s.dimensions);
  const routeDurationSec = useDeliveryFormStore((s) => s.routeDurationSec);
  const routeDistanceM = useDeliveryFormStore((s) => s.routeDistanceM);
  const tab = useDeliveryFormStore((s) => s.tab);

  const queryKey = useMemo(
    () => [
      'consumer',
      'booking',
      'price',
      tab,
      routeDurationSec,
      routeDistanceM,
      pickup?.lat,
      pickup?.lng,
      dropoff?.lat,
      dropoff?.lng,
      pickup?.address,
      dropoff?.address,
      dimensions.height,
      dimensions.length,
      dimensions.width,
      pallets.map((p) => `${p.palletTypeValue}:${p.weightKg}`).join('|'),
    ],
    [tab, routeDurationSec, routeDistanceM, pickup, dropoff, dimensions, pallets],
  );

  return useQuery({
    queryKey,
    queryFn: async () => {
      if (!pickup || !dropoff) return [];
      const params = buildConsumerBookingPriceParams({
        pickup,
        dropoff,
        routeDistanceM,
        routeDurationSec,
        tab,
        pallets,
        dimensions,
      });
      return fetchConsumerBookingPriceVehicles(params);
    },
    enabled: Boolean(pickup?.address && dropoff?.address),
    staleTime: 30_000,
  });
}
