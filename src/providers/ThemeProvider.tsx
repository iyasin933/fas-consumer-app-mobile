import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';

import {
  getAppearancePreference,
  setAppearancePreference as persistAppearancePreference,
  type AppearancePreference,
} from '@/services/appearancePreference.service';
import { darkColors, lightColors, type ThemeColors } from '@/shared/theme/colors';

export type AppTheme = {
  colorScheme: 'light' | 'dark';
  isDark: boolean;
  colors: ThemeColors;
  /** User choice; `'system'` follows OS appearance. */
  appearancePreference: AppearancePreference;
  setAppearancePreference: (preference: AppearancePreference) => void;
};

const ThemeContext = createContext<AppTheme | null>(null);

function resolveScheme(pref: AppearancePreference, systemLightDark: 'light' | 'dark' | null): 'light' | 'dark' {
  if (pref === 'light') return 'light';
  if (pref === 'dark') return 'dark';
  return systemLightDark ?? 'light';
}

/**
 * Resolves light/dark from `appearancePreference` (`system` uses `useColorScheme()`).
 * Persisted under AsyncStorage (`appearancePreference.service`).
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const systemScheme: 'light' | 'dark' = system === 'dark' ? 'dark' : 'light';

  const [appearancePreference, setAppearancePreferenceState] =
    useState<AppearancePreference>('system');

  useEffect(() => {
    void (async () => {
      const stored = await getAppearancePreference();
      if (stored) setAppearancePreferenceState(stored);
    })();
  }, []);

  const setAppearancePreference = useCallback((preference: AppearancePreference) => {
    setAppearancePreferenceState(preference);
    void persistAppearancePreference(preference);
  }, []);

  const colorScheme = useMemo(
    () => resolveScheme(appearancePreference, systemScheme),
    [appearancePreference, systemScheme],
  );

  const value = useMemo<AppTheme>(
    () => ({
      colorScheme,
      isDark: colorScheme === 'dark',
      colors: colorScheme === 'dark' ? darkColors : lightColors,
      appearancePreference,
      setAppearancePreference,
    }),
    [colorScheme, appearancePreference, setAppearancePreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): AppTheme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
