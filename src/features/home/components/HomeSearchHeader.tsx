import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useHomeProfile } from '@/features/home/hooks/useHomeProfile';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    search: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
    },
    searchText: {
      flex: 1,
      fontSize: typography.fontSize.md,
      color: colors.muted,
    },
    avatar: { marginLeft: 2 },
    avatarInner: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: colors.onPrimary,
      fontWeight: typography.fontWeight.bold,
      fontSize: 18,
    },
  });
}

type Props = {
  onOpenWhereTo: () => void;
  resolving: boolean;
};

/**
 * Home “Where to?” bar. Parent screen owns the full-screen Places overlay so
 * it can render **last** above ScrollView / tab chrome (z-index + order).
 */
export function HomeSearchHeader({ onOpenWhereTo, resolving }: Props) {
  const { initial, signOut } = useHomeProfile();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <Pressable
        style={styles.search}
        onPress={onOpenWhereTo}
        accessibilityRole="button"
        accessibilityLabel="Where to?"
        disabled={resolving}
      >
        {resolving ? (
          <ActivityIndicator size="small" color={colors.muted} />
        ) : (
          <Ionicons name="search" size={20} color={colors.muted} />
        )}
        <Text style={styles.searchText} numberOfLines={1}>
          {resolving ? 'Pinning address…' : 'Where to?'}
        </Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Profile, long press to sign out"
        onLongPress={() => void signOut()}
        style={styles.avatar}
      >
        <View style={styles.avatarInner}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
      </Pressable>
    </View>
  );
}
