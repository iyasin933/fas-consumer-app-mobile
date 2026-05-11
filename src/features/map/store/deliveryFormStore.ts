import { create } from 'zustand';

import type { DeliveryStop, DeliveryTab, PlaceValue, TimeWindow } from '@/features/map/types';
import { MAX_STOPS } from '@/features/map/types';
import { isScheduledPickupBeforeDropoffEnd } from '@/features/map/utils/deliverySchedule';

const genId = () => Math.random().toString(36).slice(2, 10);

/**
 * Ordered identifiers used as the `id` for the permanent Pickup/Dropoff rows.
 * Stop ids are randomly generated so re-ordering won't clash.
 */
export const PICKUP_ID = 'pickup';
export const DROPOFF_ID = 'dropoff';

function calendarDateISO(d: Date): string {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0).toISOString();
}

function currentPickupSchedule(): Pick<DeliveryStop, 'dateISO' | 'window'> {
  const now = new Date();
  const fromISO = now.toISOString();
  return {
    dateISO: calendarDateISO(now),
    window: {
      fromISO,
      toISO: fromISO,
    },
  };
}

const makeRow = (kind: DeliveryStop['kind'], withSchedule = true): DeliveryStop => ({
  id: kind === 'pickup' ? PICKUP_ID : kind === 'dropoff' ? DROPOFF_ID : genId(),
  kind,
  place: null,
  ...(withSchedule && kind === 'pickup' ? currentPickupSchedule() : {}),
});

type State = {
  tab: DeliveryTab;
  /** Flat, ordered list: [pickup, ...stops, dropoff] — ordering can change via drag. */
  rows: DeliveryStop[];
  /** Banner/toast text (used by the screen). */
  toast: string | null;
  /**
   * Last route duration (seconds) from pickup→dropoff Directions leg, used for
   * dropoff min-time validation. Null when route is incomplete.
   */
  routeDurationSec: number | null;
  /** Last route distance (metres) from Directions; null when unknown. */
  routeDistanceM: number | null;
};

type Actions = {
  setTab: (tab: DeliveryTab) => void;
  resetForm: () => void;
  setPlace: (rowId: string, place: PlaceValue | null) => void;
  setStopExtraDropoff: (stopId: string, place: PlaceValue | null) => void;
  toggleStopIsAlsoDropoff: (stopId: string) => void;
  setWindow: (rowId: string, window: TimeWindow | undefined) => void;
  setDateISO: (rowId: string, dateISO: string | undefined) => void;
  addStop: () => { ok: boolean };
  removeStop: (stopId: string) => void;
  reorder: (nextRows: DeliveryStop[]) => void;
  setToast: (msg: string | null) => void;
  setRouteMetrics: (durationSec: number | null, distanceM: number | null) => void;
};

const initialRows = (): DeliveryStop[] => [makeRow('pickup'), makeRow('dropoff')];

