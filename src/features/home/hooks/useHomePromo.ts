import { useMemo } from 'react';

export function useHomePromo() {
  return useMemo(
    () => ({
      title: 'Start your delivery\nExperience now!',
      cta: 'Start Now',
    }),
    [],
  );
}
