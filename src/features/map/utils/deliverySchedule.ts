import type { DeliveryStop } from '@/features/map/types';

/** Extra slack after drive time before dropoff is allowed (logistics buffer). */
export const DROPOFF_BUFFER_MS = 60 * 60 * 1000;

/**
 * Combine scheduled `dateISO` (calendar day) with `fromISO` (time-of-day from the time pill).
 * If either is missing, falls back to the other / now.
 */
export function mergeStopDateTime(dateISO: string | undefined, fromISO: string | undefined): Date {
  const timeSrc = fromISO ? new Date(fromISO) : new Date();
  const d = new Date(timeSrc);
  if (dateISO) {
    const day = new Date(dateISO);
    d.setFullYear(day.getFullYear(), day.getMonth(), day.getDate());
  }
  return d;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Earliest allowed dropoff instant: pickup datetime + drive duration + buffer.
 * If `routeDurationSec` is null, drive leg is treated as 0 (still enforces buffer after pickup).
 */
export function computeMinDropoffAt(
  rows: DeliveryStop[],
  routeDurationSec: number | null,
): Date | undefined {
  const pickup = rows.find((r) => r.kind === 'pickup');
  if (!pickup) return undefined;
  const pickupAt = mergeStopDateTime(pickup.dateISO, pickup.window?.fromISO);
  const driveMs = Math.max(0, (routeDurationSec ?? 0) * 1000);
  return new Date(pickupAt.getTime() + driveMs + DROPOFF_BUFFER_MS);
}
