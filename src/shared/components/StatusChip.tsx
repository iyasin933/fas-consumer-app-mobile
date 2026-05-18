import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { typography } from '@/shared/theme/typography';

type StatusTone = 'neutral' | 'success' | 'warning' | 'danger';

type Props = {
  label: string;
  tone?: StatusTone;
};

function toneForStatus(label: string): StatusTone {
  const normalized = label.trim().toLowerCase();
  if (['accepted', 'assigned', 'completed', 'delivered', 'paid'].some((v) => normalized.includes(v))) {
    return 'success';
  }
  if (['pending', 'waiting', 'processing', 'requested'].some((v) => normalized.includes(v))) {
    return 'warning';
  }
  if (['cancelled', 'canceled', 'failed', 'rejected'].some((v) => normalized.includes(v))) {
    return 'danger';
  }
  return 'neutral';
}

function palette(colors: ThemeColors, tone: StatusTone) {
  switch (tone) {
    case 'success':
      return { bg: colors.primary + '18', fg: colors.primary, dot: colors.primary };
    case 'warning':
      return { bg: '#FEF3C7', fg: '#92400E', dot: '#F59E0B' };
    case 'danger':
      return { bg: colors.danger + '18', fg: colors.danger, dot: colors.danger };
    case 'neutral':
    default:
      return { bg: colors.border, fg: colors.textSecondary, dot: colors.muted };
  }
}

function createStyles() {
  return StyleSheet.create({
    chip: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: 999,
      paddingHorizontal: 7,
      paddingVertical: 3,
      maxWidth: '100%',
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 3,
    },
    label: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '700',
      letterSpacing: 0,
      textTransform: 'uppercase',
    },
  });
}

export function StatusChip({ label, tone }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(), []);
  const resolvedTone = tone ?? toneForStatus(label);
  const p = palette(colors, resolvedTone);
  const text = label.trim() || 'Unknown';

  return (
    <View style={[styles.chip, { backgroundColor: p.bg }]} accessibilityLabel={`Status: ${text}`}>
      <View style={[styles.dot, { backgroundColor: p.dot }]} />
      <Text numberOfLines={1} style={[styles.label, { color: p.fg }]}>
        {text}
      </Text>
    </View>
  );
}
