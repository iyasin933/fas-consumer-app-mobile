import type { LoadQuoteRow } from '@/features/delivery/socket/loadQuotesSocket.types';

export type DropyouQuoteCardModel = {
  quoteId: string;
  loadId: string;
  bookingId: string;
  companyName: string;
  createdOn: string;
  status: string;
  price: number;
  currency: string;
  vehicleType: string;
  savingsPercentage: number | null;
  isCheaper: boolean;
  isExpensive: boolean;
  showDeal: boolean;
  originalPrice: number | null;
  /** Positive amount in major units (e.g. GBP) when cheaper vs original list price. */
  savingsAmountMajor: number | null;
  dealScore: number | null;
  dealLabel: string | null;
  dealColor: string | null;
  dealDeltaAmountMajor: number | null;
  dealDeltaDirection: 'cheaper' | 'more' | null;
  quoteOwnerId: string | null;
  quoteOwnerPhone: string | null;
  agreedRate: number | null;
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

function bool(v: unknown): boolean {
  if (v === true || v === 1 || v === '1') return true;
  if (typeof v === 'string' && v.trim().toLowerCase() === 'true') return true;
  return false;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === 'object' ? (v as Record<string, unknown>) : null;
}

function scalarString(v: unknown): string | null {
  if (typeof v === 'string' && v.trim()) return v.trim();
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return null;
}

function pickString(o: Record<string, unknown>, keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = scalarString(o[key]);
    if (value) return value;
  }
  return null;
}

function pickNumber(o: Record<string, unknown>, keys: readonly string[]): number | null {
  for (const key of keys) {
    const value = num(o[key]);
    if (value != null) return value;
  }
  return null;
}

function pickBool(o: Record<string, unknown> | null, keys: readonly string[]): boolean | null {
  if (!o) return null;
  for (const key of keys) {
    if (o[key] != null) return bool(o[key]);
  }
  return null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(n, max));
}

function quoteDealLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Great Deal', color: '#2ECC71' };
  if (score >= 75) return { label: 'Good Deal', color: '#2ECC71' };
  if (score >= 45) return { label: 'Fair Price', color: '#F1C40F' };
  if (score >= 30) return { label: 'Expensive', color: '#EC3B35' };
  return { label: 'Very Expensive', color: '#EC3B35' };
}

/** Driver quote payloads match the web app: `totalPrice`, `price`, and `finalQuotePrice` are major units. */
function quoteAmountToMajor(raw: number): number {
  return raw;
}

/**
 * Maps a stored socket row into UI fields for the DropYou quote card.
 * Returns null for malformed payloads.
 *
 * @param fallbackBookingId — screen `route.params.bookingId` when the socket payload omits it.
 */
