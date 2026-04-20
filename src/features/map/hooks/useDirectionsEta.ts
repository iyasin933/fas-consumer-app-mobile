import { useCallback } from 'react';

import type { LatLng } from '@/features/map/types';
import { env } from '@/shared/config/env';
import { debugLog } from '@/utils/debugLog';

type FetchEtaArgs = {
  origin: LatLng;
  destination: LatLng;
  /** Optional via points, in list order. */
  waypoints?: LatLng[];
  /** Departure time (ms since epoch). Defaults to "now". */
  departureMs?: number;
};

type EtaResult = {
  /** Total driving duration in seconds (traffic-aware when available). */
  durationSec: number;
  /** Total distance in metres. */
  distanceM: number;
};

const encode = ({ latitude, longitude }: LatLng) => `${latitude},${longitude}`;

/**
 * Thin wrapper around Google Directions API for computing a dropoff ETA.
 *
 * Strategy:
 *  - Use `departure_time` (either the user-picked pickup time, or "now")
 *    to get a traffic-aware `duration_in_traffic` value.
 *  - If the user has added intermediate stops with valid places, pass them
 *    as waypoints in list order so the ETA reflects the actual route.
 */
export function useDirectionsEta() {
  const fetchEta = useCallback(async ({
    origin,
    destination,
    waypoints = [],
    departureMs,
  }: FetchEtaArgs): Promise<EtaResult | null> => {
    const key = env.googleMapsApiKey;
    if (!key) {
      debugLog('Directions', 'Missing EXPO_PUBLIC_GOOGLE_MAPS_API_KEY');
      return null;
    }

    const params = new URLSearchParams({
      origin: encode(origin),
      destination: encode(destination),
      mode: 'driving',
      // Google requires a future or "now" departure_time for traffic data.
      departure_time: String(Math.max(Math.floor((departureMs ?? Date.now()) / 1000), Math.floor(Date.now() / 1000))),
      traffic_model: 'best_guess',
      key,
    });
    if (waypoints.length) {
      params.append('waypoints', waypoints.map(encode).join('|'));
    }

    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?${params.toString()}`;
      const res = await fetch(url);
      const json = (await res.json()) as {
        status: string;
        error_message?: string;
        routes?: {
          legs: {
            duration: { value: number };
            duration_in_traffic?: { value: number };
            distance: { value: number };
          }[];
        }[];
      };
      if (json.status !== 'OK' || !json.routes?.length) {
        debugLog(
          'Directions',
          `status=${json.status}`,
          json.error_message ? `message=${json.error_message}` : '',
        );
        return null;
      }
      const legs = json.routes[0].legs;
      const durationSec = legs.reduce(
        (acc, l) => acc + (l.duration_in_traffic?.value ?? l.duration.value),
        0,
      );
      const distanceM = legs.reduce((acc, l) => acc + l.distance.value, 0);
      return { durationSec, distanceM };
    } catch (e) {
      debugLog('Directions', e instanceof Error ? e.message : 'unknown error');
      return null;
    }
  }, []);

  return { fetchEta };
}
