import { useMemo } from 'react';

import manifest from '../../../../assets/transport-icons-manifest.json';

/** Same ID as non-booking duplicate in the manifest (`car_rider_delivery` shares `riderCar`). */
const HOME_GRID_EXCLUDED_IDS = new Set<string>(['car_rider_delivery']);

export type HomeServiceItem = {
  id: string;
  label: string;
  assetKey: string;
};

/** Catalogue from `assets/transport-icons-manifest.json` → `transportAndServiceIcons`. */
export function useHomeServiceCategories(): HomeServiceItem[] {
  return useMemo(
    () =>
      manifest.transportAndServiceIcons
        .filter((row) => !HOME_GRID_EXCLUDED_IDS.has(row.id))
        .map((row) => ({
          id: row.id,
          label: row.displayName,
          assetKey: row.assetKey,
        })),
    [],
  );
}
