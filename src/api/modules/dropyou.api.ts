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

export async function fetchActiveTrips(): Promise<ActiveTripRaw[]> {
  const res = await api.get<unknown>('/dropyou/active-trips');
  return activeTripsFromResponse(res.data);
}

/** `GET /dropyou/user/:userId` — envelope `{ result: Booking[] }` (array) or `result.bookings`. */
export async function fetchUserBookings(userId: number): Promise<ActiveTripRaw[]> {
  const res = await api.get<unknown>(`/dropyou/user/${userId}`);
  return activeTripsFromResponse(res.data);
}
