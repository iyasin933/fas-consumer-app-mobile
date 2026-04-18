/** Domain types for the Map Delivery feature. */

export type LatLng = {
  latitude: number;
  longitude: number;
};

export type PlaceValue = {
  address: string;
  /** Numeric form; always paired with address for map rendering. */
  lat: number;
  lng: number;
  /** Google `place_id`, when known. */
  placeId?: string;
};

/** Two top-level flows inside the delivery form. */
export type DeliveryTab = 'scheduled' | 'sameDay';

/** Time window displayed in the scheduled pills (e.g. 00:45 – 01:15). */
export type TimeWindow = {
  /** ISO date string for the anchor `from` time. */
  fromISO: string;
  /** ISO date string for `to`. */
  toISO: string;
};

/**
 * One row in the draggable list. Pickup and Dropoff are always present;
 * `stop` entries sit between them. When the user toggles a stop as also
 * being a dropoff, we keep the secondary address on `extraDropoff`.
 */
export type DeliveryStop = {
  id: string;
  kind: 'pickup' | 'stop' | 'dropoff';
  place: PlaceValue | null;
  /** Scheduled window chosen for THIS stop (scheduled tab only). */
  window?: TimeWindow;
  /** Selected date for this stop (scheduled tab only). */
  dateISO?: string;
  /** True when a `stop` doubles as a dropoff. */
  isAlsoDropoff?: boolean;
  extraDropoff?: PlaceValue | null;
};

/** Target of the Places Autocomplete modal — tells reducer where to write. */
export type PlacesTarget =
  | { kind: 'pickup' }
  | { kind: 'dropoff' }
  | { kind: 'stop'; stopId: string }
  | { kind: 'stopExtraDropoff'; stopId: string };

export const MAX_STOPS = 5;
