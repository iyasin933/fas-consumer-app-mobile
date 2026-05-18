import { memo, useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { DeliveryVehicleDto } from '@/features/delivery/api/consumerBookingPriceApi';
import { vehicleNameToIconAssetKey } from '@/features/delivery/utils/vehicleToIconAsset';
import { TRANSPORT_ICON_SOURCES, transportIconSource } from '@/features/home/utils/transportIconSources';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

function formatGbp(n: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(n);
}

function priceLabel(v: DeliveryVehicleDto): string {
  if (v.priceWithVat != null && Number.isFinite(v.priceWithVat)) {
    const hi = v.priceWithVat;
    const lo = Math.max(0, hi - 50);
    return `£${lo.toFixed(0)} - £${Math.max(hi, 0).toFixed(0)}`;
  }
  const { minPrice, maxPrice } = v;
  if (minPrice != null && maxPrice != null && minPrice !== maxPrice) {
    return `${formatGbp(minPrice)} – ${formatGbp(maxPrice)}`;
  }
  const single = minPrice ?? maxPrice;
  return single != null ? formatGbp(single) : 'Quote on request';
}

function capacityLabel(v: DeliveryVehicleDto): string | null {
  const parts: string[] = [];

  if (v.loadCapacity != null && Number.isFinite(v.loadCapacity) && v.loadCapacity > 0) {
    parts.push(`Carries up to ${Math.round(v.loadCapacity).toLocaleString('en-GB')} kg`);
  }

  if (v.surfaceAreaCapacity != null && Number.isFinite(v.surfaceAreaCapacity) && v.surfaceAreaCapacity > 0) {
    const areaM2 = v.surfaceAreaCapacity > 100 ? v.surfaceAreaCapacity / 10_000 : v.surfaceAreaCapacity;
    parts.push(`${areaM2.toLocaleString('en-GB', { maximumFractionDigits: 2 })} m²`);
  }

  return parts.length > 0 ? parts.join(' • ') : null;
}

type Props = {
  vehicle: DeliveryVehicleDto;
  selected: boolean;
  onPress: () => void;
};

export const VehicleOptionCard = memo(function VehicleOptionCard({ vehicle, selected, onPress }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const isNarrow = width < 370;
  const assetKey = vehicleNameToIconAssetKey(vehicle.name, vehicle.type ?? vehicle.code);
  const src = transportIconSource(assetKey) ?? TRANSPORT_ICON_SOURCES.delivery;
  const capacity = capacityLabel(vehicle);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: isNarrow ? spacing.sm : spacing.md,
          padding: spacing.md,
          borderRadius: 12,
          backgroundColor: colors.surface,
          borderWidth: 2,
          borderColor: selected ? colors.primary : colors.border,
        },
        art: { width: isNarrow ? 58 : 72, height: isNarrow ? 40 : 48, resizeMode: 'contain' },
        body: { flex: 1, minWidth: 0, gap: 5 },
        name: { fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
        capacity: {
          fontSize: typography.fontSize.sm,
          lineHeight: 18,
          color: colors.textSecondary,
          fontWeight: '600',
        },
        price: { fontSize: typography.fontSize.md, fontWeight: '700', color: colors.textPrimary },
        disc: {
          fontSize: typography.fontSize.sm,
          fontStyle: 'italic',
          color: colors.danger,
        },
      }),
    [
      colors.border,
      colors.danger,
      colors.primary,
      colors.surface,
      colors.textPrimary,
      colors.textSecondary,
      isNarrow,
      selected,
    ],
  );

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <Image source={src} style={styles.art} accessibilityIgnoresInvertColors />
      <View style={styles.body}>
        <Text style={styles.name} numberOfLines={2}>{vehicle.name}</Text>
        {capacity ? (
          <Text style={styles.capacity} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.86}>
            {capacity}
          </Text>
        ) : null}
        <Text style={styles.price} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>
          {priceLabel(vehicle)}
        </Text>
        <Text style={styles.disc}>Prices can vary</Text>
      </View>
    </Pressable>
  );
});
