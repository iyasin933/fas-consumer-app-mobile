import { api } from '@/api/client';

/**
 * Confirms the chosen carrier quote before opening the payment sheet.
 * `POST /api/v1/dropyou/accept-quote/:bookingId` (base URL is `env.apiUrl`).
 */
export async function acceptDropyouQuote(bookingId: string, quoteId: number | string): Promise<unknown> {
  const id = String(bookingId).trim();
  if (!id) throw new Error('Missing booking id');
  /** Nest `IsString()` expects a JSON string, not a number. */
  const { data } = await api.post<unknown>(`/dropyou/accept-quote/${id}`, {
    quoteId: String(quoteId).trim(),
  });
  return data;
}
