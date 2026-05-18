import { api } from '@/api/client';
import type { ActiveTripRaw } from '@/types/activeTrip.types';

type ActiveTripsBody = {
  result?: { bookings?: unknown } | ActiveTripRaw[];
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

/** Matches web app: `GET /dropyou/quote-by-load-id/:loadId`. */
export async function fetchQuotesByLoadId(loadId: string | number): Promise<unknown[]> {
  const id = String(loadId).trim();
  if (!id) throw new Error('Missing load id');
  const res = await api.get<unknown>(`/dropyou/quote-by-load-id/${id}`);
  return quoteRowsFromResponse(res.data);
}
