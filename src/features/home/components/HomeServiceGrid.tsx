import { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import {
  useHomeServiceCategories,
  type HomeServiceItem,
} from '@/features/home/hooks/useHomeServiceCategories';
import { transportIconSource } from '@/features/home/utils/transportIconSources';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    section: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: spacing.md,
    },
    cell: {
      width: '30%',
      alignItems: 'center',
      gap: spacing.xs,
    },
    iconBox: {
      width: 56,
      height: 56,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconGlyph: {
      color: colors.primary,
      fontWeight: typography.fontWeight.bold,
      fontSize: typography.fontSize.md,
    },
    iconImage: {
      width: 40,
      height: 40,
    },
    label: {
      textAlign: 'center',
      fontSize: typography.fontSize.sm,
      color: colors.textPrimary,
      fontWeight: typography.fontWeight.medium,
    },
  });
}

function IconSlot({ item, styles }: { item: HomeServiceItem; styles: ReturnType<typeof createStyles> }) {
  const source = transportIconSource(item.assetKey);
  const glyph = item.label.trim().charAt(0).toUpperCase();
  return (
    <View style={styles.iconBox} accessibilityLabel={`${item.label}`}>
      {source ? (
        <Image source={source} style={styles.iconImage} resizeMode="contain" accessibilityIgnoresInvertColors />
      ) : (
        <Text style={styles.iconGlyph}>{glyph}</Text>
      )}
    </View>
  );
}

export function HomeServiceGrid() {
  const items = useHomeServiceCategories();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.section}>
      <View style={styles.grid}>
        {items.map((item) => (
          <View key={item.id} style={styles.cell}>
            <IconSlot item={item} styles={styles} />
            <Text style={styles.label} numberOfLines={2}>
              {item.label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
