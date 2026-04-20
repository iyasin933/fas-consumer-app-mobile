import type { ImageSourcePropType } from 'react-native';

import manifest from '../../../../assets/transport-icons-manifest.json';
import { transportIconSource } from '@/features/home/utils/transportIconSources';

const DEFAULT_KEY = 'riderCar';

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Maps an API vehicle name string to a manifest `assetKey` using
 * `transportAndServiceIcons` and `additionalRiderVehicleIcons` in
 * `assets/transport-icons-manifest.json`.
 */
export function vehicleNameToAssetKey(vehicleName: string | undefined | null): string {
  const raw = vehicleName?.trim();
  if (!raw) return DEFAULT_KEY;

  const n = normalize(raw);

  const transport = [...manifest.transportAndServiceIcons].sort(
    (a, b) => b.displayName.length - a.displayName.length,
  );
  for (const row of transport) {
    const dn = normalize(row.displayName);
    if (!dn) continue;
    if (n === dn || n.includes(dn) || dn.includes(n)) {
      return row.assetKey;
    }
  }

  const riders = [...manifest.additionalRiderVehicleIcons].sort(
    (a, b) => b.label.length - a.label.length,
  );
  for (const row of riders) {
    const labelNorm = normalize(row.label);
    if (labelNorm && (n === labelNorm || n.includes(labelNorm) || labelNorm.includes(n))) {
      return row.assetKey;
    }
    const segments = row.label
      .split(/[/|]/)
      .flatMap((p) => p.split(','))
      .map((p) => normalize(p.trim()))
      .filter((p) => p.length >= 2)
      .sort((a, b) => b.length - a.length);
    for (const seg of segments) {
      if (n.includes(seg) || (seg.length <= 32 && seg.includes(n))) {
        return row.assetKey;
      }
    }
  }

  if (/\b(taxi|cab)\b/i.test(raw)) return 'taxiIcon';
  if (/\b(bike|motorcycle|motorbike)\b/i.test(raw)) return 'riderBike';
  if (/\b(courier)\b/i.test(raw)) return 'courier';
  if (/\b(coach|bus)\b/i.test(raw)) return 'busImg';
  if (/\b(scooter|food)\b/i.test(raw)) return 'scootyImg';
  if (/\bdelivery\b/i.test(raw)) return 'delivery';
  if (/\bcar\b/i.test(raw)) return 'riderCar';

  return DEFAULT_KEY;
}

export function vehicleIconSource(vehicleName: string | undefined | null): ImageSourcePropType {
  const key = vehicleNameToAssetKey(vehicleName);
  return transportIconSource(key) ?? transportIconSource(DEFAULT_KEY)!;
}
