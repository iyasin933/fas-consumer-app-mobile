const STATUS_LABELS: Record<string, string> = {
  BOOKED: 'Booked',
  PENDING: 'Pending',
  POSTED: 'Posted',
  CONFIRMED: 'Driver confirmed',
  ACCEPTED: 'Driver assigned',
  ON_WAY_TO_PICK_UP: 'On the way to pick up',
  ON_MY_WAY_TO_PICK_UP: 'On the way to pick up',
  ON_SITE_TO_PICK_UP: 'Arrived at pickup',
  ON_SITE_PICK_UP: 'Arrived at pickup',
  ON_SITE_LOADING: 'Loading goods',
  LOADED: 'Goods loaded',
  ON_SITE_DELIVERY: 'Arrived at delivery',
  DELIVERED: 'Delivered',
  COMPLETED: 'Delivered',
  CANCELLED: 'Cancelled',
  CANCELED: 'Cancelled',
  RESCHEDULED: 'Rescheduled',
  EXPIRED: 'Expired',
  FAILED: 'Failed',
  REJECTED: 'Rejected',
  IN_TRANSIT: 'In transit',
  IN_PROGRESS: 'In progress',
};

const STATUS_DESCRIPTIONS: Record<string, string> = {
  ACCEPTED: 'Your driver is getting ready to start the delivery.',
  CONFIRMED: 'Your driver has confirmed and is preparing to head out.',
  ON_WAY_TO_PICK_UP: 'Your driver is on the way to the pickup address.',
  ON_MY_WAY_TO_PICK_UP: 'Your driver is on the way to the pickup address.',
  ON_SITE_TO_PICK_UP: 'Your driver has arrived at the pickup address.',
  ON_SITE_PICK_UP: 'Your driver has arrived at the pickup address.',
  ON_SITE_LOADING: 'Your driver is loading your goods.',
  LOADED: 'Your goods are loaded and the driver is heading to delivery.',
  ON_SITE_DELIVERY: 'Your driver is on the way to the delivery address.',
  DELIVERED: 'Your delivery has been completed.',
  COMPLETED: 'Your delivery has been completed.',
  CANCELLED: 'This delivery has been cancelled.',
  CANCELED: 'This delivery has been cancelled.',
};

export function friendlyStatusLabel(status: string | null | undefined): string {
  const raw = status?.trim();
  if (!raw) return 'Update';

  const mapped = STATUS_LABELS[raw.toUpperCase()];
  if (mapped) return mapped;

  const spaced = raw.replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
  if (!spaced) return 'Update';
  if (spaced !== spaced.toUpperCase()) return spaced;

  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

export function statusDescription(
  status: string | null | undefined,
): string | null {
  const raw = status?.trim();
  if (!raw) return null;
  return STATUS_DESCRIPTIONS[raw.toUpperCase()] ?? null;
}

/** Quote (bid) states — separate from booking/load states. */
const QUOTE_STATUS_LABELS: Record<string, string> = {
  POSTED: 'Open bid',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled',
  CANCELED: 'Cancelled',
  EXPIRED: 'Expired',
};

export function quoteStatusLabel(status: string | null | undefined): string {
  const raw = (status ?? '').trim().toUpperCase();
  return QUOTE_STATUS_LABELS[raw] ?? (raw || 'Posted');
}

export type QuoteAcceptBlock = {
  /** Short label shown on disabled accept buttons. */
  reason: 'Delivered' | 'Cancelled' | 'Expired' | 'Failed' | 'Rejected' | 'Driver assigned';
  /** Full sentence shown in the read-only notice. */
  notice: string;
};

/** Load statuses where a driver is already on the job — bids become read-only. */
const DRIVER_ACTIVE_STATUSES = new Set([
  'accepted',
  'confirmed',
  'assigned',
  'driver_assigned',
  'delivery_assigned',
  'on_way_to_pick_up',
  'on_my_way_to_pick_up',
  'on_site_to_pick_up',
  'on_site_pick_up',
  'on_site_loading',
  'loaded',
  'on_site_delivery',
  'in_transit',
  'in_progress',
  'en_route',
  'picked_up',
  'collected',
  'collecting',
  'at_pickup',
  'at_dropoff',
  'rescheduled',
]);

/** Statuses that genuinely mean the job is finished. */
const DELIVERED_STATUSES = new Set([
  'delivered',
  'completed',
  'complete',
  'pod_received',
  'pod_signed',
  'pod_uploaded',
  'pod_verified',
]);

/**
 * Whether accepting a quote is still allowed for this load status.
 *
 * Order matters: cancelled/expired/failed/rejected win over any other
 * substring, and "delivered" only matches genuine completion statuses —
 * NOT active delivery states such as `ON_SITE_DELIVERY` or wrappers like
 * `CANCELLED_DELIVERY` (previously misreported as "Delivered").
 */
export function quoteAcceptBlockReason(
  status: string | null | undefined,
): QuoteAcceptBlock | null {
  const normalized = (status ?? '').trim().toLowerCase();
  if (!normalized) return null;

  if (normalized.includes('cancel')) {
    return {
      reason: 'Cancelled',
      notice: 'This booking was cancelled, so quotes can no longer be accepted.',
    };
  }
  if (normalized.includes('expired')) {
    return {
      reason: 'Expired',
      notice: 'This booking has expired, so quotes can no longer be accepted.',
    };
  }
  if (normalized.includes('failed')) {
    return {
      reason: 'Failed',
      notice: 'This booking failed, so quotes can no longer be accepted.',
    };
  }
  if (normalized.includes('reject')) {
    return {
      reason: 'Rejected',
      notice: 'This booking was rejected, so quotes can no longer be accepted.',
    };
  }

  const deliveredExact = DELIVERED_STATUSES.has(normalized);
  const deliveredPrefixed =
    normalized.startsWith('deliver') &&
    (normalized.endsWith('delivered') || normalized.includes('complet'));
  if (deliveredExact || deliveredPrefixed) {
    return {
      reason: 'Delivered',
      notice: 'This booking has been delivered, so quotes can no longer be accepted.',
    };
  }

  if (DRIVER_ACTIVE_STATUSES.has(normalized)) {
    return {
      reason: 'Driver assigned',
      notice: 'A driver is already on this job, so quotes are read-only.',
    };
  }

  return null;
}
