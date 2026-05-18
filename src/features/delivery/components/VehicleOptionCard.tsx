import { memo, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { DeliveryVehicleDto } from '@/features/delivery/api/consumerBookingPriceApi';
import { vehicleNameToIconAssetKey } from '@/features/delivery/utils/vehicleToIconAsset';
import {
  TRANSPORT_ICON_SOURCES,
  transportIconSource,
} from '@/features/home/utils/transportIconSources';
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

  if (
    v.surfaceAreaCapacity != null &&
    Number.isFinite(v.surfaceAreaCapacity) &&
    v.surfaceAreaCapacity > 0
  ) {
    const areaM2 =
      v.surfaceAreaCapacity > 100
        ? v.surfaceAreaCapacity / 10_000
        : v.surfaceAreaCapacity;
    parts.push(`${areaM2.toLocaleString('en-GB', { maximumFractionDigits: 2 })} m²`);
  }

  return parts.length > 0 ? parts.join(' • ') : null;
}

type Props = {
  vehicle: DeliveryVehicleDto;
  selected: boolean;
  onPress: () => void;
};

export const VehicleOptionCard = memo(function VehicleOptionCard({
  vehicle,
  selected,
  onPress,
}: Props) {
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
          minHeight: isNarrow ? 186 : 168,
          borderRadius: 18,
          padding: spacing.md,
          backgroundColor: colors.surface,
          borderWidth: selected ? 2 : 1,
          borderColor: selected ? colors.primary : colors.border,
          overflow: 'hidden',
          justifyContent: 'center',
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.08,
              shadowRadius: 16,
            },
            android: { elevation: selected ? 3 : 1 },
            default: {},
          }),
        },
        cardPressed: {
          opacity: 0.9,
          transform: [{ scale: 0.99 }],
        },
        copy: {
          width: isNarrow ? '72%' : '64%',
          gap: spacing.xs,
          zIndex: 2,
        },
        pricePill: {
          alignSelf: 'flex-start',
          borderRadius: 999,
          paddingHorizontal: spacing.sm,
          paddingVertical: 5,
          backgroundColor: colors.primary + '12',
        },
        price: {
          color: colors.primary,
          fontSize: typography.fontSize.sm,
          fontWeight: '800',
        },
        name: {
          marginTop: spacing.xs,
          fontSize: isNarrow ? typography.fontSize.lg : 27,
          lineHeight: isNarrow ? 25 : 32,
          fontWeight: typography.fontWeight.bold,
          color: colors.textPrimary,
        },
        capacity: {
          fontSize: typography.fontSize.sm,
          lineHeight: 20,
          color: colors.textSecondary,
          fontWeight: '500',
        },
        disc: {
          fontSize: typography.fontSize.sm,
          fontStyle: 'italic',
          color: colors.danger,
        },
        cornerGraphic: {
          position: 'absolute',
          right: -30,
          bottom: -44,
          width: isNarrow ? 132 : 150,
          height: isNarrow ? 132 : 150,
          borderRadius: isNarrow ? 66 : 75,
          backgroundColor: colors.primary + '10',
          pointerEvents: 'none',
        },
        routeLine: {
          position: 'absolute',
          left: 18,
          right: -16,
          top: isNarrow ? 46 : 54,
          height: 4,
          borderRadius: 99,
          backgroundColor: colors.primary + '22',
          transform: [{ rotate: '-18deg' }],
        },
        vehicleImage: {
          position: 'absolute',
          right: isNarrow ? 54 : 62,
          bottom: isNarrow ? 70 : 76,
          width: isNarrow ? 70 : 82,
          height: isNarrow ? 46 : 54,
          resizeMode: 'contain',
        },
        arrowBubble: {
          position: 'absolute',
          right: isNarrow ? 30 : 34,
          bottom: isNarrow ? 48 : 52,
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: colors.primaryPressed,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 3,
          borderColor: colors.surface,
        },
      }),
    [
      colors.border,
      colors.danger,
      colors.primary,
      colors.primaryPressed,
      colors.surface,
      colors.textPrimary,
      colors.textSecondary,
      isNarrow,
      selected,
    ],
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${vehicle.name} vehicle option`}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.cornerGraphic} pointerEvents="none">
        <View style={styles.routeLine} />
        <Image source={src} style={styles.vehicleImage} accessibilityIgnoresInvertColors />
        <View style={styles.arrowBubble}>
          <Ionicons name="arrow-forward" size={17} color="#ffffff" />
        </View>
      </View>

      <View style={styles.copy}>
        <View style={styles.pricePill}>
          <Text style={styles.price} numberOfLines={1}>
            {priceLabel(vehicle)}
          </Text>
        </View>
        <Text style={styles.name} numberOfLines={2}>
          {vehicle.name}
        </Text>
        <Text
          style={styles.capacity}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.86}
        >
          {capacity ?? 'Ready for your delivery route.'}
        </Text>
        <Text style={styles.disc}>Prices can vary</Text>
      </View>
    </Pressable>
  );
});
