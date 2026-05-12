import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import {
  buildConsumerBookingPriceParams,
  fetchConsumerBookingPriceVehicles,
} from '@/features/delivery/api/consumerBookingPriceApi';
import { useDeliveryOrderDraftStore } from '@/features/delivery/store/deliveryOrderDraftStore';
import { useDeliveryFormStore } from '@/features/map/store/deliveryFormStore';

export function useConsumerBookingPriceVehicles() {
  const draftPickup = useDeliveryOrderDraftStore((s) => s.pickup);
  const draftDropoff = useDeliveryOrderDraftStore((s) => s.dropoff);
  const pallets = useDeliveryOrderDraftStore((s) => s.pallets);
  const dimensions = useDeliveryOrderDraftStore((s) => s.dimensions);
  const rows = useDeliveryFormStore((s) => s.rows);
  const routeDurationSec = useDeliveryFormStore((s) => s.routeDurationSec);
  const routeDistanceM = useDeliveryFormStore((s) => s.routeDistanceM);
  const tab = useDeliveryFormStore((s) => s.tab);
  const rowPickup = rows.find((r) => r.kind === 'pickup')?.place ?? null;
  const rowDropoff = rows.find((r) => r.kind === 'dropoff')?.place ?? null;
  const pickup = draftPickup ?? rowPickup;
  const dropoff = draftDropoff ?? rowDropoff;

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

  const enabled = Boolean(
    pickup?.address &&
      dropoff?.address &&
      Number.isFinite(pickup.lat) &&
      Number.isFinite(pickup.lng) &&
      Number.isFinite(dropoff.lat) &&
      Number.isFinite(dropoff.lng),
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
      console.warn('[ChooseVehicle] fetch booking price params', params);
      return fetchConsumerBookingPriceVehicles(params);
    },
    enabled,
    staleTime: 30_000,
    retry: false,
  });
}
