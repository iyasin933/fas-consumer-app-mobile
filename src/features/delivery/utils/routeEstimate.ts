import type { PlaceValue } from '@/features/map/types';

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

/** Great-circle distance in kilometres between two WGS84 points. */
export function haversineKm(a: PlaceValue, b: PlaceValue): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const x =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

const AVG_URBAN_SPEED_KMH = 35;

/** Driving duration estimate (seconds) from straight-line distance at an average urban speed. */
export function durationSecFromHaversineKm(km: number): number {
  return Math.max(60, Math.round((km / AVG_URBAN_SPEED_KMH) * 3600));
}
