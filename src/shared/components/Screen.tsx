import { ReactNode } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';

type ScreenProps = {
  children: ReactNode;
  style?: ViewStyle;
  /** Which edges respect the safe area; splash often uses all edges for a centered layout. */
  edges?: Edge[];
};

export function Screen({
  children,
  style,
  edges = ['top', 'right', 'bottom', 'left'],
}: ScreenProps) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }, style]} edges={edges}>
      {children}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
