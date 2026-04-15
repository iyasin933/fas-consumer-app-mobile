import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useHomeSupportFab } from '@/features/home/hooks/useHomeSupportFab';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: { position: 'absolute', right: spacing.md, bottom: 96 },
    ring: {
      width: 52,
      height: 52,
      borderRadius: 26,
      borderWidth: 2,
      borderColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    dot: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: colors.primary,
    },
  });
}

/** Placeholder support/chat control (icon asset TBD). */
export function HomeSupportFab() {
  const { onPress } = useHomeSupportFab();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable style={styles.wrap} accessibilityLabel="Support" onPress={onPress}>
      <View style={styles.ring}>
        <View style={styles.dot} />
      </View>
    </Pressable>
  );
}
