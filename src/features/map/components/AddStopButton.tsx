import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useMapColors } from '@/features/map/theme/useMapColors';

/** Full-width "add stop" card: themed bg, green plus, theme-colored label. */
export function AddStopButton({ onPress, disabled }: { onPress: () => void; disabled?: boolean }) {
  const c = useMapColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrap,
        { backgroundColor: c.surface, borderColor: c.border },
        pressed && styles.pressed,
        disabled && styles.disabled,
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

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
  },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.5 },
  plus: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 15, fontWeight: '700' },
});
