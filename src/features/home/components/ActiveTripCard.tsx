import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { LocationFrameSvg } from '@/features/home/components/LocationFrameSvg';
import { vehicleIconSource } from '@/features/home/utils/vehicleIconFromManifest';
import type { ActiveTripCardVm } from '@/types/activeTrip.types';
import { useTheme } from '@/hooks/useTheme';
import { IllustratedActionCard } from '@/shared/components/IllustratedActionCard';
import { StatusChip } from '@/shared/components/StatusChip';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  trip: ActiveTripCardVm;
  onPress?: () => void;
  disabled?: boolean;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    card: {
      minHeight: 276,
    },
    statusWrap: { alignSelf: 'flex-start', marginTop: spacing.xs },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      flexWrap: 'wrap',
    },
    timeline: { flexDirection: 'row', gap: spacing.sm },
    colRouteArt: {
      width: 28,
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingTop: 2,
    },
    colText: { flex: 1, gap: spacing.sm },
    addr: { color: colors.textPrimary, fontSize: typography.fontSize.sm, lineHeight: 20 },
    time: { color: colors.textSecondary, fontSize: typography.fontSize.sm, marginTop: 2 },
    padTop: { paddingTop: spacing.sm },
    disabled: { opacity: 0.55 },
  });
}

function bookingAccent(colors: ThemeColors, label: string) {
  const normalized = label.toLowerCase();
  if (normalized.includes('fail') || normalized.includes('cancel')) return colors.danger;
  if (normalized.includes('pending')) return '#F59E0B';
  return colors.primary;
}

export function ActiveTripCard({ trip, onPress, disabled }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const vehicleSrc = useMemo(
    () => vehicleIconSource(trip.vehicleName),
    [trip.vehicleName],
  );
  const accent = bookingAccent(colors, trip.statusLabel);

  return (
    <IllustratedActionCard
      title={trip.passengerLabel}
      body={trip.vehicleName || `Booking ${trip.loadId || trip.id}`}
      accent={accent}
      imageSource={vehicleSrc}
      imageBubbleBackgroundColor={colors.surface}
      hideGlow
      hideArtPin
      hideArtArrow
      onPress={onPress}
      disabled={disabled}
      containerStyle={[styles.card, disabled && styles.disabled]}
      accessibilityLabel={`Open booking ${trip.loadId || trip.id}`}
      footer={
        <>
      <View style={styles.statusRow}>
        <StatusChip label={trip.bookingId || trip.loadId || trip.id} tone="neutral" />
        <StatusChip label={trip.statusLabel} />
      </View>
          <View style={styles.timeline}>
            <View
              style={styles.colRouteArt}
              accessibilityLabel="Route from pickup to drop-off"
            >
              <LocationFrameSvg width={28} height={104} />
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
        </>
      }
    />
  );
}
