import { api } from '@/api/client';
import type { ActiveTripRaw } from '@/types/activeTrip.types';

type ActiveTripsBody = {
  result?: { bookings?: unknown } | ActiveTripRaw[];
};

export type DropyouQuote = {
  quoteId?: string | number;
  loadId?: string | number;
  price?: string | number;
  currency?: string;
  vehicleType?: string;
  quoteOwnerId?: string | number;
  quoteOwnerCompanyName?: string;
  quoteOwnerPhone?: string;
  eventTime?: string;
  createdOn?: string;
  status?: string;
  totalPrice?: string | number;
  accessorials?: unknown[];
  rawData?: Record<string, unknown>;
  recordCreatedAt?: string;
  recordUpdatedAt?: string;
  [key: string]: unknown;
};

export type DropyouQuotesPage = {
  data: DropyouQuote[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
  };
};

function activeTripsFromResponse(data: unknown): ActiveTripRaw[] {
  if (Array.isArray(data)) return data as ActiveTripRaw[];
  if (!data || typeof data !== 'object') return [];

  const body = data as ActiveTripsBody;
  const result = body.result;

  if (Array.isArray(result)) return result as ActiveTripRaw[];

  if (result && typeof result === 'object' && !Array.isArray(result)) {
    const { bookings } = result as { bookings?: unknown };
    if (Array.isArray(bookings)) return bookings as ActiveTripRaw[];
  }

  return [];
}

function quoteRowsFromResponse(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];

  const body = data as Record<string, unknown>;
  const result = body.result;
  if (Array.isArray(result)) return result;
  if (result && typeof result === 'object') {
    const resultRecord = result as Record<string, unknown>;
    if (Array.isArray(resultRecord.quotes)) return resultRecord.quotes;
    if (Array.isArray(resultRecord.bids)) return resultRecord.bids;
  }

  if (Array.isArray(body.quotes)) return body.quotes;
  if (Array.isArray(body.bids)) return body.bids;

  return [];
}

function numberFrom(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

function quotePageFromResponse(
  data: unknown,
  fallbackPage: number,
  fallbackLimit: number,
): DropyouQuotesPage {
  const fallback = {
    total: 0,
    page: fallbackPage,
    limit: fallbackLimit,
    totalPages: fallbackPage,
    hasNextPage: false,
  };

  if (Array.isArray(data)) {
    return {
      data: data as DropyouQuote[],
      meta: {
        ...fallback,
        total: data.length,
        hasNextPage: data.length >= fallbackLimit,
      },
    };
  }

  if (!data || typeof data !== 'object') return { data: [], meta: fallback };

  const body = data as Record<string, unknown>;
  if (Array.isArray(body.result)) {
    const rawMeta =
      body.meta && typeof body.meta === 'object'
        ? (body.meta as Record<string, unknown>)
        : body.pagination && typeof body.pagination === 'object'
          ? (body.pagination as Record<string, unknown>)
          : body;
    const rows = body.result;
    const total = numberFrom(
      rawMeta.total ?? rawMeta.itemCount ?? rawMeta.count,
      rows.length,
    );
    const page = numberFrom(rawMeta.page, fallbackPage);
    const limit = numberFrom(rawMeta.limit ?? rawMeta.take, fallbackLimit);
    const totalPages = Math.max(
      1,
      numberFrom(rawMeta.totalPages ?? rawMeta.pageCount, Math.ceil(total / limit) || 1),
    );

    return {
      data: rows as DropyouQuote[],
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
      },
    };
  }

  const result =
    body.result && typeof body.result === 'object'
      ? (body.result as Record<string, unknown>)
      : null;
  const source = result ?? body;
  const rows =
    (Array.isArray(source.data) && source.data) ||
    (Array.isArray(source.quotes) && source.quotes) ||
    (Array.isArray(source.results) && source.results) ||
    [];
  const rawMeta =
    source.meta && typeof source.meta === 'object'
      ? (source.meta as Record<string, unknown>)
      : source.pagination && typeof source.pagination === 'object'
        ? (source.pagination as Record<string, unknown>)
        : source;
  const total = numberFrom(
    rawMeta.total ?? rawMeta.itemCount ?? rawMeta.count,
    rows.length,
  );
  const page = numberFrom(rawMeta.page, fallbackPage);
  const limit = numberFrom(rawMeta.limit ?? rawMeta.take, fallbackLimit);
  const totalPages = Math.max(
    1,
    numberFrom(rawMeta.totalPages ?? rawMeta.pageCount, Math.ceil(total / limit) || 1),
  );
  const hasNextPage =
    typeof rawMeta.hasNextPage === 'boolean'
      ? rawMeta.hasNextPage
      : page < totalPages || (rows.length >= limit && total === 0);

  return {
    data: rows as DropyouQuote[],
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage,
    },
  };
}

