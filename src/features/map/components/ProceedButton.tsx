import { useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';

const BRAND_GREEN = '#2ECC71';

type Props = {
  enabled: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function ProceedButton({ enabled, onPress, style }: Props) {
  const { width } = useWindowDimensions();
  const narrow = width < 380;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        btn: {
          height: narrow ? 44 : 52,
          borderRadius: 12,
          backgroundColor: BRAND_GREEN,
          alignItems: 'center',
          justifyContent: 'center',
          flexGrow: 1,
        },
        disabled: { opacity: 0.4 },
        pressed: { opacity: 0.85 },
        label: { color: '#ffffff', fontSize: narrow ? 15 : 16, fontWeight: '800', letterSpacing: 0.3 },
      }),
    [narrow],
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={!enabled}
      style={({ pressed }) => [
        styles.btn,
        !enabled && styles.disabled,
        enabled && pressed && styles.pressed,
        style,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Proceed"
      accessibilityState={{ disabled: !enabled }}
    >
      <Text style={styles.label}>Proceed</Text>
    </Pressable>
  );
}
