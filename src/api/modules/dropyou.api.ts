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
