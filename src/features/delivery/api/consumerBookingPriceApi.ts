import { isAxiosError } from 'axios';

import { api } from '@/api/client';
import type { ContentDimensionsDraft, PalletLineDraft } from '@/features/delivery/types';
import { extractRegionHint } from '@/features/delivery/utils/regionHint';
import { durationSecFromHaversineKm, haversineKm } from '@/features/delivery/utils/routeEstimate';
import type { DeliveryTab, PlaceValue } from '@/features/map/types';

/**
 * Fixed route for consumer booking price + vehicle list (`GET` on axios `baseURL`).
 * Contract: [DropYou API — BookingController_getBookingPrice](https://api.dropyou.co.uk/docs#/Booking%2FConsumer/BookingController_getBookingPrice).
 */
const CONSUMER_BOOKING_PRICE_PATH = '/consumer/booking/price';

/**
 * `deliveryType` query value derived only from the **map screen** tab the user chose:
 * Same Day → `same_day`, Scheduled → `scheduled`. (Backend may accept more; we only send these two.)
 */
export type BookingPriceDeliveryTypeFromMapTab = 'same_day' | 'scheduled';

export type DeliveryVehicleDto = {
  id: string;
  name: string;
  type?: string;
  code?: string;
  /**
   * TEG `vehicleTypes[].apiKey` when the booking-price API sends it explicitly
   * (see TEG [load form values](https://docs.dev.transportexchangegroup.com/reference/getloadformvaluesusingget)).
   */
  apiKey?: string;
  /**
   * When the booking-price API returns a TEG `minVehicleSize` token (e.g. `S/Van`, `LWB`),
   * it doubles as the vehicle type key for load creation.
   */
  minVehicleSize?: string;
  minPrice?: number;
  maxPrice?: number;
  /** When set, UI shows VAT-inclusive range: £(max(0, priceWithVat − 50)) – £(priceWithVat). */
  priceWithVat?: number;
};

export type ConsumerBookingPriceParams = {
  /** Route distance in miles, matching the web app / booking-price API contract. */
  distanceMiles: number;
  /** Route duration in minutes, matching the web app / booking-price API contract. */
  durationMinutes: number;
  /** Total declared load in **kilograms**. */
  loadCapacityKg: number;
  /** Top surface / capacity hint in **square metres** (L×W from cm inputs). */
  surfaceAreaM2: number;
  pickupRegion: string;
  dropoffRegion: string;
  deliveryType: BookingPriceDeliveryTypeFromMapTab;
};

export type BuildConsumerBookingPriceInput = {
  pickup: PlaceValue;
  dropoff: PlaceValue;
  routeDistanceM: number | null;
  routeDurationSec: number | null;
  tab: DeliveryTab;
  pallets: PalletLineDraft[];
  dimensions: ContentDimensionsDraft;
};

/** Maps the user's map tab selection to the booking-price `deliveryType` query value. */
export function bookingPriceDeliveryTypeFromMapTab(tab: DeliveryTab): BookingPriceDeliveryTypeFromMapTab {
  return tab === 'sameDay' ? 'same_day' : 'scheduled';
}

/**
 * Builds query inputs from map + draft state. The booking-price endpoint expects
 * the same units as the web app: miles for `distance` and minutes for `duration`.
 */
export function buildConsumerBookingPriceParams(input: BuildConsumerBookingPriceInput): ConsumerBookingPriceParams {
  let distanceKm = (input.routeDistanceM ?? 0) / 1000;
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    distanceKm = haversineKm(input.pickup, input.dropoff);
  }
  distanceKm = Math.max(0.1, distanceKm);
  const distanceMiles = Math.max(0.1, Number((distanceKm * 0.621371).toFixed(2)));

  let durationSec = input.routeDurationSec;
  if (durationSec == null || durationSec <= 0) {
    durationSec = durationSecFromHaversineKm(distanceKm);
  }
  const durationMinutes = Math.max(1, Math.round(durationSec / 60));

  let loadKg = 0;
  for (const p of input.pallets) {
    const w = parseFloat(String(p.weightKg).replace(/,/g, '.'));
    if (Number.isFinite(w) && w > 0) loadKg += w;
  }
  if (loadKg <= 0) loadKg = 1;

  const L = parseFloat(String(input.dimensions.length).replace(/,/g, '.')) || 0;
  const W = parseFloat(String(input.dimensions.width).replace(/,/g, '.')) || 0;
  let surfaceM2 = (L * W) / 10_000;
  if (!Number.isFinite(surfaceM2) || surfaceM2 <= 0) surfaceM2 = 0.01;

  return {
    distanceMiles,
    durationMinutes,
    loadCapacityKg: Math.round(loadKg),
    surfaceAreaM2: Number(surfaceM2.toFixed(4)),
    pickupRegion: extractRegionHint(input.pickup.address),
    dropoffRegion: extractRegionHint(input.dropoff.address),
    deliveryType: bookingPriceDeliveryTypeFromMapTab(input.tab),
  };
}

