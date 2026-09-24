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
    // quote-by-load-id returns { result: { data: [...] } }
    if (Array.isArray(resultRecord.data)) return resultRecord.data;
  }

  if (Array.isArray(body.quotes)) return body.quotes;
  if (Array.isArray(body.bids)) return body.bids;
  // Top-level data array (rare but handle it)
  if (Array.isArray(body.data)) return body.data;

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
export async function fetchLoadDetailsById(
  loadId: string | number,
  signal?: AbortSignal,
): Promise<unknown> {
  const id = String(loadId).trim();
  if (!id) throw new Error('Missing load id');
  const res = await api.get<unknown>(`/dropyou/load-by-id/${id}`, { signal });
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
  //   Reposted loads also carry a fresh publicLoadId; fall back to bookingId.
  const result =
    (body.result as Record<string, unknown> | undefined);

  const candidates = [
    result?.tegLoadId as string | number | undefined,
    result?.loadId as string | number | undefined,
    result?.id as string | number | undefined,
    result?.publicLoadId as string | number | undefined,
    result?.bookingId as string | number | undefined,
    body.tegLoadId as string | number | undefined,
    body.loadId as string | number | undefined,
    body.id as string | number | undefined,
    body.publicLoadId as string | number | undefined,
    body.bookingId as string | number | undefined,
    (body.data as Record<string, unknown> | undefined)?.tegLoadId,
    (body.data as Record<string, unknown> | undefined)?.loadId,
    (body.data as Record<string, unknown> | undefined)?.publicLoadId,
    (body.data as Record<string, unknown> | undefined)?.bookingId,
    (body.data as Record<string, unknown> | undefined)?.id,
  ];

  for (const id of candidates) {
    if (typeof id === 'number' && Number.isFinite(id)) return String(id);
    if (typeof id === 'string' && id.trim()) return id.trim();
  }

  return null;
}

export type PodDocumentInfo = {
  id: number | string;
  name?: string;
  documentType?: string;
  fileNameExtension?: string;
  size?: number;
  attachmentType?: string;
  [key: string]: unknown;
};

export type PodDownload = {
  bytes: Uint8Array;
  contentType: string;
  fileName: string | null;
};

/** Matches web app: `GET /dropyou/load/:loadId/pod`. */
export async function fetchPod(loadId: string | number): Promise<unknown> {
  const id = String(loadId).trim();
  if (!id) throw new Error('Missing load id');
  const res = await api.get<unknown>(`/dropyou/load/${id}/pod`);
  const body = res.data as Record<string, unknown> | undefined;
  return body?.result ?? null;
}

function podDocumentsFromResult(result: unknown): PodDocumentInfo[] {
  if (Array.isArray(result)) return result as PodDocumentInfo[];
  if (result && typeof result === 'object') {
    const record = result as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data as PodDocumentInfo[];
    if (Array.isArray(record.documents)) return record.documents as PodDocumentInfo[];
  }
  return [];
}

/** Matches web app: `GET /dropyou/load/:loadId/pod/documents`. */
export async function fetchPodDocuments(
  loadId: string | number,
): Promise<PodDocumentInfo[]> {
  const id = String(loadId).trim();
  if (!id) throw new Error('Missing load id');
  const res = await api.get<unknown>(`/dropyou/load/${id}/pod/documents`);
  const body = res.data as Record<string, unknown> | undefined;
  return podDocumentsFromResult(body?.result);
}

function looksLikeHex(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed.length < 8 || trimmed.length % 2 !== 0) return false;
  return /^[0-9a-fA-F]+$/.test(trimmed);
}

function hexToUint8Array(hex: string): Uint8Array {
  const trimmed = hex.trim();
  const bytes = new Uint8Array(trimmed.length / 2);
  for (let index = 0; index < trimmed.length; index += 2) {
    bytes[index / 2] = parseInt(trimmed.slice(index, index + 2), 16);
  }
  return bytes;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const trimmed = base64.trim();
  if (typeof globalThis.atob === 'function') {
    const binary = globalThis.atob(trimmed);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  }
  const binary = decodeURIComponent(escape(trimmed));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function mimeFromBytes(bytes: Uint8Array): string {
  if (bytes.length >= 4) {
    if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
      return 'application/pdf';
    }
    if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      return 'image/png';
    }
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return 'image/jpeg';
    }
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
      return 'image/gif';
    }
  }
  return 'application/octet-stream';
}

function bytesFromResponse(
  data: unknown,
  contentType: string,
): { bytes: Uint8Array; contentType: string } {
  if (data instanceof ArrayBuffer) {
    return { bytes: new Uint8Array(data), contentType };
  }
  if (ArrayBuffer.isView(data)) {
    return {
      bytes: new Uint8Array(data.buffer, data.byteOffset, data.byteLength),
      contentType,
    };
  }

  if (typeof data === 'string') {
    let payload = data.trim();

    if (payload.startsWith('{') && payload.endsWith('}')) {
      try {
        const parsed = JSON.parse(payload) as Record<string, unknown>;
        const nested =
          (typeof parsed.result === 'string' && parsed.result) ||
          (typeof parsed.data === 'string' && parsed.data) ||
          (typeof parsed.file === 'string' && parsed.file) ||
          null;
        if (nested) payload = nested.trim();
      } catch {
        // ignore
      }
    }

    if (looksLikeHex(payload)) {
      const bytes = hexToUint8Array(payload);
      return { bytes, contentType: mimeFromBytes(bytes) };
    }

    const compact = payload.replace(/\s+/g, '');
    if (
      compact.startsWith('JVBERi0x') ||
      compact.startsWith('/9j/') ||
      compact.startsWith('iVBOR')
    ) {
      const bytes = base64ToUint8Array(compact);
      return { bytes, contentType: mimeFromBytes(bytes) };
    }
  }

  throw new Error('Unsupported POD document payload.');
}

/** Matches web app: `GET /dropyou/load/:loadId/pod/document/:documentId`. */
export async function downloadPodDocument(
  loadId: string | number,
  documentId: string | number,
): Promise<PodDownload> {
  const id = String(loadId).trim();
  const docId = String(documentId).trim();
  if (!id || !docId) throw new Error('Missing load or document id');

  const res = await api.get<unknown>(
    `/dropyou/load/${id}/pod/document/${docId}`,
    { responseType: 'arraybuffer' },
  );
  const contentType = String(res.headers?.['content-type'] ?? '').split(';')[0].trim();
  const { bytes, contentType: finalContentType } = bytesFromResponse(
    res.data,
    contentType,
  );

  const disposition = String(res.headers?.['content-disposition'] ?? '');
  const utf8Match = disposition.match(/filename\*\s*=\s*UTF-8''([^;]+)/i);
  const simpleMatch = disposition.match(/filename\s*=\s*("?)([^";]+)\1/i);
  let fileName = null;
  try {
    fileName = utf8Match?.[1]
      ? decodeURIComponent(utf8Match[1].trim())
      : (simpleMatch?.[2]?.trim() ?? null);
  } catch {
    fileName = simpleMatch?.[2]?.trim() ?? null;
  }

  return { bytes, contentType: finalContentType, fileName };
}

/** Matches web app: `GET /dropyou/quote-by-load-id/:loadId`. */
export async function fetchQuotesByLoadId(
  loadId: string | number,
  signal?: AbortSignal,
): Promise<unknown[]> {
  const id = String(loadId).trim();
  if (!id) throw new Error('Missing load id');
  const res = await api.get<unknown>(`/dropyou/quote-by-load-id/${id}`, {
    signal,
  });
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
