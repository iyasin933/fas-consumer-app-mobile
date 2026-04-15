import { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useUserBookings } from '@/features/bookings/hooks/useUserBookings';
import { ActiveTripCard } from '@/features/home/components/ActiveTripCard';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import type { ActiveTripCardVm } from '@/types/activeTrip.types';

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.sm,
      gap: spacing.xs,
    },
    title: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.bold,
      color: colors.textPrimary,
    },
    subtitle: { fontSize: typography.fontSize.sm, color: colors.textSecondary },
    listContent: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xl * 2,
    },
    list: { flex: 1 },
    center: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    muted: { fontSize: typography.fontSize.md, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },
    err: { color: colors.danger, textDecorationLine: 'underline', textAlign: 'center' },
  });
}

export function BookingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    bookings,
    isLoading,
    isRefetching,
    isError,
    profileLoading,
    missingUserId,
    refetch,
  } = useUserBookings();

  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const renderItem = useCallback(
    ({ item }: { item: ActiveTripCardVm }) => <ActiveTripCard trip={item} />,
    [],
  );

  const keyExtractor = useCallback((item: ActiveTripCardVm) => item.id, []);

  if (profileLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Bookings</Text>
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  if (missingUserId) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.title}>Bookings</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.muted}>
            We couldn’t load your account id. Try signing out and signing in again, or contact support if this continues.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Bookings</Text>
        <Text style={styles.subtitle}>Your DropYou deliveries</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : isError ? (
        <View style={styles.center}>
          <Pressable onPress={onRefresh}>
            <Text style={styles.err}>Could not load bookings. Tap to retry.</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          data={bookings}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={ListSeparator}
          contentContainerStyle={[
            styles.listContent,
            bookings.length === 0 && { flexGrow: 1, justifyContent: 'center' },
          ]}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListEmptyComponent={
            <Text style={styles.muted}>No bookings yet. When you book a delivery, it will show here.</Text>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function ListSeparator() {
  return <View style={{ height: spacing.md }} />;
}
