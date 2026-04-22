import { isAxiosError } from 'axios';

import { api } from '@/api/client';
import { env } from '@/shared/config/env';

/**
 * Creates a PaymentIntent on the server and returns the **client secret** for
 * Stripe Payment Sheet (`initPaymentSheet`).
 *
 * Paths are relative to `api` baseURL (already includes `/api/v1`).
 *
 * **Payment Sheet vs card-token flow:** the mobile Payment Sheet flow expects
 * the server to create a PaymentIntent **without** a `paymentMethodId` first.
 * If your `POST /payment/create-intent` still requires `paymentMethodId`, you
 * cannot use Payment Sheet without relaxing that on the server — the sheet
 * attaches the payment method during `presentPaymentSheet`.
 */
const CREATE_INTENT_PATH = '/payment/create-intent';

export type CreateDeliveryPaymentIntentBody = {
  /**
   * Amount in **minor** units (e.g. pence) as used in-app / navigation params.
   * The create-intent request converts to major units when `env.paymentCreateIntentAmountInMajorUnits` is true (default).
   */
  amount: number;
  currency?: string;
  loadId?: string | number;
};

function clientSecretFromObject(obj: Record<string, unknown>): string | undefined {
  return (
    (typeof obj.clientSecret === 'string' && obj.clientSecret) ||
    (typeof obj.client_secret === 'string' && obj.client_secret) ||
    undefined
  );
}

/** GBP pence → pounds for APIs that expect major units (see `env.paymentCreateIntentAmountInMajorUnits`). */
function penceToMajorGbp(pence: number): number {
  return Math.round(pence) / 100;
}

/** Redact Stripe secrets for Metro logs. */
function redactSecretsForLog(payload: unknown): unknown {
  if (payload == null) return payload;
  if (Array.isArray(payload)) return payload.map((x) => redactSecretsForLog(x));
  if (typeof payload !== 'object') return payload;
  const o = { ...(payload as Record<string, unknown>) };
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (k === 'client_secret' || k === 'clientSecret') {
      o[k] = typeof v === 'string' ? `${v.slice(0, 14)}…[redacted]` : v;
    } else if (v && typeof v === 'object') {
      o[k] = redactSecretsForLog(v) as unknown;
    }
  }
  return o;
}

/** Handles root, `data`, and `result` envelopes (e.g. DropYou `{ result: { client_secret } }`). */
function pickClientSecret(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const o = payload as Record<string, unknown>;
  const direct = clientSecretFromObject(o);
  if (direct) return direct;
  for (const key of ['data', 'result'] as const) {
    const nested = o[key];
    if (nested && typeof nested === 'object') {
      const s = clientSecretFromObject(nested as Record<string, unknown>);
      if (s) return s;
    }
  }
  return undefined;
}

export async function createDeliveryPaymentIntentClientSecret(
  body: CreateDeliveryPaymentIntentBody,
): Promise<string> {
  const useMajor = env.paymentCreateIntentAmountInMajorUnits;
  const amountPayload = useMajor ? penceToMajorGbp(body.amount) : body.amount;

  const requestBody = {
    amount: amountPayload,
    currency: body.currency ?? 'gbp',
    saveCard: false,
    ...(body.loadId != null && String(body.loadId).trim() !== ''
      ? { loadId: String(body.loadId) }
      : {}),
  };

  if (__DEV__) {
    console.log('[DeliveryPayment] POST /payment/create-intent', {
      amountMode: useMajor ? 'major (GBP pounds)' : 'minor (pence)',
      amountSent: amountPayload,
      amountPenceIfMinor: useMajor ? Math.round(amountPayload * 100) : body.amount,
      currency: requestBody.currency,
      loadId: requestBody.loadId,
    });
  }

  const { data } = await api.post(CREATE_INTENT_PATH, requestBody);

  if (__DEV__) {
    try {
      console.log(
        '[DeliveryPayment] create-intent response',
        JSON.stringify(redactSecretsForLog(data), null, 2),
      );
    } catch {
      console.log('[DeliveryPayment] create-intent response (non-JSONable)', data);
    }
  }

  const secret = pickClientSecret(data);
  if (!secret) {
    try {
      console.warn(
        '[DeliveryPayment] create-intent response (no clientSecret in expected shape)',
        JSON.stringify(redactSecretsForLog(data), null, 2),
      );
    } catch {
      console.warn('[DeliveryPayment] create-intent response (non-JSONable)', data);
    }
    throw new Error('Server did not return a PaymentIntent client secret.');
  }
  return secret;
}

