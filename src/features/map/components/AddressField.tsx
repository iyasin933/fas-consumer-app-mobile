import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useMapColors } from '@/features/map/theme/useMapColors';
import type { PlaceValue } from '@/features/map/types';
import type { RouteMarkerKind } from '@/shared/theme/routeMarkers';

type Props = {
  placeholder: string;
  value: PlaceValue | null;
  onPress: () => void;
  markerKind?: RouteMarkerKind;
  onGpsPress?: () => void;
  /** Show the inline GPS fill button (pickup row only). */
  showGps?: boolean;
  /**
   * When provided, a small × button is rendered next to a filled address.
   * Tapping it wipes the selection without opening the Places modal.
   */
  onClear?: () => void;
};

/**
 * Tap-to-open address input used by Pickup / Stops / Dropoff. We don't render a
 * real `TextInput` here — tapping opens the full-screen Places modal instead,
 * which matches the spec for a one-shot "Google autocomplete" picker.
 *
 * When a place is already selected and the parent passes `onClear`, a small
 * × chip is shown so the user can wipe the field in one tap instead of being
 * forced to re-open the modal.
 */
export function AddressField({
  placeholder,
  value,
  onPress,
  markerKind = 'pickup',
  onGpsPress,
  showGps,
  onClear,
}: Props) {
  const c = useMapColors();
  const { width } = useWindowDimensions();
  const narrow = width < 380;
  const filled = !!value?.address;
  const filledIconName = markerKind === 'dropoff' ? 'flag' : 'location-sharp';
  const filledIconColor =
    markerKind === 'dropoff' ? c.dropoffRed : markerKind === 'stop' ? c.stopBrown : c.brandGreen;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: narrow ? 8 : 10,
          minHeight: narrow ? 44 : 48,
          borderWidth: 1,
          borderRadius: 10,
          paddingHorizontal: narrow ? 10 : 12,
          paddingVertical: narrow ? 10 : 12,
        },
        pressed: { opacity: 0.7 },
        txt: { flex: 1, fontSize: narrow ? 13 : 14 },
        clearBtn: {
          width: narrow ? 26 : 28,
          height: narrow ? 26 : 28,
          borderRadius: narrow ? 13 : 14,
          borderWidth: StyleSheet.hairlineWidth,
          alignItems: 'center',
          justifyContent: 'center',
        },
        gpsBtn: {
          width: narrow ? 28 : 32,
          height: narrow ? 28 : 32,
          borderRadius: narrow ? 14 : 16,
          alignItems: 'center',
          justifyContent: 'center',
        },
      }),
    [narrow],
  );

  return (
    <Pressable
      style={({ pressed }) => [
        styles.wrap,
        { backgroundColor: c.surfaceMuted, borderColor: c.border },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6, left: 2, right: 2 }}
      accessibilityRole="button"
      accessibilityLabel={placeholder}
    >
      {filled ? (
        <Ionicons name={filledIconName} size={18} color={filledIconColor} />
      ) : (
        <Ionicons name="search" size={18} color={c.textSecondary} />
      )}
      <Text
        numberOfLines={1}
        style={[
          styles.txt,
          filled
            ? { color: c.textPrimary, fontWeight: '600' }
            : { color: c.textSecondary },
        ]}
      >
        {filled ? value!.address : placeholder}
      </Text>
      {filled && onClear && (
        <View>
          <Pressable
            hitSlop={8}
            onPress={onClear}
            accessibilityLabel={`Clear ${placeholder}`}
            style={({ pressed }) => [
              styles.clearBtn,
              { backgroundColor: c.surface, borderColor: c.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="close" size={16} color={c.textSecondary} />
          </Pressable>
        </View>
      )}
      {showGps && (
        <Pressable
          hitSlop={6}
          onPress={onGpsPress}
          style={[styles.gpsBtn, { backgroundColor: c.brandGreenSoft }]}
          accessibilityLabel="Use current location"
        >
          <Ionicons name="locate" size={16} color={c.brandGreen} />
        </Pressable>
      )}
    </Pressable>
  );
}


