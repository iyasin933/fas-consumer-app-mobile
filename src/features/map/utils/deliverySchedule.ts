import type { DeliveryStop, DeliveryTab } from '@/features/map/types';

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

/**
 * Scheduled pickup instant must be **before** the end of the drop-off window.
 * Same calendar day with evening pickup + morning drop-off fails this check.
 */
export function getScheduledPickupDropoffOrderError(
  tab: DeliveryTab,
  rows: DeliveryStop[],
): string | null {
  if (tab !== 'scheduled') return null;
  const pickup = rows.find((r) => r.kind === 'pickup');
  const drop = rows.find((r) => r.kind === 'dropoff');
  if (!pickup?.dateISO || !pickup.window?.fromISO || !drop?.dateISO || !drop.window?.fromISO) {
    return null;
  }
  const pickupAt = mergeStopDateTime(pickup.dateISO, pickup.window.fromISO);
  const dropEnd = drop.window.toISO
    ? mergeStopDateTime(drop.dateISO, drop.window.toISO)
    : mergeStopDateTime(drop.dateISO, drop.window.fromISO);
  if (pickupAt.getTime() >= dropEnd.getTime()) {
    return 'Scheduled pickup must be before your drop-off time. Open the map and move pickup earlier or drop-off later (same-day morning drop-off cannot be before an evening pickup on the same date).';
  }
  return null;
}

export function isScheduledPickupBeforeDropoffEnd(rows: DeliveryStop[], tab: DeliveryTab): boolean {
  return getScheduledPickupDropoffOrderError(tab, rows) === null;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Earliest allowed dropoff instant: pickup datetime + drive duration + buffer.
 * Dropoff scheduling is route-aware, so it is unavailable until pickup,
 * dropoff, and route duration are all known.
 */
export function computeMinDropoffAt(
  rows: DeliveryStop[],
  routeDurationSec: number | null,
): Date | undefined {
  const pickup = rows.find((r) => r.kind === 'pickup');
  const dropoff = rows.find((r) => r.kind === 'dropoff');
  if (!pickup?.place || !dropoff?.place || routeDurationSec == null) return undefined;
  const pickupAt = mergeStopDateTime(pickup.dateISO, pickup.window?.fromISO);
  const driveMs = Math.max(0, routeDurationSec * 1000);
  return new Date(pickupAt.getTime() + driveMs + DROPOFF_BUFFER_MS);
}