export const useDeliveryFormStore = create<State & Actions>((set, get) => ({
  tab: 'scheduled',
  rows: initialRows(),
  toast: null,
  routeDurationSec: null,
  routeDistanceM: null,

  setTab: (tab) => {
    // Switching tabs resets "form fields" but keeps any already-filled addresses
    // (per spec). We clear scheduling info and the stop toggle since they do not
    // apply to the other tab.
    set((s) => ({
      tab,
      routeDurationSec: null,
      routeDistanceM: null,
      rows: s.rows.map((r) => ({
        ...r,
        ...(tab === 'scheduled' && r.kind === 'pickup'
          ? currentPickupSchedule()
          : { window: undefined, dateISO: undefined }),
        isAlsoDropoff: false,
        extraDropoff: null,
      })),
    }));
  },

  resetForm: () =>
    set({
      tab: 'scheduled',
      rows: initialRows(),
      toast: null,
      routeDurationSec: null,
      routeDistanceM: null,
    }),

  setPlace: (rowId, place) =>
    set((s) => ({
      rows: s.rows.map((r) => (r.id === rowId ? { ...r, place } : r)),
    })),

  setStopExtraDropoff: (stopId, place) =>
    set((s) => ({
      rows: s.rows.map((r) => (r.id === stopId ? { ...r, extraDropoff: place } : r)),
    })),

  toggleStopIsAlsoDropoff: (stopId) =>
    set((s) => ({
      rows: s.rows.map((r) =>
        r.id === stopId
          ? {
              ...r,
              isAlsoDropoff: !r.isAlsoDropoff,
              // Clear extra dropoff when toggling off so it doesn't ship hidden data.
              extraDropoff: !r.isAlsoDropoff ? r.extraDropoff : null,
            }
          : r,
      ),
    })),

  setWindow: (rowId, window) =>
    set((s) => ({
      rows: s.rows.map((r) => (r.id === rowId ? { ...r, window } : r)),
    })),

  setDateISO: (rowId, dateISO) =>
    set((s) => ({
      rows: s.rows.map((r) => (r.id === rowId ? { ...r, dateISO } : r)),
    })),

  addStop: () => {
    const rows = get().rows;
    const stopCount = rows.filter((r) => r.kind === 'stop').length;
    if (stopCount >= MAX_STOPS) {
      set({ toast: `You can add up to ${MAX_STOPS} stops.` });
      return { ok: false };
    }
    // Insert before the first dropoff row (respect current reorder).
    const dropoffIdx = rows.findIndex((r) => r.kind === 'dropoff');
    const next = [...rows];
    const insertAt = dropoffIdx >= 0 ? dropoffIdx : rows.length;
    next.splice(insertAt, 0, makeRow('stop', get().tab === 'scheduled'));
    set({ rows: next });
    return { ok: true };
  },

  removeStop: (stopId) =>
    set((s) => ({
      rows: s.rows.filter((r) => !(r.kind === 'stop' && r.id === stopId)),
    })),

  reorder: (nextRows) => {
    // Safety net: enforce the logistic rule [pickup, ...stops, dropoff] even
    // if a caller passes a different ordering. Pickup must always be the
    // origin; dropoff must always be the final destination.
    const pickup = nextRows.find((r) => r.kind === 'pickup');
    const dropoff = nextRows.find((r) => r.kind === 'dropoff');
    const stops = nextRows.filter((r) => r.kind === 'stop');
    if (!pickup || !dropoff) {
      set({ rows: nextRows });
      return;
    }
    set({ rows: [pickup, ...stops, dropoff] });
  },

  setToast: (msg) => set({ toast: msg }),

  setRouteMetrics: (durationSec, distanceM) =>
    set({ routeDurationSec: durationSec, routeDistanceM: distanceM }),
}));

/** Selector helpers. */
export const selectStopRows = (rows: DeliveryStop[]) => rows.filter((r) => r.kind === 'stop');

/** Index-based label (recomputed on every render after drag). */
export function getStopLabel(rows: DeliveryStop[], row: DeliveryStop): string {
  if (row.kind === 'pickup') return 'Pickup';
  if (row.kind === 'dropoff') return 'Dropoff';
  // Identify by id rather than reference so the label stays correct across
  // renders where the row object may be a fresh spread.
  const idx = rows.filter((r) => r.kind === 'stop').findIndex((r) => r.id === row.id);
  return `Stop ${idx + 1}`;
}

/** Pickup/dropoff have a scheduled date and time window (scheduled tab only). */
export function scheduledPickupDropoffComplete(rows: DeliveryStop[]): boolean {
  const pickup = rows.find((r) => r.kind === 'pickup');
  const dropoff = rows.find((r) => r.kind === 'dropoff');
  const rowOk = (r: DeliveryStop | undefined) => Boolean(r?.window?.fromISO && r?.dateISO);
  return rowOk(pickup) && rowOk(dropoff);
}

/**
 * True when the user may proceed: pickup + dropoff addresses always required.
 * On **scheduled** delivery, pickup and dropoff must each have **date** and **time** (four picks total).
 */
export function canProceed(rows: DeliveryStop[], tab: DeliveryTab): boolean {
  const pickup = rows.find((r) => r.kind === 'pickup');
  const dropoff = rows.find((r) => r.kind === 'dropoff');
  const addressesOk = Boolean(pickup?.place?.address) && Boolean(dropoff?.place?.address);
  if (!addressesOk) return false;
  if (tab !== 'scheduled') return true;
  if (!scheduledPickupDropoffComplete(rows)) return false;
  return isScheduledPickupBeforeDropoffEnd(rows, tab);
}
