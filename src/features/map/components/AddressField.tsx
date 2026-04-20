import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useMapColors } from '@/features/map/theme/useMapColors';
import type { PlaceValue } from '@/features/map/types';

type Props = {
  placeholder: string;
  value: PlaceValue | null;
  onPress: () => void;
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
  onGpsPress,
  showGps,
  onClear,
}: Props) {
  const c = useMapColors();
  const filled = !!value?.address;
  return (
    <Pressable
      style={({ pressed }) => [
        styles.wrap,
        { backgroundColor: c.surfaceMuted, borderColor: c.border },
        pressed && styles.pressed,
      ]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={placeholder}
    >
      {filled ? (
        <Ionicons name="location-sharp" size={18} color={c.brandGreen} />
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
        // Wrapped in a View so Pressable's hitSlop stays isolated from the
        // outer Pressable's press area — tapping the × must NOT also open
        // the modal.
        <View>
          <Pressable
            hitSlop={10}
            onPress={onClear}
            accessibilityLabel={`Clear ${placeholder}`}
            style={({ pressed }) => [
              styles.clearBtn,
              { backgroundColor: c.surface, borderColor: c.border },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons name="close" size={14} color={c.textSecondary} />
          </Pressable>
        </View>
      )}
      {showGps && (
        <Pressable
          hitSlop={8}
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

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  pressed: { opacity: 0.7 },
  txt: { flex: 1, fontSize: 14 },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpsBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
