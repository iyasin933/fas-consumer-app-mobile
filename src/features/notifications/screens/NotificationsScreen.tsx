import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    box: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
    title: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: spacing.sm,
    },
    sub: { fontSize: typography.fontSize.md, color: colors.textSecondary, lineHeight: 22 },
  });
}

export function NotificationsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.box}>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.sub}>Alerts and updates from DropYou will show here.</Text>
      </View>
    </SafeAreaView>
  );
}