/** Exact query object sent to axios (for debugging / error UI). */
export function consumerBookingPriceQueryRecord(params: ConsumerBookingPriceParams): Record<string, number | string> {
  return {
    distance: params.distanceMiles,
    duration: params.durationMinutes,
    loadCapacity: params.loadCapacityKg,
    surfaceAreaCapacity: params.surfaceAreaM2,
    pickupRegion: params.pickupRegion,
    dropoffRegion: params.dropoffRegion,
    deliveryType: params.deliveryType,
  };
}

/** Human-readable failure text (status, message, response body). */
export function summarizeConsumerBookingPriceError(error: unknown): string {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const data = error.response?.data;
    const body =
      data === undefined || data === null
        ? ''
        : typeof data === 'string'
          ? data
          : JSON.stringify(data, null, 2);
    const parts = [
      status != null ? `HTTP ${status}` : null,
      error.message || 'Request failed',
      body ? `Response:\n${body}` : null,
    ].filter(Boolean);
    return parts.join('\n\n');
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' ? (v as Record<string, unknown>) : null;
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function asNumber(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** Parses currency-ish strings (`£187.83`, `187,83`, `187.83`) to a float. */
function parseMoneyString(v: unknown): number | undefined {
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  if (!t) return undefined;
  const cleaned = t.replace(/£/g, '').replace(/,/g, '.').replace(/[^\d.]/g, '');
  if (!cleaned || cleaned === '.') return undefined;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

function asMoney(v: unknown): number | undefined {
  return asNumber(v) ?? parseMoneyString(v);
}

function firstDefinedNumber(obj: Record<string, unknown>, keys: string[]): number | undefined {
  for (const k of keys) {
    const n = asMoney(obj[k]);
    if (n != null) return n;
  }
  return undefined;
}

/** Splits `"£10 – £20"` / `10-20` / `10 to 20` into two numbers. */
function parsePriceRangeString(raw: string): { min?: number; max?: number } {
  const s = raw.trim();
  if (!s) return {};
  const split = s.split(/\s*(?:–|-|—|to)\s*/i).map((x) => x.trim()).filter(Boolean);
  if (split.length >= 2) {
    const a = parseMoneyString(split[0]) ?? asNumber(split[0]);
    const b = parseMoneyString(split[1]) ?? asNumber(split[1]);
    if (a != null && b != null) return { min: Math.min(a, b), max: Math.max(a, b) };
    if (a != null) return { min: a, max: a };
  }
  const one = parseMoneyString(s) ?? asNumber(s);
  return one != null ? { min: one, max: one } : {};
}

/**
 * Pulls min/max list prices from whatever shape the booking-price API returns.
 */
function extractVehiclePrices(o: Record<string, unknown>): { min?: number; max?: number } {
  const minKeys = [
    'minPrice',
    'lowPrice',
    'priceFrom',
    'fromPrice',
    'minimumPrice',
    'estimatedMin',
    'min_estimate',
    'priceMin',
    'lowestPrice',
    'startPrice',
    'from',
    'min',
    'lowerBound',
  ];
  const maxKeys = [
    'maxPrice',
    'highPrice',
    'priceTo',
    'toPrice',
    'maximumPrice',
    'estimatedMax',
    'max_estimate',
    'priceMax',
    'highestPrice',
    'endPrice',
    'to',
    'max',
    'upperBound',
  ];

  let minPrice = firstDefinedNumber(o, minKeys);
  let maxPrice = firstDefinedNumber(o, maxKeys);

  const nested =
    asRecord(o.price) ??
    asRecord(o.pricing) ??
    asRecord(o.cost) ??
    asRecord(o.quote) ??
    asRecord(o.estimatedPrice);
  if (nested) {
    minPrice ??= firstDefinedNumber(nested, minKeys);
    maxPrice ??= firstDefinedNumber(nested, maxKeys);
    if (minPrice == null && maxPrice == null) {
      const single = asMoney(nested.total) ?? asMoney(nested.amount) ?? asMoney(nested.value);
      if (single != null) {
        minPrice = single;
        maxPrice = single;
      }
    }
  }

  const rangeStr =
    asString(o.priceRange) ??
    asString(o.price_range) ??
    asString(o.estimatedRange) ??
    asString(o.displayPrice);
  if (rangeStr) {
    const parsed = parsePriceRangeString(rangeStr);
    minPrice = minPrice ?? parsed.min;
    maxPrice = maxPrice ?? parsed.max;
  }

  if (minPrice == null && maxPrice == null) {
    const lone = asMoney(o.price) ?? asMoney(o.totalPrice) ?? asMoney(o.estimatedPrice) ?? asMoney(o.amount);
    if (lone != null) {
      minPrice = lone;
      maxPrice = lone;
    }
  }

  if (minPrice != null && maxPrice == null) maxPrice = minPrice;
  if (maxPrice != null && minPrice == null) minPrice = maxPrice;

  return { min: minPrice ?? undefined, max: maxPrice ?? undefined };
}

function normalizeVehicle(raw: unknown, index: number): DeliveryVehicleDto | null {
  const o = asRecord(raw);
  if (!o) return null;
  const name = asString(o.name) ?? asString(o.title) ?? asString(o.label) ?? 'Vehicle';
  const id =
    asString(o.id) ??
    asString(o.vehicleId) ??
    `${name}-${index}`.replace(/\s+/g, '-').toLowerCase();
  const { min: minPrice, max: maxPrice } = extractVehiclePrices(o);
  const priceObj = asRecord(o.price);
  const priceWithVat =
    asMoney(o.priceWithVat) ??
    asMoney(o.price_with_vat) ??
    asMoney(o.priceWithVAT) ??
    (priceObj ? asMoney(priceObj.withVat) : undefined);

  const tegVehicleKey =
    asString(o.apiKey) ??
    asString(o.api_key) ??
    asString(o.vehicleTypeApiKey) ??
    asString(o.tegVehicleTypeApiKey);

  return {
    id,
    name,
    type: asString(o.type) ?? asString(o.vehicleType) ?? asString(o.category),
    code: asString(o.code) ?? tegVehicleKey,
    apiKey: tegVehicleKey,
    minVehicleSize:
      asString(o.minVehicleSize) ??
      asString(o.min_vehicle_size) ??
      asString(o.tegMinVehicleSize) ??
      asString(o.vehicleSize),
    minPrice,
    maxPrice,
    priceWithVat: priceWithVat != null && Number.isFinite(priceWithVat) ? priceWithVat : undefined,
  };
}

function normalizeVehicleDisplayName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Merges `bestVehicle` + `vehicles`. The API often repeats the recommended vehicle
 * in the list with a **different id**; we dedupe by **id** and by **display name**
 * so the UI does not show two identical rows (e.g. two "Small Van").
 */
function mergeVehicleList(best: unknown, vehicles: unknown): DeliveryVehicleDto[] {
  const out: DeliveryVehicleDto[] = [];
  const seenIds = new Set<string>();
  const seenNames = new Set<string>();

  const push = (raw: unknown, i: number) => {
    const v = normalizeVehicle(raw, i);
    if (!v || seenIds.has(v.id)) return;
    const nameKey = normalizeVehicleDisplayName(v.name);
    if (seenNames.has(nameKey)) return;
    seenIds.add(v.id);
    seenNames.add(nameKey);
    out.push(v);
  };

  if (best) push(best, 0);
  const arr = Array.isArray(vehicles) ? vehicles : [];
  arr.forEach((item, i) => push(item, i + 1));
  return out;
}

/**
 * GET consumer booking price — returns vehicles (best first when provided).
 * Auth: `api` axios instance (Bearer).
 */
export async function fetchConsumerBookingPriceVehicles(
  params: ConsumerBookingPriceParams,
): Promise<DeliveryVehicleDto[]> {
  const { data } = await api.get<unknown>(CONSUMER_BOOKING_PRICE_PATH, {
    params: consumerBookingPriceQueryRecord(params),
  });

  const root = asRecord(data);
  const bucket = asRecord(root?.data) ?? root;
  const result = asRecord(bucket?.result) ?? bucket;
  const bestVehicle = result?.bestVehicle;
  const vehicles = result?.vehicles;
  return mergeVehicleList(bestVehicle, vehicles);
}
