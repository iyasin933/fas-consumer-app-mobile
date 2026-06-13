import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useMapColors } from '@/features/map/theme/useMapColors';

type Props = {
  onPress: () => void;
  disabled?: boolean;
  /** Merged after base styles (e.g. `{ flex: 1 }` in a row footer). */
  style?: StyleProp<ViewStyle>;
};

/** "Add stop" control: themed bg, green plus, theme-colored label. */
export function AddStopButton({ onPress, disabled, style }: Props) {
  const c = useMapColors();
  const { width } = useWindowDimensions();
  const narrow = width < 380;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: narrow ? 8 : 10,
          borderWidth: 1,
          borderRadius: 12,
          paddingVertical: narrow ? 10 : 14,
          minHeight: narrow ? 44 : 52,
          flexGrow: 1,
        },
        pressed: { opacity: 0.75 },
        disabled: { opacity: 0.5 },
        plus: {
          width: narrow ? 24 : 26,
          height: narrow ? 24 : 26,
          borderRadius: narrow ? 12 : 13,
          alignItems: 'center',
          justifyContent: 'center',
        },
        label: { fontSize: narrow ? 14 : 15, fontWeight: '700' },
      }),
    [narrow],
  );

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrap,
        { backgroundColor: c.surface, borderColor: c.border },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel="Add stop"
    >
      <View style={[styles.plus, { backgroundColor: c.brandGreen }]}>
        <Ionicons name="add" size={18} color="#ffffff" />
      </View>
      <Text style={[styles.label, { color: c.textPrimary }]}>Add Stop</Text>
    </Pressable>
  );
}
