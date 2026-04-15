import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useHomePromo } from '@/features/home/hooks/useHomePromo';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    card: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
    },
    copy: { flex: 1, gap: spacing.sm },
    title: {
      color: colors.onPrimary,
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      lineHeight: 26,
    },
    cta: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(15,23,42,0.85)',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 10,
    },
    ctaText: {
      color: colors.onPrimary,
      fontWeight: typography.fontWeight.bold,
      fontSize: typography.fontSize.sm,
    },
    art: {
      width: 88,
      height: 88,
      borderRadius: 12,
      backgroundColor: 'rgba(255,255,255,0.2)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    artHint: { color: colors.onPrimary, fontSize: 12, opacity: 0.85 },
  });
}

export function HomePromoBanner() {
  const { title, cta } = useHomePromo();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Pressable style={styles.cta} accessibilityRole="button">
            <Text style={styles.ctaText}>{cta}</Text>
          </Pressable>
        </View>
        <View style={styles.art} accessibilityLabel="Promo illustration placeholder">
          <Text style={styles.artHint}>Art</Text>
        </View>
      </View>
    </View>
  );
}
