import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation } from '@tanstack/react-query';

import { recordHomeServiceInterest } from '@/features/home/api/homeServiceInterestApi';
import {
  useHomeServiceCategories,
  type HomeServiceItem,
} from '@/features/home/hooks/useHomeServiceCategories';
import { transportIconSource } from '@/features/home/utils/transportIconSources';
import { useTheme } from '@/hooks/useTheme';
import { AppDialog } from '@/shared/components/AppDialog';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

const SERVICE_INTEREST_DIALOG_BODY =
  'We’re excited that you’re eager to use this service! Our team is working hard to bring you the best experience. Currently, this service is still in development, but we’ll notify you as soon as it’s ready to launch.\n\nStay tuned—great things are on the way!';
const COMING_SOON_IMAGE = require('../../../../assets/images/comingsoon.png');

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
      minHeight: 100,
      justifyContent: 'flex-start',
    },
    cellPressed: {
      opacity: 0.78,
      transform: [{ scale: 0.98 }],
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
  const [dialogVisible, setDialogVisible] = useState(false);
  const styles = useMemo(() => createStyles(colors), [colors]);
  const serviceInterest = useMutation({
    mutationFn: recordHomeServiceInterest,
    onError: (error) => {
      if (__DEV__) console.warn('[HomeServiceGrid] service interest failed', error);
    },
  });

  const onServicePress = (item: HomeServiceItem) => {
    setDialogVisible(true);
    serviceInterest.mutate({
      serviceId: item.id,
      serviceName: item.label,
    });
  };

  return (
    <View style={styles.section}>
      <View style={styles.grid}>
        {items.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`${item.label} service`}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={() => onServicePress(item)}
            style={({ pressed }) => [styles.cell, pressed && styles.cellPressed]}
          >
            <IconSlot item={item} styles={styles} />
            <Text style={styles.label} numberOfLines={2}>
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <AppDialog
        visible={dialogVisible}
        title="Thanks for your interest!"
        actionLabel="Got it"
        illustration={COMING_SOON_IMAGE}
        onClose={() => setDialogVisible(false)}
      >
        {SERVICE_INTEREST_DIALOG_BODY}
      </AppDialog>
    </View>
  );
}
