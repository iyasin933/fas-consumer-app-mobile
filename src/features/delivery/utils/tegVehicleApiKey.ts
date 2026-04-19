import type { DeliveryVehicleDto } from '@/features/delivery/api/consumerBookingPriceApi';

/**
 * Canonical `vehicleTypes[].apiKey` values from TEG load form values.
 * @see https://docs.dev.transportexchangegroup.com/reference/getloadformvaluesusingget
 */
const TEG_VEHICLE_TYPE_API_KEYS = new Set<string>([
  'Bike',
  'Car',
  'S/Van',
  'M/Van',
  'SWB',
  'Transit',
  'LWB',
  'XLWB',
  'Luton',
  '7.5T',
  '12T',
  '18T',
  '26T',
  '13.6M',
  'Skel 1x20',
  'Skel 2x20',
  'Skel 1x40',
  'Skel 1x44',
  '4ax Trac',
  '6ax Trac',
]);

function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Maps TEG `vehicleTypes[].name` (and close UI labels) → `apiKey`. */
const DISPLAY_NAME_TO_TEG_API_KEY: Record<string, string> = {
  motorcycle: 'Bike',
  bike: 'Bike',
  car: 'Car',
  'small van': 'S/Van',
  'midi van': 'M/Van',
  'swb up to 2.4m': 'SWB',
  'mwb up to 3m': 'Transit',
  'lwb up to 4m': 'LWB',
  'xlwb 4m+': 'XLWB',
  luton: 'Luton',
  '7.5t': '7.5T',
  '12t': '12T',
  '18t': '18T',
  '26t': '26T',
  '13.6m (arctic)': '13.6M',
};

/**
 * Resolves the TEG vehicle-type token for `POST /dropyou/load` → `vehicle.apiKey`
 * (and upstream `minVehicleSize`). Must match {@link TEG_VEHICLE_TYPE_API_KEYS}.
 */
export function resolveTegVehicleApiKeyForPayload(v: DeliveryVehicleDto): string {
  const tryKeys = [v.apiKey, v.code, v.minVehicleSize, v.type];
  for (const raw of tryKeys) {
    const t = raw?.trim();
    if (t && TEG_VEHICLE_TYPE_API_KEYS.has(t)) return t;
  }

  const nameKey = norm(v.name);
  if (DISPLAY_NAME_TO_TEG_API_KEY[nameKey]) return DISPLAY_NAME_TO_TEG_API_KEY[nameKey];

  if (/\bmotorcycle\b|\bbike\b/i.test(v.name)) return 'Bike';
  if (/\bsmall\b.*\bvan\b|\bs\/van\b/i.test(v.name)) return 'S/Van';
  if (/\bmidi\b.*\bvan\b|\bm\/van\b/i.test(v.name)) return 'M/Van';
  if (/\bxlwb\b|\b4m\+/i.test(v.name)) return 'XLWB';
  if (/\blwb\b|long\s*wheel/i.test(v.name)) return 'LWB';
  if (/\btransit\b|\bmwb\b/i.test(v.name)) return 'Transit';
  if (/\bswb\b/i.test(v.name)) return 'SWB';
  if (/\bluton\b/i.test(v.name)) return 'Luton';

  return 'M/Van';
}
