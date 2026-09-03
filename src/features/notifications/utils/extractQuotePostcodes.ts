type ObjectRecord = Record<string, unknown>;

const UK_POSTCODE_RE =
  /\b(?:GIR\s?0AA|(?:[A-PR-UWYZ][0-9]{1,2}|[A-PR-UWYZ][A-HK-Y][0-9]{1,2}|[A-PR-UWYZ][0-9][A-HJKSTUW]|[A-PR-UWYZ][A-HK-Y][0-9][ABEHMNPRVWXY])\s?[0-9][ABD-HJLNP-UW-Z]{2})\b/i;

function asRecord(value: unknown): ObjectRecord | null {
  return value != null && typeof value === 'object' && !Array.isArray(value)
    ? (value as ObjectRecord)
    : null;
}

function nested(value: unknown, path: string[]): unknown {
  let cur: unknown = value;
  for (const key of path) {
    const record = asRecord(cur);
    if (!record) return undefined;
    cur = record[key];
  }
  return cur;
}

function textAt(value: unknown, paths: string[][]): string {
  for (const path of paths) {
    const raw = nested(value, path);
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
    if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
  }
  return '';
}

function postcodeFromString(value: string): string {
  const match = value.match(UK_POSTCODE_RE);
  return match ? match[0].toUpperCase() : '';
}

function firstPostcode(candidates: string[]): string {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const postcode = postcodeFromString(candidate);
    if (postcode) return postcode;
  }
  return '';
}

function rootsOf(details: unknown): unknown[] {
  const roots: unknown[] = [details];
  const root = asRecord(details);
  for (const wrapper of ['data', 'result']) {
    const inner = root ? root[wrapper] : undefined;
    if (inner) {
      roots.push(inner);
      const deeper =
        (asRecord(inner)?.data as unknown) ?? (asRecord(inner)?.result as unknown);
      if (deeper) roots.push(deeper);
    }
  }
  return roots;
}

function stopPostcodes(details: unknown, role: 'PICKUP' | 'DROPOFF'): string[] {
  const candidates: string[] = [];
  const fallback: string[] = [];

  for (const root of rootsOf(details)) {
    const stopsRaw = nested(root, ['stops']) ?? nested(root, ['data', 'stops']);
    if (!Array.isArray(stopsRaw)) continue;

    const stopTexts = (stop: ObjectRecord): string[] => [
      textAt(stop, [
        ['postcode'],
        ['postCode'],
        ['zipCode'],
        ['address', 'postcode'],
        ['address', 'fullAddress'],
        ['fullAddress'],
        ['displayAddress'],
        ['shortDisplayAddress'],
      ]),
    ];

    stopsRaw.forEach((stopRaw, index) => {
      const stop = asRecord(stopRaw);
      if (!stop) return;
      const type =
        typeof stop.type === 'string' ? stop.type.trim().toUpperCase() : '';
      const isPickup = type === 'PICKUP';
      const isDropoff = type === 'DROPOFF' || type === 'DELIVERY';
      if (role === 'PICKUP' && isPickup) candidates.push(...stopTexts(stop));
      if (role === 'DROPOFF' && isDropoff) candidates.push(...stopTexts(stop));
      if (role === 'PICKUP' && index === 0) fallback.push(...stopTexts(stop));
      if (role === 'DROPOFF' && index === stopsRaw.length - 1) {
        fallback.push(...stopTexts(stop));
      }
    });
  }

  return [...candidates, ...fallback];
}

export type QuotePostcodes = {
  pickup: string;
  dropoff: string;
};

export function extractQuotePostcodes(details: unknown): QuotePostcodes {
  if (!details) return { pickup: '', dropoff: '' };

  const pickupCandidates: string[] = [];
  const dropoffCandidates: string[] = [];

  for (const root of rootsOf(details)) {
    pickupCandidates.push(
      textAt(root, [
        ['fromPostcode'],
        ['from_postcode'],
        ['fromPostCode'],
        ['pickupPostcode'],
        ['pickup_postcode'],
        ['pickUpPostcode'],
        ['pick_up_postcode'],
        ['pickUpPostCode'],
        ['collectionPostcode'],
        ['collection_postcode'],
        ['originPostcode'],
        ['origin_postcode'],
        ['from', 'postcode'],
        ['from', 'postCode'],
        ['from', 'fullAddress'],
        ['from', 'address'],
        ['pickup', 'postcode'],
        ['pickup', 'fullAddress'],
        ['pickUp', 'postcode'],
        ['pickUpAddress', 'postcode'],
        ['pickUpAddress', 'address'],
        ['booking', 'pickUpAddress', 'postcode'],
        ['booking', 'pickUpAddress', 'address'],
        ['booking', 'pickupPostcode'],
        ['booking', 'pickup_postcode'],
        ['fromDisplayAddress'],
        ['fromShortDisplayAddress'],
      ]),
    );
    dropoffCandidates.push(
      textAt(root, [
        ['toPostcode'],
        ['to_postcode'],
        ['toPostCode'],
        ['dropoffPostcode'],
        ['dropoff_postcode'],
        ['dropOffPostcode'],
        ['drop_off_postcode'],
        ['dropOffPostCode'],
        ['deliveryPostcode'],
        ['delivery_postcode'],
        ['destinationPostcode'],
        ['destination_postcode'],
        ['to', 'postcode'],
        ['to', 'postCode'],
        ['to', 'fullAddress'],
        ['to', 'address'],
        ['dropoff', 'postcode'],
        ['dropoff', 'fullAddress'],
        ['dropOff', 'postcode'],
        ['dropOffAddress', 'postcode'],
        ['dropOffAddress', 'address'],
        ['booking', 'dropOffAddress', 'postcode'],
        ['booking', 'dropOffAddress', 'address'],
        ['booking', 'dropoffPostcode'],
        ['booking', 'dropoff_postcode'],
        ['toDisplayAddress'],
        ['toShortDisplayAddress'],
      ]),
    );
  }

  pickupCandidates.push(...stopPostcodes(details, 'PICKUP'));
  dropoffCandidates.push(...stopPostcodes(details, 'DROPOFF'));

  const pickup = firstPostcode(pickupCandidates);
  const dropoff = firstPostcode(dropoffCandidates);

  if (!pickup || !dropoff) {
    const collected: string[] = [];
    for (const root of rootsOf(details)) {
      const walk = (value: unknown, depth: number): void => {
        if (depth > 6 || collected.length >= 2) return;
        const record = asRecord(value);
        if (record) {
          for (const child of Object.values(record)) walk(child, depth + 1);
          return;
        }
        if (Array.isArray(value)) {
          for (const child of value) walk(child, depth + 1);
          return;
        }
        if (typeof value === 'string') {
          const postcode = postcodeFromString(value);
          if (postcode && !collected.includes(postcode)) collected.push(postcode);
        }
      };
      walk(root, 0);
    }
    return {
      pickup: pickup || collected[0] || '',
      dropoff: dropoff || collected[1] || '',
    };
  }

  return { pickup, dropoff };
}
