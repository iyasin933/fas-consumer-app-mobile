import { useMemo } from 'react';

import { useTheme } from '@/hooks/useTheme';

/**
 * Brand + semantic colors for the Map Delivery feature.
 *
 * Brand colors (green / stop-brown / dropoff-red) are FIXED identity colors —
 * they render identically in light and dark mode. Everything else (surface,
 * text, border, muted fills) resolves via the app theme so the screen respects
 * the user's light / dark preference.
 */
export function useMapColors() {
  const { colors, isDark } = useTheme();

  return useMemo(() => {
    const brandGreen = '#2ECC71';
    const stopBrown = '#B45309';
    const dropoffRed = '#DC2626';

    return {
      isDark,
      // Brand identity
      brandGreen,
      brandGreenSoft: isDark ? 'rgba(46, 204, 113, 0.18)' : '#ECFDF5',
      brandGreenSoftBorder: isDark ? 'rgba(46, 204, 113, 0.35)' : '#A7F3D0',
      stopBrown,
      stopBrownSoft: isDark ? 'rgba(180, 83, 9, 0.22)' : '#FEF3C7',
      dropoffRed,

      // Theme-resolved surface / typography
      surface: colors.surface,
      surfaceMuted: isDark ? 'rgba(255,255,255,0.04)' : '#F9FAFB',
      surfaceOverlay: isDark ? 'rgba(0,0,0,0.55)' : 'rgba(17,24,39,0.45)',
      background: colors.background,
      border: colors.border,
      hairline: isDark ? 'rgba(255,255,255,0.08)' : '#F3F4F6',
      textPrimary: colors.textPrimary,
      textSecondary: colors.textSecondary,
      textMuted: colors.muted,

      // Map sheet-specific
      handle: isDark ? '#475569' : '#D1D5DB',
      toastBg: isDark ? 'rgba(226,232,240,0.95)' : 'rgba(17,24,39,0.92)',
      toastText: isDark ? '#0F172A' : '#ffffff',

      // Pill / buttons
      pillReadOnlyBg: isDark ? 'rgba(255,255,255,0.04)' : '#F3F4F6',
      onBrand: '#ffffff',
    };
  }, [colors, isDark]);
}

export type MapColors = ReturnType<typeof useMapColors>;