export function paymentIntentIdFromClientSecret(clientSecret: string): string {
  const marker = '_secret';
  const i = clientSecret.indexOf(marker);
  if (i <= 0) {
    throw new Error('Invalid PaymentIntent client secret.');
  }
  return clientSecret.slice(0, i);
}

/**
 * Matches the existing mobile confirm route: server finalises the intent after
 * the sheet succeeds (if your backend still expects this call).
 */
export async function confirmPaymentIntentMobile(paymentIntentId: string): Promise<void> {
  const { data } = await api.post<unknown>(`/payment/confirm/${paymentIntentId}?source=ios`);
  if (__DEV__) {
    try {
      console.log(
        '[DeliveryPayment] POST /payment/confirm response',
        typeof data === 'object' && data != null
          ? JSON.stringify(redactSecretsForLog(data), null, 2)
          : String(data),
      );
    } catch {
      console.log('[DeliveryPayment] POST /payment/confirm response (non-JSONable)', data);
    }
  }
}
function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

/** Readable string for logging / support (avoids huge payloads). */
export function stringifyResponseData(data: unknown, max = 1200): string {
  if (data == null) return '';
  if (typeof data === 'string') return truncate(data, max);
  try {
    return truncate(JSON.stringify(data, null, 2), max);
  } catch {
    return truncate(String(data), max);
  }
}

/**
 * Builds a user-visible message from axios error bodies (Laravel, Nest, RFC7807, etc.).
 */
export function summarizePaymentApiError(err: unknown): string {
  if (!isAxiosError(err)) {
    if (err instanceof Error) return err.message;
    return 'Unknown error';
  }

  const status = err.response?.status;
  const raw = err.response?.data;
  let data: unknown = raw;
  /** Some endpoints wrap payload in `{ data: { message, errors } }`. */
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const top = raw as Record<string, unknown>;
    const inner = top.data;
    if (inner && typeof inner === 'object' && !Array.isArray(inner)) {
      const inn = inner as Record<string, unknown>;
      if (inn.message != null || inn.errors != null || inn.error != null) {
        data = inner;
      }
    }
  }
  const lines: string[] = [];

  if (status != null) {
    lines.push(`HTTP ${status}`);
  }

  if (data != null && typeof data === 'object' && !Array.isArray(data)) {
    const o = data as Record<string, unknown>;

    if (typeof o.message === 'string' && o.message.trim()) {
      lines.push(o.message.trim());
    } else if (Array.isArray(o.message)) {
      lines.push(o.message.map(String).join('\n'));
    }

    if (typeof o.error === 'string' && o.error.trim() && o.error !== o.message) {
      lines.push(o.error.trim());
    }

    if (typeof o.detail === 'string' && o.detail.trim()) {
      lines.push(o.detail.trim());
    }

    if (typeof o.title === 'string' && o.title.trim() && o.title !== 'Unprocessable Entity') {
      lines.push(o.title.trim());
    }

    const errors = o.errors;
    if (Array.isArray(errors)) {
      for (const item of errors) {
        if (!item || typeof item !== 'object') continue;
        const e = item as Record<string, unknown>;
        const prop = typeof e.property === 'string' ? e.property : 'field';
        const constraints = e.constraints;
        if (constraints && typeof constraints === 'object' && !Array.isArray(constraints)) {
          const keys = Object.keys(constraints as Record<string, unknown>);
          if (keys.length) {
            lines.push(`${prop}: ${keys.join(', ')}`);
          } else {
            lines.push(`${prop}: invalid`);
          }
        }
      }
    } else if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
      for (const [field, val] of Object.entries(errors as Record<string, unknown>)) {
        const text = Array.isArray(val) ? val.map(String).join(', ') : String(val);
        lines.push(`${field}: ${text}`);
      }
    }
  } else if (typeof data === 'string' && data.trim()) {
    lines.push(data.trim());
  }

  const deduped = [...new Set(lines.filter(Boolean))];
  if (deduped.length === 0) {
    return err.message || 'Request failed';
  }

  const body = deduped.join('\n\n');
  const substantive = deduped.filter(
    (L) =>
      !/^HTTP \d+$/.test(L.trim()) &&
      !/^Unprocessable Entity Exception$/i.test(L.trim()) &&
      !/^Unprocessable Entity$/i.test(L.trim()),
  );
  const generic =
    substantive.length === 0 &&
    (/^Unprocessable Entity/i.test(body) ||
      /Unprocessable Entity Exception/i.test(body) ||
      body.trim() === `HTTP ${status}`);

  if (generic && __DEV__) {
    return `${body}\n\n(Full response is in the Metro / Xcode console.)`;
  }

  if (generic) {
    return `${body}\n\nIf this persists, the server may require fields this app is not sending yet (for example loadId or a different amount unit).`;
  }

  return body;
}
