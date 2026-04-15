import type { ActiveTripCardVm, ActiveTripRaw } from '@/types/activeTrip.types';

function pickStr(o: unknown, keys: string[]): string {
  if (!o || typeof o !== 'object') return '';
  const r = o as Record<string, unknown>;
  for (const k of keys) {
    const v = r[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

function pickNested(o: unknown, path: string[]): unknown {
  let cur: unknown = o;
  for (const p of path) {
    if (!cur || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

/** Merge root + common nested trip containers so we read fields wherever the API puts them. */
function tripRoots(o: ActiveTripRaw): ActiveTripRaw[] {
  const roots: ActiveTripRaw[] = [o];
  for (const path of [
    ['load'],
    ['trip'],
    ['ride'],
    ['booking'],
    ['order'],
    ['data'],
    ['activeTrip'],
  ]) {
    const n = pickNested(o, path);
    if (n && typeof n === 'object') roots.push(n as ActiveTripRaw);
  }
  return roots;
}

function firstPickStr(roots: ActiveTripRaw[], keys: string[]): string {
  for (const root of roots) {
    const s = pickStr(root, keys);
    if (s) return s;
  }
  return '';
}

function idOf(o: ActiveTripRaw, index: number): string {
  const roots = tripRoots(o);
  const id =
    firstPickStr(roots, ['id', 'uuid', 'loadId', 'bookingId', 'tripId', 'rideId']) ||
    String(pickNested(o, ['load', 'id']) ?? '') ||
    String(pickNested(o, ['trip', 'id']) ?? '') ||
    String(pickNested(o, ['booking', 'id']) ?? '');
  return id || `trip-${index}`;
}

/** Maps API trip/load objects into home card fields (best-effort across shapes). */
export function mapActiveTripToView(o: ActiveTripRaw, index: number): ActiveTripCardVm {
  const roots = tripRoots(o);
  const load = pickNested(o, ['load']);

  const user =
    pickNested(o, ['user']) ??
    pickNested(o, ['passenger']) ??
    pickNested(o, ['customer']) ??
    pickNested(o, ['rider']) ??
    pickNested(o, ['load', 'user']);

  const selectedQuote = pickNested(o, ['selectedQuote']);
  const quoteOwnerLabel =
    selectedQuote && typeof selectedQuote === 'object'
      ? pickStr(selectedQuote as ActiveTripRaw, ['quote_owner_company_name', 'quoteOwnerCompanyName'])
      : '';

  const first = pickStr(user, ['firstName']);
  const last = pickStr(user, ['lastName']);
  const passenger =
    [first, last].filter(Boolean).join(' ') ||
    firstPickStr(roots, ['passengerName', 'customerName', 'riderName', 'driverName']) ||
    pickStr(user as ActiveTripRaw, ['name', 'email', 'phone', 'fullName']) ||
    quoteOwnerLabel ||
    'Passenger';

  const pickup =
    firstPickStr(roots, [
      'pickUpAddress',
      'pickupAddress',
      'originAddress',
      'fromAddress',
      'pickup_location',
      'pickupLocation',
      'origin',
      'from',
      'startAddress',
    ]) ||
    pickStr(load as ActiveTripRaw, ['pickupAddress', 'pickup', 'origin', 'fromAddress']) ||
    pickStr(pickNested(load, ['pickup']), ['address', 'formatted', 'street']) ||
    pickStr(pickNested(o, ['pickUpAddress']), ['address']) ||
    '—';

  const drop =
    firstPickStr(roots, [
      'dropOffAddress',
      'dropoffAddress',
      'destinationAddress',
      'toAddress',
      'deliveryAddress',
      'dropoff_location',
      'dropoffLocation',
      'destination',
      'to',
      'endAddress',
    ]) ||
    pickStr(load as ActiveTripRaw, ['dropoffAddress', 'dropoff', 'destination', 'toAddress']) ||
    pickStr(pickNested(load, ['dropoff']), ['address', 'formatted', 'street']) ||
    pickStr(pickNested(o, ['dropOffAddress']), ['address']) ||
    '—';

  const status =
    firstPickStr(roots, ['status', 'tripStatus', 'bookingStatus', 'rideStatus', 'loadStatus']) ||
    pickStr(load as ActiveTripRaw, ['status']) ||
    'Arriving Soon';

  const originTime =
    firstPickStr(roots, [
      'pickupTime',
      'pick_up_time',
      'scheduledPickup',
      'pickupAt',
      'startTime',
      'departureTime',
    ]) ||
    pickStr(load as ActiveTripRaw, ['pickupTime']) ||
    '—';
  const destTime =
    firstPickStr(roots, [
      'dropoffTime',
      'drop_off_time',
      'deliveryTime',
      'scheduledDropoff',
      'dropoffAt',
      'endTime',
      'arrivalTime',
    ]) ||
    pickStr(load as ActiveTripRaw, ['dropoffTime']) ||
    'ASAP';

  return {
    id: idOf(o, index),
    passengerLabel: passenger,
    statusLabel: status,
    originAddress: pickup,
    destAddress: drop,
    originTimeLabel: originTime,
    destTimeLabel: destTime,
  };
}
