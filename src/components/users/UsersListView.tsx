import { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import type { UsersListViewProps } from '@/types/components.types';

function rowTitle(item: unknown): string {
  if (item && typeof item === 'object') {
    const o = item as Record<string, unknown>;
    if (typeof o.email === 'string' && o.email) return o.email;
    if (typeof o.phone === 'string' && o.phone) return o.phone;
    const first = typeof o.firstName === 'string' ? o.firstName : '';
    const last = typeof o.lastName === 'string' ? o.lastName : '';
    const name = `${first} ${last}`.trim();
    if (name) return name;
    if (typeof o.id === 'string' || typeof o.id === 'number') return String(o.id);
  }
  return 'User';
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
      gap: spacing.md,
    },
    listContent: {
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      flexGrow: 1,
    },
    row: {
      paddingVertical: spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowTitle: {
      fontSize: typography.fontSize.md,
      color: colors.textPrimary,
    },
    error: {
      color: colors.danger,
      fontSize: typography.fontSize.md,
      textAlign: 'center',
    },
    retry: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    retryText: {
      color: colors.primary,
      fontWeight: '600',
      fontSize: 16,
    },
    empty: {
      textAlign: 'center',
      color: colors.textSecondary,
      marginTop: spacing.xl,
      fontSize: typography.fontSize.md,
    },
  });
}

/**
 * Presentational list: no fetching — parent passes data and flags from React Query.
 */
export function UsersListView({
  users,
  loading,
  error,
  refreshing = false,
  onRefresh,
  emptyLabel = 'No users returned.',
}: UsersListViewProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  if (loading && users.length === 0) {
    return (
      <View style={styles.centered} accessibilityState={{ busy: true }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
        {onRefresh ? (
          <Pressable onPress={onRefresh} style={styles.retry} accessibilityRole="button">
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <FlatList
      data={users}
      keyExtractor={(_, index) => `user-${index}`}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Text style={styles.rowTitle}>{rowTitle(item)}</Text>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.empty}>{emptyLabel}</Text>}
      contentContainerStyle={styles.listContent}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        ) : undefined
      }
    />
  );
}