export async function fetchActiveTrips(): Promise<ActiveTripRaw[]> {
  const res = await api.get<unknown>('/dropyou/active-trips');
  return activeTripsFromResponse(res.data);
}

/** `GET /dropyou/user/:userId` — envelope `{ result: Booking[] }` (array) or `result.bookings`. */
export async function fetchUserBookings(userId: number): Promise<ActiveTripRaw[]> {
  const res = await api.get<unknown>(`/dropyou/user/${userId}`);
  return activeTripsFromResponse(res.data);
}

/** Matches web app: `GET /dropyou/load-by-id/:loadId`. */
export async function fetchLoadDetailsById(loadId: string | number): Promise<unknown> {
  const id = String(loadId).trim();
  if (!id) throw new Error('Missing load id');
  const res = await api.get<unknown>(`/dropyou/load-by-id/${id}`);
  return res.data;
}

/** Matches web app manual refresh: `GET /dropyou/current-location/:loadId`. */
export async function fetchCurrentDropyouLocation(
  loadId: string | number,
): Promise<unknown> {
  const id = String(loadId).trim();
  if (!id) throw new Error('Missing load id');
  const res = await api.get<unknown>(`/dropyou/current-location/${id}`);
  return res.data;
}

export interface RepostBookingBody {
  pickUpDate?: string;
  pickupTime?: string;
  dropOffDate?: string;
  dropoffTime?: string;
  pickUpAddress?: {
    location: { longitude: number; latitude: number };
    address: string;
  };
  dropOffAddress?: {
    location: { longitude: number; latitude: number };
    address: string;
  };
}

/** Repost an expired booking. POST /dropyou/repost/:bookingId */
export async function repostBooking(
  bookingId: string | number,
  body?: RepostBookingBody,
): Promise<unknown> {
  const id = String(bookingId).trim();
  if (!id) throw new Error('Missing booking id');
  const payload = body ?? {};
  if (__DEV__) {
    console.log('[repostBooking] === REQUEST ===');
    console.log('[repostBooking] method: POST');
    console.log('[repostBooking] url:', `/dropyou/repost/${id}`);
    console.log('[repostBooking] bookingId (UUID):', id);
    console.log('[repostBooking] body:', JSON.stringify(payload, null, 2));
  }
  const res = await api.post<unknown>(`/dropyou/repost/${id}`, payload);
  if (__DEV__) {
    console.log('[repostBooking] === RESPONSE ===');
    console.log('[repostBooking] status:', res.status);
    console.log('[repostBooking] data:', JSON.stringify(res.data, null, 2));
  }
  return res.data;
}

/** Extract the new TEG load ID from a repost API success response. */
export function extractLoadIdFromRepostResponse(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;

  const body = data as Record<string, unknown>;

  // Response shapes:
  //   NestJS interceptor wraps: { status, message, result: { tegLoadId } }
  //   Docs shape:               { success, bookingId, tegLoadId }
  //   Nested data:              { data: { tegLoadId } }
  const result =
    (body.result as Record<string, unknown> | undefined);

  const candidates = [
    result?.tegLoadId as string | number | undefined,
    result?.loadId as string | number | undefined,
    result?.id as string | number | undefined,
    body.tegLoadId as string | number | undefined,
    body.loadId as string | number | undefined,
    body.id as string | number | undefined,
    (body.data as Record<string, unknown> | undefined)?.tegLoadId,
    (body.data as Record<string, unknown> | undefined)?.loadId,
    (body.data as Record<string, unknown> | undefined)?.id,
  ];

  for (const id of candidates) {
    if (typeof id === 'number' && Number.isFinite(id)) return String(id);
    if (typeof id === 'string' && id.trim()) return id.trim();
  }

  return null;
}

/** Matches web app: `GET /dropyou/quote-by-load-id/:loadId`. */
export async function fetchQuotesByLoadId(loadId: string | number): Promise<unknown[]> {
  const id = String(loadId).trim();
  if (!id) throw new Error('Missing load id');
  const res = await api.get<unknown>(`/dropyou/quote-by-load-id/${id}`);
  return quoteRowsFromResponse(res.data);
}

/** `GET /dropyou/quotes?page=&limit=` — all TEG quotes for the signed-in consumer. */
export async function fetchDropyouQuotesPage({
  page,
  limit,
}: {
  page: number;
  limit: number;
}): Promise<DropyouQuotesPage> {
  const res = await api.get<unknown>('/dropyou/quotes', {
    params: { page, limit },
  });
  return quotePageFromResponse(res.data, page, limit);
}
