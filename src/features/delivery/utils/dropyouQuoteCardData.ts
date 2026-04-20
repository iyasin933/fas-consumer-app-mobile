import type { LoadQuoteRow } from '@/features/delivery/socket/loadQuotesSocket.types';

export type DropyouQuoteCardModel = {
  quoteId: number;
  loadId: string;
  bookingId: string;
  companyName: string;
  createdOn: string;
  price: number;
  currency: string;
  vehicleType: string;
  savingsPercentage: number | null;
  isCheaper: boolean;
  originalPrice: number | null;
  /** Positive amount in major units (e.g. GBP) when cheaper vs original list price. */
  savingsAmountMajor: number | null;
};

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function str(v: unknown): string | null {
  if (typeof v === 'string' && v.trim()) return v.trim();
  return null;
}

/** Currencies where the API may send integer amounts in minor units (pence/cents). */
function isTwoMinorDigitCurrency(currency: string): boolean {
  const c = currency.toUpperCase();
  if (c.length !== 3) return true;
  const zeroDecimal = new Set([
    'BIF',
    'CLP',
    'DJF',
    'GNF',
    'JPY',
    'KMF',
    'KRW',
    'MGA',
    'PYG',
    'RWF',
    'UGX',
    'VND',
    'VUV',
    'XAF',
    'XOF',
    'XPF',
  ]);
  return !zeroDecimal.has(c);
}

/**
 * Socket/API amounts: decimals are major units (e.g. GBP `940.8` = £940.80).
 * Whole numbers are treated as minor units (pence), e.g. `1680` → £16.80, `94080` → £940.80.
 * Whole-pound jobs should be sent as floats (e.g. `150.0`) to avoid ambiguity.
 */
export function normalizeMinorOrMajorToMajor(raw: number, currency: string): number {
  if (!Number.isFinite(raw)) return raw;
  if (!isTwoMinorDigitCurrency(currency)) return raw;
  if (!Number.isInteger(raw)) return raw;
  return raw / 100;
}

/**
 * Maps a stored socket row into UI fields for the DropYou quote card.
 * Returns null for non-DropYou sources or malformed payloads.
 *
 * @param fallbackBookingId — screen `route.params.bookingId` when the socket payload omits it.
 */
export function parseDropyouQuoteCardModel(
  row: LoadQuoteRow,
  fallbackBookingId?: string,
): DropyouQuoteCardModel | null {
  if (row.source !== 'dropyou_quote_received') return null;
  if (row.raw == null || typeof row.raw !== 'object') return null;
  const top = row.raw as Record<string, unknown>;
  const quote = top.quote && typeof top.quote === 'object' ? (top.quote as Record<string, unknown>) : null;
  if (!quote) return null;

  const quoteId = num(quote.quoteId);
  if (quoteId == null) return null;

  const loadId = str(quote.loadId) ?? str(quote.load_id) ?? row.loadId;
  const bookingId =
    str(quote.bookingId) ??
    str(quote.booking_id) ??
    str(row.bookingId) ??
    (fallbackBookingId?.trim() || '');
  if (!loadId || !bookingId) return null;

  const companyName =
    str(quote.quoteOwner && typeof quote.quoteOwner === 'object'
      ? (quote.quoteOwner as Record<string, unknown>).companyName
      : null) ??
    str(quote.quote_owner_company_name) ??
    'Carrier';

  const createdOn = str(quote.createdOn) ?? str(quote.eventTime) ?? row.receivedAt;

  const rawTotal = num(quote.totalPrice);
  const rawPrice = num(quote.price);
  const currency = str(quote.currency) ?? 'GBP';

  const priceMajor =
    rawTotal != null
      ? normalizeMinorOrMajorToMajor(rawTotal, currency)
      : rawPrice != null
        ? normalizeMinorOrMajorToMajor(rawPrice, currency)
        : null;
  if (priceMajor == null) return null;

  const vehicleType = str(quote.vehicleType) ?? '—';

  const originalRaw = num(quote.originalPrice);
  const originalMajor =
    originalRaw != null ? normalizeMinorOrMajorToMajor(originalRaw, currency) : null;
  const isCheaper = quote.isCheaper === true;
  const savingsPct = num(quote.savingsPercentage);

  let savingsAmountMajor: number | null = null;
  if (isCheaper && originalMajor != null && originalMajor > priceMajor) {
    savingsAmountMajor = Math.round((originalMajor - priceMajor) * 100) / 100;
  }

  return {
    quoteId,
    loadId,
    bookingId,
    companyName,
    createdOn,
    price: priceMajor,
    currency,
    vehicleType,
    savingsPercentage: savingsPct != null ? Math.min(999, Math.max(0, Math.round(savingsPct))) : null,
    isCheaper,
    originalPrice: originalMajor,
    savingsAmountMajor: savingsAmountMajor != null && savingsAmountMajor > 0 ? savingsAmountMajor : null,
  };
}

/** e.g. "5 Mins Ago" — uses `createdOn` from the quote when present. */
export function formatQuoteRelativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diffMs = Date.now() - t;
  const past = diffMs >= 0;
  const absMin = Math.floor(Math.abs(diffMs) / 60_000);
  if (!past) return 'Just now';
  if (absMin < 1) return 'Just now';
  if (absMin < 60) return `${absMin} Min${absMin === 1 ? '' : 's'} Ago`;
  const absH = Math.floor(absMin / 60);
  if (absH < 24) return `${absH} Hour${absH === 1 ? '' : 's'} Ago`;
  const absD = Math.floor(absH / 24);
  return `${absD} Day${absD === 1 ? '' : 's'} Ago`;
}

export function formatMajorCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.length === 3 ? currency : 'GBP',
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `£${amount.toFixed(2)}`;
  }
}

/** Stripe / `DeliveryPayment` expect smallest unit (pence). `amount` is always major units after parsing. */
export function majorToPence(amount: number, currency: string): number {
  const zeroDecimal = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);
  if (zeroDecimal.has(currency.toUpperCase())) return Math.round(amount);
  return Math.round(amount * 100);
}

export function companyInitials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
