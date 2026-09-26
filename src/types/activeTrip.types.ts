/**
 * Raw shapes from `GET /dropyou/active-trips` (Swagger leaves response body open).
 * Map into view models in `features/home/utils/mapActiveTripToView.ts`.
 */
export type ActiveTripRaw = Record<string, unknown>;

export type ActiveTripListEnvelope = {
  status?: boolean;
  statusCode?: number;
  result?: unknown;
  message?: string;
};

/** Normalized row for `ActiveTripCard`. */
export type ActiveTripCardVm = {
  id: string;
  /** TEG load id used by `GET /dropyou/load-by-id/:loadId`. */
  loadId: string;
  /** DropYou short public load id (e.g. `DY-12345678`). */
  publicLoadId: string;
  /** DropYou booking UUID when present. */
  bookingId: string;
  /** True when proof of delivery was already submitted (backend list flag). */
  podSubmitted?: boolean;
  passengerLabel: string;
  statusLabel: string;
  /** Vehicle label from API — matched in-app to `transport-icons-manifest.json`. */
  vehicleName: string;
  originAddress: string;
  destAddress: string;
  originTimeLabel: string;
  destTimeLabel: string;
  /** Epoch ms for newest-first ordering (0 when unknown). */
  sortTs: number;
};
