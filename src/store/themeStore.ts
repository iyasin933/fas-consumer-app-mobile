import { create } from 'zustand';

import type { ThemeScheme } from '@/types/theme.types';

/**
 * Lightweight global UI preferences (extend with persist or system scheme later).
 */
type ThemeState = {
  colorScheme: ThemeScheme;
  setColorScheme: (scheme: ThemeScheme) => void;
};

export const useThemeStore = create<ThemeState>((set) => ({
  colorScheme: 'light',
  setColorScheme: (scheme) => set({ colorScheme: scheme }),
}));