export function parseDropyouQuoteCardModel(
  row: LoadQuoteRow,
  fallbackBookingId?: string,
  selectedVehiclePriceMajor?: number,
): DropyouQuoteCardModel | null {
  if (row.raw == null || typeof row.raw !== 'object') return null;
  const top = row.raw as Record<string, unknown>;
  const quote = top.quote && typeof top.quote === 'object' ? (top.quote as Record<string, unknown>) : null;
  const payload = quote ?? top;
  const quoteOwner = asRecord(payload.quoteOwner) ?? asRecord(payload.quote_owner);
  const priceComparison = asRecord(payload.priceComparison) ?? asRecord(payload.price_comparison);

  const quoteId = pickString(payload, ['quoteId', 'quote_id']) ?? scalarString(row.quoteId);
  if (!quoteId) return null;

  const loadId = pickString(payload, ['loadId', 'load_id']) ?? row.loadId;
  const bookingId =
    pickString(payload, ['bookingId', 'booking_id']) ??
    scalarString(row.bookingId) ??
    (fallbackBookingId?.trim() || '');
  if (!loadId || !bookingId) return null;

  const companyName =
    str(quoteOwner?.companyName) ??
    str(quoteOwner?.company_name) ??
    str(payload.quote_owner_company_name) ??
    str(payload.companyName) ??
    str(payload.company_name) ??
    str(payload.carrierName) ??
    str(payload.carrier_name) ??
    'Carrier';

  const createdOn = str(payload.createdOn) ?? str(payload.created_on) ?? str(payload.eventTime) ?? row.receivedAt;
  const status = str(payload.status) ?? 'POSTED';
  /** Match web: selectedDriver.quote.quoteOwner.id first, then flat quoteOwnerId. */
  const quoteOwnerId =
    pickString(quoteOwner ?? {}, ['id', 'uuid', 'userId', 'user_id']) ??
    pickString(payload, ['quoteOwnerId', 'quote_owner_id', 'subcontractorId', 'subcontractor_id']);
  const quoteOwnerPhone =
    pickString(payload, ['quoteOwnerPhone', 'quote_owner_phone', 'driverPhoneNumber', 'driver_phone_number']) ??
    pickString(quoteOwner ?? {}, ['phone', 'phoneNumber', 'phone_number']);

  const rawTotal = pickNumber(payload, ['totalPrice', 'total_price', 'total', 'amount']);
  const rawPrice = pickNumber(payload, ['price']);
  const rawFinal = pickNumber(priceComparison ?? {}, ['finalQuotePrice', 'final_quote_price']);
  const currency = str(payload.currency) ?? 'GBP';

  const priceMajor =
    rawTotal != null
      ? quoteAmountToMajor(rawTotal)
      : rawPrice != null
        ? quoteAmountToMajor(rawPrice)
        : rawFinal != null
          ? quoteAmountToMajor(rawFinal)
          : null;
  if (priceMajor == null) return null;

  const vehicleType = str(payload.vehicleType) ?? str(payload.vehicle_type) ?? '—';

  const originalComparisonRaw = pickNumber(priceComparison ?? {}, [
    'originalVehiclePrice',
    'original_vehicle_price',
    'originalPrice',
    'original_price',
  ]);
  const quoteOriginalRate = pickNumber(payload, ['originalPrice', 'original_price', 'agreedRate', 'agreed_rate']);
  const originalMajor = originalComparisonRaw != null ? originalComparisonRaw : null;
  const finalComparisonRaw = pickNumber(priceComparison ?? {}, [
    'finalQuotePrice',
    'final_quote_price',
    'totalPrice',
    'total_price',
  ]);
  const finalPayloadRaw = pickNumber(payload, ['finalQuotePrice', 'final_quote_price']);
  const finalMajor =
    finalComparisonRaw != null
      ? finalComparisonRaw
      : finalPayloadRaw != null
        ? quoteAmountToMajor(finalPayloadRaw)
        : priceMajor;
  const hasComparablePrices = originalMajor != null && originalMajor > 0 && finalMajor > 0;
  const cheaperFlag =
    pickBool(priceComparison, ['isCheaper', 'is_cheaper']) ??
    pickBool(payload, ['isCheaper', 'is_cheaper']) ??
    false;
  const expensiveFlag =
    pickBool(priceComparison, ['isExpensive', 'is_expensive']) ??
    pickBool(payload, ['isExpensive', 'is_expensive']) ??
    false;
  const isCheaper = hasComparablePrices ? finalMajor < originalMajor : cheaperFlag;
  const isExpensive = hasComparablePrices ? finalMajor > originalMajor : expensiveFlag;
  const showDeal = cheaperFlag || expensiveFlag;
  const savingsPct =
    pickNumber(priceComparison ?? {}, [
      'savingsPercentage',
      'savingPercentage',
      'savings_percentage',
      'saving_percentage',
    ]) ?? pickNumber(payload, ['savingsPercentage', 'savingPercentage', 'savings_percentage', 'saving_percentage']);

  let dealScore: number | null = null;
  let dealLabel: string | null = null;
  let dealColor: string | null = null;
  if (showDeal) {
    let adjusted = 50;
    if (hasComparablePrices) {
      const signedDeltaPct = ((originalMajor - finalMajor) / originalMajor) * 100;
      adjusted = 50 + signedDeltaPct / 2;
    } else {
      const magnitude = clamp(savingsPct ?? 0, 0, 100);
      if (isCheaper) adjusted = 50 + magnitude / 2;
      else if (isExpensive) adjusted = 50 - magnitude / 2;
    }
    dealScore = Math.round(clamp(adjusted, 0, 100));
    const deal = quoteDealLabel(dealScore);
    dealLabel = deal.label;
    dealColor = deal.color;
  }

  let savingsAmountMajor: number | null = null;
  if (isCheaper && originalMajor != null && originalMajor > priceMajor) {
    savingsAmountMajor = Math.round((originalMajor - priceMajor) * 100) / 100;
  }
  const dealDeltaAmountMajor =
    selectedVehiclePriceMajor != null && selectedVehiclePriceMajor > 0 && showDeal
      ? Math.round(Math.abs(selectedVehiclePriceMajor - priceMajor) * 100) / 100
      : hasComparablePrices && showDeal
      ? Math.round(Math.abs(originalMajor - finalMajor) * 100) / 100
      : savingsAmountMajor;

  return {
    quoteId,
    loadId,
    bookingId,
    companyName,
    createdOn,
    status,
    price: priceMajor,
    currency,
    vehicleType,
    savingsPercentage: savingsPct != null ? Math.min(999, Math.max(0, Math.round(savingsPct))) : null,
    isCheaper,
    isExpensive,
    showDeal,
    originalPrice: originalMajor,
    savingsAmountMajor: savingsAmountMajor != null && savingsAmountMajor > 0 ? savingsAmountMajor : null,
    dealScore,
    dealLabel,
    dealColor,
    dealDeltaAmountMajor: dealDeltaAmountMajor != null && dealDeltaAmountMajor > 0 ? dealDeltaAmountMajor : null,
    dealDeltaDirection: isExpensive ? 'more' : isCheaper ? 'cheaper' : null,
    quoteOwnerId,
    quoteOwnerPhone,
    agreedRate: quoteOriginalRate ?? originalMajor ?? priceMajor,
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
