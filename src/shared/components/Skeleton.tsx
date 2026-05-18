import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/shared/theme/spacing';

type Props = {
  width?: ViewStyle['width'];
  height: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

function createStyles() {
  return StyleSheet.create({
    base: {
      overflow: 'hidden',
    },
  });
}

export function Skeleton({ width = '100%', height, radius = 8, style }: Props) {
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(), []);
  const backgroundColor = isDark ? colors.border : '#E8EEF5';

  return (
    <View
      accessibilityLabel="Loading"
      style={[
        styles.base,
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor,
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.md,
        gap: spacing.md,
      }}
    >
      {children}
    </View>
  );
}
