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

/**
 * The create-intent response carries the publishable key that matches the
 * account which created the PaymentIntent. Prefer it over the build-time
 * `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` so the Payment Sheet can never mismatch.
 */
function pickPublishableKey(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') return undefined;
  const o = payload as Record<string, unknown>;
  const direct = o.publishableKey;
  if (typeof direct === 'string' && direct) return direct;
  for (const key of ['data', 'result'] as const) {
    const nested = o[key];
    if (nested && typeof nested === 'object') {
      const v = (nested as Record<string, unknown>).publishableKey;
      if (typeof v === 'string' && v) return v;
    }
  }
  return undefined;
}

export type CreateDeliveryPaymentIntentResult = {
  clientSecret: string;
  publishableKey?: string;
};

export async function createDeliveryPaymentIntentClientSecret(
  body: CreateDeliveryPaymentIntentBody,
): Promise<CreateDeliveryPaymentIntentResult> {
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
  return { clientSecret: secret, publishableKey: pickPublishableKey(data) };
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
export {
  stringifyResponseData,
  summarizePaymentApiError,
} from '@/features/delivery/api/summarizeApiError';
