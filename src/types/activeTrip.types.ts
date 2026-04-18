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
  passengerLabel: string;
  statusLabel: string;
  /** Vehicle label from API — matched in-app to `transport-icons-manifest.json`. */
  vehicleName: string;
  originAddress: string;
  destAddress: string;
  originTimeLabel: string;
  destTimeLabel: string;
};
