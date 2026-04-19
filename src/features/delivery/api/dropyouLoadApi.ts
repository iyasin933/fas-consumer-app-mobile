import { api } from '@/api/client';

import type { DropyouLoadPayload } from '@/features/delivery/api/buildDropyouLoadPayload';
import { summarizePaymentApiError } from '@/features/delivery/api/deliveryPaymentApi';

const DROPYOU_LOAD_PATH = '/dropyou/load';

function logJson(label: string, value: unknown): void {
  try {
    console.log(label, JSON.stringify(value, null, 2));
  } catch {
    console.log(label, String(value));
  }
}

function pickScalarId(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim();
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return undefined;
}

export type CreateDropyouLoadResult = {
  /**
   * Primary load identifier for payment / APIs — TEG `result.id` or `result.loadId`
   * when present, otherwise falls back to `bookingId`.
   */
  loadId: string;
  /** DropYou consumer booking UUID (`result.bookingId`) when the server returns it. */
  bookingId: string | null;
};

/** Parses `{ result: { id, bookingId, loadId } }` from a successful create-load response. */
function parseCreateLoadResult(data: unknown): CreateDropyouLoadResult | null {
  if (data == null || typeof data !== 'object') return null;
  const result = (data as Record<string, unknown>).result;
  if (!result || typeof result !== 'object') return null;
  const r = result as Record<string, unknown>;
  const bookingId = typeof r.bookingId === 'string' && r.bookingId.trim() ? r.bookingId.trim() : null;
  const tegLoadId = pickScalarId(r.loadId) ?? pickScalarId(r.id);
  const loadId = tegLoadId ?? bookingId;
  if (!loadId) return null;
  return { loadId, bookingId };
}

function pickLoadId(payload: unknown): string | undefined {
  if (payload == null) return undefined;
  if (typeof payload === 'string') return payload;
  if (typeof payload !== 'object') return undefined;
  const o = payload as Record<string, unknown>;
  for (const c of [o.loadId, o.id, o.uuid, o.reference]) {
    const id = pickScalarId(c);
    if (id) return id;
  }
  /** Success envelope: `{ result: { id, bookingId } }` (DropYou → TEG). */
  const result = o.result;
  if (result && typeof result === 'object') {
    const r = result as Record<string, unknown>;
    for (const key of ['loadId', 'id', 'bookingId', 'uuid'] as const) {
      const id = pickScalarId(r[key]);
      if (id) return id;
    }
  }
  const data = o.data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    for (const c of [d.loadId, d.id, d.bookingId, d.uuid]) {
      const id = pickScalarId(c);
      if (id) return id;
    }
  }
  return undefined;
}

/** DropYou HTTP 200 with nested `result` from TEG when load id is missing. */
function pickUpstreamLoadErrorMessage(data: unknown): string | null {
  if (data == null || typeof data !== 'object') return null;
  const o = data as Record<string, unknown>;
  const result = o.result;
  if (!result || typeof result !== 'object') return null;
  const err = (result as Record<string, unknown>).error;
  return typeof err === 'string' && err.trim() ? err.trim() : null;
}

export async function createDropyouLoad(body: DropyouLoadPayload): Promise<CreateDropyouLoadResult> {
  if (__DEV__) {
    logJson('[createDropyouLoad] request payload (POST /dropyou/load)', body);
  }
  const res = await api.post(DROPYOU_LOAD_PATH, body);
  const { data } = res;
  const parsed = parseCreateLoadResult(data);
  if (parsed) return parsed;
  const legacyId = pickLoadId(data);
  if (legacyId) return { loadId: legacyId, bookingId: null };
  console.log('[createDropyouLoad] HTTP', res.status, DROPYOU_LOAD_PATH);
  logJson('[createDropyouLoad] response.data (full, no load id parsed)', data);
  const upstream = pickUpstreamLoadErrorMessage(data);
  if (upstream) throw new Error(upstream);
  throw new Error('Server did not return a load id.');
}

export const summarizeDropyouLoadError = summarizePaymentApiError;
