import { useMemo } from 'react';

export type HomeServiceItem = {
  id: string;
  label: string;
};

/** Static catalogue; swap cells for image assets when ready. */
export function useHomeServiceCategories(): HomeServiceItem[] {
  return useMemo(
    () => [
      { id: 'car', label: 'Car Hire' },
      { id: 'delivery', label: 'Delivery' },
      { id: 'food', label: 'Food' },
      { id: 'taxi', label: 'Taxi' },
      { id: 'courier', label: 'Courier' },
      { id: 'train', label: 'Train/Coach' },
    ],
    [],
  );
}
