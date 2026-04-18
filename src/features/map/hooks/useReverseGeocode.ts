import { useCallback, useState } from 'react';

import { env } from '@/shared/config/env';
import { debugLog } from '@/utils/debugLog';

type ReverseResult = {
  address: string;
  placeId?: string;
};

/**
 * Thin wrapper around Google Geocoding API (lat/lng → formatted_address).
 * Called from the Pickup card when the user taps the GPS icon or on initial
 * mount once we obtain a location fix.
 */
export function useReverseGeocode() {
  const [loading, setLoading] = useState(false);

  const reverse = useCallback(
    async (lat: number, lng: number): Promise<ReverseResult | null> => {
      const key = env.googleMapsApiKey;
      if (!key) {
        debugLog('Geocode', 'Missing EXPO_PUBLIC_GOOGLE_MAPS_API_KEY');
        return null;
      }
      setLoading(true);
      try {
        const url =
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}` +
          `&key=${encodeURIComponent(key)}`;
        const res = await fetch(url);
        const json = (await res.json()) as {
          status: string;
          results: { formatted_address: string; place_id: string }[];
        };
        if (json.status !== 'OK' || !json.results.length) {
          debugLog('Geocode', `status=${json.status}`);
          return null;
        }
        const top = json.results[0];
        return { address: top.formatted_address, placeId: top.place_id };
      } catch (e) {
        debugLog('Geocode', e instanceof Error ? e.message : 'unknown error');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  return { reverse, loading };
}
