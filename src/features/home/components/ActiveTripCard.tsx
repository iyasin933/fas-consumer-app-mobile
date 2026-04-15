import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { ActiveTripCardVm } from '@/types/activeTrip.types';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = { trip: ActiveTripCardVm };

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.md,
    },
    head: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    userRow: { flexDirection: 'row', gap: spacing.sm, flex: 1 },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarTxt: { color: colors.onPrimary, fontWeight: typography.fontWeight.bold },
    nameCol: { flex: 1, gap: 2 },
    name: {
      fontWeight: typography.fontWeight.bold,
      color: colors.textPrimary,
      fontSize: typography.fontSize.md,
    },
    meta: { color: colors.textSecondary, fontSize: typography.fontSize.sm },
    van: {
      padding: spacing.xs,
      backgroundColor: colors.background,
      borderRadius: 10,
    },
    timeline: { flexDirection: 'row', gap: spacing.sm },
    colIcon: { alignItems: 'center' },
    dotted: {
      flex: 1,
      width: 2,
      marginVertical: 4,
      borderLeftWidth: 2,
      borderStyle: 'dotted',
      borderColor: colors.border,
      minHeight: 28,
    },
    colText: { flex: 1, gap: spacing.sm },
    addr: { color: colors.textPrimary, fontSize: typography.fontSize.sm, lineHeight: 20 },
    time: { color: colors.textSecondary, fontSize: typography.fontSize.sm, marginTop: 2 },
    padTop: { paddingTop: spacing.sm },
  });
}

export function ActiveTripCard({ trip }: Props) {
  const initial = trip.passengerLabel.trim().charAt(0).toUpperCase() || 'D';
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.userRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>{initial}</Text>
          </View>
          <View style={styles.nameCol}>
            <Text style={styles.name}>{trip.passengerLabel}</Text>
            <Text style={styles.meta}>{trip.statusLabel}</Text>
          </View>
        </View>
        <View style={styles.van}>
          <Ionicons name="car-sport" size={22} color={colors.primary} />
        </View>
      </View>

      <View style={styles.timeline}>
        <View style={styles.colIcon}>
          <Ionicons name="location" size={18} color={colors.primary} />
          <View style={styles.dotted} />
          <Ionicons name="location-outline" size={18} color={colors.muted} />
        </View>
        <View style={styles.colText}>
          <View>
            <Text style={styles.addr}>{trip.originAddress}</Text>
            <Text style={styles.time}>{trip.originTimeLabel}</Text>
          </View>
          <View style={styles.padTop}>
            <Text style={styles.addr}>{trip.destAddress}</Text>
            <Text style={styles.time}>{trip.destTimeLabel}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
