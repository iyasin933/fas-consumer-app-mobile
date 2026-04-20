const UK_POSTCODE = /([A-Z]{1,2}\d[A-Z0-9]?\s*\d[A-Z]{2})/i;

/**
 * Best-effort region string for pricing APIs — prefers a UK postcode when present.
 */
export function extractRegionHint(address: string): string {
  const trimmed = address.trim();
  if (!trimmed) return 'UK';
  const m = trimmed.match(UK_POSTCODE);
  if (m) return m[1].replace(/\s+/g, ' ').trim().toUpperCase();
  const parts = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
  const tail = parts[parts.length - 1];
  return (tail ?? trimmed).slice(0, 48);
}
