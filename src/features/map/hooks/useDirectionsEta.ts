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
  /** Decoded road-following route geometry from Google Directions. */
  routeCoords: LatLng[];
};

const encode = ({ latitude, longitude }: LatLng) => `${latitude},${longitude}`;

function decodeOverviewPolyline(encoded: string | undefined): LatLng[] {
  if (!encoded) return [];

  const points: LatLng[] = [];
  let index = 0;
  let latitude = 0;
  let longitude = 0;

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let byte: number;

    do {
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);

    latitude += result & 1 ? ~(result >> 1) : result >> 1;

    result = 0;
    shift = 0;

    do {
      byte = encoded.charCodeAt(index) - 63;
      index += 1;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);

    longitude += result & 1 ? ~(result >> 1) : result >> 1;

    points.push({
      latitude: latitude / 100000,
      longitude: longitude / 100000,
    });
  }

  return points;
}

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
          overview_polyline?: { points?: string };
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
      const routeCoords = decodeOverviewPolyline(json.routes[0].overview_polyline?.points);
      return { durationSec, distanceM, routeCoords };
    } catch (e) {
      debugLog('Directions', e instanceof Error ? e.message : 'unknown error');
      return null;
    }
  }, []);

  return { fetchEta };
}
