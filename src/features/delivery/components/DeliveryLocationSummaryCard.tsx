import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  pickupAddress: string;
  dropoffAddress: string;
  onPressPickup: () => void;
  onPressDropoff: () => void;
};

export function DeliveryLocationSummaryCard({
  pickupAddress,
  dropoffAddress,
  onPressPickup,
  onPressDropoff,
}: Props) {
  const { colors } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surface,
          borderRadius: 14,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.border,
          gap: 0,
        },
        pressRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          paddingVertical: spacing.xs,
        },
        block: {
          flex: 1,
          gap: spacing.xs,
        },
        kicker: {
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.medium,
          color: colors.textSecondary,
          letterSpacing: 0.2,
          textTransform: 'uppercase',
        },
        value: {
          fontSize: typography.fontSize.md,
          fontWeight: '600',
          lineHeight: 22,
          color: colors.textPrimary,
        },
        divider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border,
          marginVertical: spacing.md,
        },
      }),
    [colors.border, colors.surface, colors.textPrimary, colors.textSecondary],
  );

  return (
    <View style={styles.card}>
      <Pressable
        style={({ pressed }) => [styles.pressRow, pressed && { opacity: 0.72 }]}
        onPress={onPressPickup}
        accessibilityRole="button"
        accessibilityLabel="Edit pickup address"
      >
        <View style={styles.block}>
          <Text style={styles.kicker}>Pickup</Text>
          <Text style={styles.value} selectable>
            {pickupAddress}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </Pressable>

      <View style={styles.divider} />

      <Pressable
        style={({ pressed }) => [styles.pressRow, pressed && { opacity: 0.72 }]}
        onPress={onPressDropoff}
        accessibilityRole="button"
        accessibilityLabel="Edit dropoff address"
      >
        <View style={styles.block}>
          <Text style={styles.kicker}>Dropoff</Text>
          <Text style={styles.value} selectable>
            {dropoffAddress}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.muted} />
      </Pressable>
    </View>
  );
}
