/**
 * Maps API vehicle labels/slugs to bundled keys in `TRANSPORT_ICON_SOURCES`.
 * Backend does not send icon URLs — keep this list aligned with
 * `assets/transport-icons-manifest.json` where possible.
 */
export function vehicleNameToIconAssetKey(name: string, typeSlug?: string): string {
  const raw = `${typeSlug ?? ''} ${name}`.toLowerCase();

  if (/(7\.5|7_5|75t|7\.5t)/.test(raw)) return 'riderSevenFive';
  if (/(luton)/.test(raw)) return 'riderLuton';
  if (/(xlwb|xl\s*wb)/.test(raw)) return 'riderXlWb';
  if (/(lwb)(?!\w)/.test(raw) && !/xlwb/.test(raw)) return 'riderLWb';
  if (/(swb|mwb|medium)/.test(raw)) return 'riderMwb';
  if (/(small|midi|sm\s*van|compact)/.test(raw)) return 'riderSmVan';
  if (/(bike|motorcycle|scooter)/.test(raw)) return 'riderBike';
  if (/(bus|coach|train)/.test(raw)) return 'busImg';
  if (/(courier)/.test(raw)) return 'courier';
  if (/(taxi)/.test(raw)) return 'taxiIcon';
  if (/(car)(?!\s*hire)/.test(raw) || /sedan/.test(raw)) return 'riderCar';

  return 'delivery';
}
