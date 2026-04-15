/** Semantic palette; resolved per appearance via `useTheme()`. */
export type ThemeColors = {
  background: string;
  surface: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
  /** Brand accent (DropYou green) */
  primary: string;
  primaryPressed: string;
  danger: string;
  muted: string;
  /** Text/icons on primary-colored surfaces (pill, buttons, FAB on green). */
  onPrimary: string;
};

export const lightColors: ThemeColors = {
  background: '#f8fafc',
  surface: '#ffffff',
  textPrimary: '#0f172a',
  textSecondary: '#475569',
  border: '#e2e8f0',
  primary: '#16a34a',
  primaryPressed: '#15803d',
  danger: '#dc2626',
  muted: '#94a3b8',
  onPrimary: '#ffffff',
};

export const darkColors: ThemeColors = {
  background: '#0f172a',
  surface: '#1e293b',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  border: '#334155',
  primary: '#22c55e',
  primaryPressed: '#16a34a',
  danger: '#f87171',
  muted: '#64748b',
  onPrimary: '#ffffff',
};
