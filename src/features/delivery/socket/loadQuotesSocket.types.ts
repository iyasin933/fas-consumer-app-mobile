/**
 * Socket payloads for load quotes (DropYou / TEG). Shapes vary by backend version —
 * always read defensively.
 */

export type LoadQuoteSocketSource = 'dropyou_quote_received' | 'teg_quotes';

export type LoadQuoteRow = {
  quoteId: string;
  loadId: string;
  bookingId?: string;
  receivedAt: string;
  source: LoadQuoteSocketSource;
  raw: unknown;
};

/** Narrow a quote event into a stable row for the store; returns null if unusable. */
export function normalizeQuoteSocketPayload(data: unknown): Omit<LoadQuoteRow, 'receivedAt' | 'source'> | null {
  if (data == null || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const quote = d.quote && typeof d.quote === 'object' ? (d.quote as Record<string, unknown>) : null;

  const quoteIdRaw = quote?.quoteId ?? quote?.quote_id ?? d.quoteId ?? d.quote_id;
  const loadIdRaw = quote?.loadId ?? quote?.load_id ?? d.loadId ?? d.load_id;
  const bookingIdRaw = quote?.bookingId ?? quote?.booking_id ?? d.bookingId ?? d.booking_id;

  const loadId = loadIdRaw != null ? String(loadIdRaw).trim() : '';
  if (!loadId) return null;

  const quoteId =
    quoteIdRaw != null && String(quoteIdRaw).trim() !== ''
      ? String(quoteIdRaw).trim()
      : `anon-${loadId}-${Date.now()}`;

  let bookingId: string | undefined;
  if (typeof bookingIdRaw === 'string' && bookingIdRaw.trim()) bookingId = bookingIdRaw.trim();
  else if (bookingIdRaw != null && typeof bookingIdRaw !== 'object')
    bookingId = String(bookingIdRaw).trim() || undefined;

  return { quoteId, loadId, bookingId, raw: data };
}
