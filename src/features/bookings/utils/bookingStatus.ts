import type { ActiveTripCardVm } from '@/types/activeTrip.types';

export const FAILED_STATUS_TERMS = [
  'failed',
  'failure',
  'rejected',
  'cancelled',
  'canceled',
  'declined',
  'error',
];
export const PENDING_STATUS_TERMS = [
  'pending',
  'waiting',
  'processing',
  'requested',
  'created',
  'posted',
  'open',
  'quote',
  'unassigned',
];
export const COMPLETED_STATUS_TERMS = [
  'completed',
  'complete',
  'delivered',
  'delivery_completed',
];
export const EXPIRED_STATUS_TERMS = ['expired'];

export function normalizedStatus(trip: ActiveTripCardVm): string {
  return trip.statusLabel.trim().toLowerCase();
}

/** Web app's ACTIVE tab matches `status === "ACCEPTED"`. */
export function isActiveLoad(trip: ActiveTripCardVm): boolean {
  return trip.statusLabel.trim().toUpperCase() === 'ACCEPTED';
}

export function isFailedLoad(trip: ActiveTripCardVm): boolean {
  const status = normalizedStatus(trip);
  return FAILED_STATUS_TERMS.some((term) => status.includes(term));
}

export function isPendingLoad(trip: ActiveTripCardVm): boolean {
  const status = normalizedStatus(trip);
  return PENDING_STATUS_TERMS.some((term) => status.includes(term));
}

export function isCompletedLoad(trip: ActiveTripCardVm): boolean {
  const status = normalizedStatus(trip);
  return COMPLETED_STATUS_TERMS.some((term) => status.includes(term));
}

export function isExpiredLoad(trip: ActiveTripCardVm): boolean {
  const status = normalizedStatus(trip);
  return EXPIRED_STATUS_TERMS.some((term) => status.includes(term));
}
