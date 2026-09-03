import { isAxiosError } from 'axios';

/**
 * Pure, dependency-light API error summarizer (only axios) so it can also be
 * unit-tested in Node. Screens import it via `deliveryPaymentApi` re-exports.
 */

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

/** Friendly, human-readable labels for server validation fields. */
const FIELD_LABELS: Record<string, string> = {
  'recipient.phone': 'Recipient phone',
  'recipient.notes': 'Delivery notes',
  'pickUpAddress.address': 'Pickup address',
  'dropOffAddress.address': 'Dropoff address',
  'pickUpAddress.location': 'Pickup location',
  'dropOffAddress.location': 'Dropoff location',
  pickUpDate: 'Pickup date',
  pickupTime: 'Pickup time',
  dropOffDate: 'Dropoff date',
  dropoffTime: 'Dropoff time',
  'vehicle.apiKey': 'Vehicle',
  'vehicle.name': 'Vehicle',
  'vehicle.price': 'Vehicle price',
  'deliveryContent.palletName': 'Pallet type',
  'deliveryContent.palletValue': 'Value of goods',
  'deliveryContent.palletContent': 'Pallet content',
  'deliveryContent.weight': 'Weight',
  'deliveryContent.length': 'Length',
  'deliveryContent.width': 'Width',
  'deliveryContent.height': 'Height',
  stops: 'Extra stops',
};

/** Next-step hint attached to known field errors. */
const FIELD_HINTS: Record<string, string> = {
  'recipient.phone': 'Check the recipient phone number and try again.',
  'pickUpAddress.address': 'Go back to the map and select a pickup address.',
  'dropOffAddress.address': 'Go back to the map and select a dropoff address.',
};

function friendlyFieldLabel(field: string): string {
  const key = (field || '').trim();
  if (!key) return 'Field';
  return FIELD_LABELS[key] ?? key;
}

function fieldHint(field: string): string | null {
  const key = (field || '').trim();
  return FIELD_HINTS[key] ?? null;
}

/**
 * Builds a user-visible message from axios error bodies (Laravel, Nest, RFC7807, etc.).
 * Handles both class-validator `{ property, constraints }` and the DropYou
 * NestJS `{ field, messages[] }` validation shapes, with friendly labels.
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
          continue;
        }
        // NestJS shape: { field: 'recipient.phone', messages: ['phone must be …'] }
        const field = typeof e.field === 'string' && e.field.trim() ? e.field.trim() : prop;
        const messages = e.messages;
        const msgList: string[] = Array.isArray(messages)
          ? messages.map((m) => String(m).trim()).filter(Boolean)
          : typeof messages === 'string' && messages.trim()
            ? [messages.trim()]
            : [];
        if (msgList.length) {
          lines.push(`${friendlyFieldLabel(field)}: ${msgList.join(', ')}`);
          const hint = fieldHint(field);
          if (hint) lines.push(hint);
        } else if (typeof e.message === 'string' && e.message.trim()) {
          lines.push(`${friendlyFieldLabel(field)}: ${e.message.trim()}`);
          const hint = fieldHint(field);
          if (hint) lines.push(hint);
        } else {
          lines.push(`${friendlyFieldLabel(field)}: invalid`);
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

  // Drop wrapper text ("Validation failed. Check the errors field for details.")
  // when specific field errors were parsed, so the user sees the actionable
  // field-level messages instead.
  const isGenericWrapper = (L: string) =>
    /^Validation failed/i.test(L.trim()) ||
    /^Unprocessable Entity(Exception)?$/i.test(L.trim());

  const fieldErrors = deduped.filter(
    (L) => !/^HTTP \d+$/.test(L.trim()) && !isGenericWrapper(L),
  );
  const filtered = fieldErrors.length > 0 ? fieldErrors : deduped;

  const body = filtered.join('\n\n');
  const substantive = filtered.filter(
    (L) => !/^HTTP \d+$/.test(L.trim()) && !isGenericWrapper(L),
  );
  const generic =
    substantive.length === 0 &&
    (/^Unprocessable Entity/i.test(body) ||
      /^Validation failed/i.test(body) ||
      body.trim() === `HTTP ${status}`);

  if (generic && __DEV__) {
    return `${body}\n\n(Full response is in the Metro / Xcode console.)`;
  }

  if (generic) {
    return `${body}\n\nIf this persists, the server may require fields this app is not sending yet (for example loadId or a different amount unit).`;
  }

  return body;
}
