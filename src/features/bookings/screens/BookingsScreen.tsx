import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchLoadDetailsById } from '@/api/modules/dropyou.api';
import { useUserBookings } from '@/features/bookings/hooks/useUserBookings';
import {
  isCompletedLoad,
  isExpiredLoad,
  isFailedLoad,
  isPendingLoad,
} from '@/features/bookings/utils/bookingStatus';
import { captureSafe } from '@/services/posthog';
import { useBookingDetailsStore } from '@/features/bookings/store/bookingDetailsStore';
import { ActiveTripCard } from '@/features/home/components/ActiveTripCard';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { AccountRequiredEmptyState } from '@/shared/components/AccountRequiredEmptyState';
import { FilterDropdown } from '@/shared/components/FilterDropdown';
import { InteractiveEmptyState } from '@/shared/components/InteractiveEmptyState';
import { SearchField } from '@/shared/components/SearchField';
import { Skeleton, SkeletonCard } from '@/shared/components/Skeleton';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import type { ActiveTripCardVm } from '@/types/activeTrip.types';
import type { AppStackParamList } from '@/types/navigation.types';

type LoadStatusTab = 'all' | 'pending' | 'completed' | 'expired' | 'failed';

function logJson(label: string, value: unknown): void {
  try {
    console.log(label, JSON.stringify(value, null, 2));
  } catch {
    console.log(label, value);
  }
}

function createStyles(colors: ThemeColors, narrow: boolean) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    listContent: {
      gap: spacing.md,
    },
    list: { flex: 1 },
    tabsHeader: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      paddingBottom: spacing.md,
      backgroundColor: colors.background,
      zIndex: 5,
      elevation: 5,
      gap: spacing.sm,
    },
    filterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    filterDropdownWrap: {
      flex: 1,
      minWidth: 0,
    },
    resetButton: {
      minHeight: narrow ? 36 : 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: narrow ? spacing.sm : spacing.md,
    },
    resetText: {
      fontSize: narrow ? typography.fontSize.sm : typography.fontSize.md,
      fontWeight: typography.fontWeight.bold,
      color: colors.primary,
    },
    listItem: {
      paddingHorizontal: spacing.md,
    },
    center: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
    },
    muted: {
      fontSize: typography.fontSize.md,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 22,
    },
    err: { color: colors.danger, textDecorationLine: 'underline', textAlign: 'center' },
  });
}

export function BookingsScreen() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const narrow = width < 380;
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const styles = useMemo(() => createStyles(colors, narrow), [colors, narrow]);
  const isAuthed = useAuthStore((s) => s.session === 'authed');
  const [activeStatusTab, setActiveStatusTab] = useState<LoadStatusTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const tabBarHeight = useBottomTabBarHeight();
  const detailsByLoadId = useBookingDetailsStore((s) => s.detailsByLoadId);
  const loadingByLoadId = useBookingDetailsStore((s) => s.loadingByLoadId);
  const setSelectedLoadId = useBookingDetailsStore((s) => s.setSelectedLoadId);
  const setDetails = useBookingDetailsStore((s) => s.setDetails);
  const setDetailsError = useBookingDetailsStore((s) => s.setError);
  const clearDetailsError = useBookingDetailsStore((s) => s.clearError);
  const setDetailsLoading = useBookingDetailsStore((s) => s.setLoading);
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

  // Refresh whenever the tab gains focus so a just-reposted load (new status,
  // new public id, latest-activity ordering) shows up without waiting for the
  // query cache to go stale.
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const pendingCount = useMemo(() => bookings.filter(isPendingLoad).length, [bookings]);
  const completedCount = useMemo(() => bookings.filter(isCompletedLoad).length, [bookings]);
  const expiredCount = useMemo(() => bookings.filter(isExpiredLoad).length, [bookings]);
  const failedCount = useMemo(() => bookings.filter(isFailedLoad).length, [bookings]);

  // Default filter: land on Pending when pending bookings exist, otherwise All.
  // Applied once when the first list arrives so the user's later filter choice
  // is never overridden.
  const defaultTabAppliedRef = useRef(false);
  useEffect(() => {
    if (defaultTabAppliedRef.current || bookings.length === 0) return;
    defaultTabAppliedRef.current = true;
    setActiveStatusTab(pendingCount > 0 ? 'pending' : 'all');
  }, [bookings.length, pendingCount]);

  const normalizedQuery = useMemo(() => searchQuery.trim().toLowerCase(), [searchQuery]);
  const filteredBookings = useMemo(() => {
    const byStatus = (() => {
      if (activeStatusTab === 'pending') return bookings.filter(isPendingLoad);
      if (activeStatusTab === 'completed') return bookings.filter(isCompletedLoad);
      if (activeStatusTab === 'expired') return bookings.filter(isExpiredLoad);
      if (activeStatusTab === 'failed') return bookings.filter(isFailedLoad);
      return bookings;
    })();

    if (!normalizedQuery) return byStatus;

    // Match both DropYou identities (short public load id like DY-12345678 and
    // the booking UUID) and the TEG load id. Partial, case-insensitive.
    return byStatus.filter((trip) => {
      const candidates = [
        trip.loadId,
        trip.publicLoadId,
        trip.id,
        trip.bookingId,
      ];
      return candidates.some((value) =>
        value.toLowerCase().includes(normalizedQuery),
      );
    });
  }, [activeStatusTab, bookings, normalizedQuery]);

  const statusTabs = useMemo(
    () => [
      { value: 'all' as const, label: 'All', badge: bookings.length },
      { value: 'pending' as const, label: 'Pending', badge: pendingCount },
      { value: 'completed' as const, label: 'Completed', badge: completedCount },
      { value: 'expired' as const, label: 'Expired', badge: expiredCount },
      { value: 'failed' as const, label: 'Failed', badge: failedCount },
    ],
    [bookings.length, completedCount, expiredCount, failedCount, pendingCount],
  );

  const handleBookingPress = useCallback(
    (trip: ActiveTripCardVm) => {
      const loadId = (trip.publicLoadId || trip.loadId || trip.id).trim();
      if (!loadId) {
        Alert.alert('Booking details', 'This booking does not include a load id.');
        return;
      }
      captureSafe('booking_viewed', {
        load_id: loadId,
        booking_id: trip.bookingId,
        status: trip.statusLabel,
        vehicle_name: trip.vehicleName,
      });

      const hasCachedDetails = Boolean(detailsByLoadId[loadId]);
      if (loadingByLoadId[loadId]) {
        navigation.navigate('BookingDetails', {
          backTitle: 'Bookings',
          loadId,
          ...(trip.bookingId ? { bookingId: trip.bookingId } : {}),
          ...(trip.publicLoadId ? { publicLoadId: trip.publicLoadId } : {}),
          passengerLabel: trip.passengerLabel,
          statusLabel: trip.statusLabel,
          vehicleName: trip.vehicleName,
          pickupAddress: trip.originAddress,
          dropoffAddress: trip.destAddress,
          pickupTimeLabel: trip.originTimeLabel,
          dropoffTimeLabel: trip.destTimeLabel,
        });
        return;
      }

      setSelectedLoadId(loadId);
      clearDetailsError(loadId);
      if (!hasCachedDetails) {
        setDetailsLoading(loadId, true);
      }
      navigation.navigate('BookingDetails', {
        backTitle: 'Bookings',
        loadId,
        ...(trip.bookingId ? { bookingId: trip.bookingId } : {}),
        ...(trip.publicLoadId ? { publicLoadId: trip.publicLoadId } : {}),
        passengerLabel: trip.passengerLabel,
        statusLabel: trip.statusLabel,
        vehicleName: trip.vehicleName,
        pickupAddress: trip.originAddress,
        dropoffAddress: trip.destAddress,
        pickupTimeLabel: trip.originTimeLabel,
        dropoffTimeLabel: trip.destTimeLabel,
      });

      void (async () => {
        try {
          const response = await fetchLoadDetailsById(loadId);
          logJson(
            `[BookingsScreen] GET /dropyou/load-by-id/${loadId} response`,
            response,
          );
          setDetails(loadId, response);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Failed to load booking details.';
          console.warn(`[BookingsScreen] GET /dropyou/load-by-id/${loadId} failed`, err);
          setDetailsError(loadId, message);
        } finally {
          if (!hasCachedDetails) {
            setDetailsLoading(loadId, false);
          }
        }
      })();
    },
    [
      clearDetailsError,
      detailsByLoadId,
      loadingByLoadId,
      navigation,
      setDetails,
      setDetailsError,
      setDetailsLoading,
      setSelectedLoadId,
    ],
  );

  const renderItem = useCallback(
    ({ item }: { item: ActiveTripCardVm }) => {
      return (
        <View style={styles.listItem}>
          <ActiveTripCard trip={item} onPress={() => void handleBookingPress(item)} />
        </View>
      );
    },
    [handleBookingPress, styles.listItem],
  );

  const keyExtractor = useCallback((item: ActiveTripCardVm) => item.id, []);

  const openNewBooking = useCallback(() => {
    navigation.navigate('MainTabs', { screen: 'Map' });
  }, [navigation]);

  const hasActiveFilters = normalizedQuery.length > 0 || activeStatusTab !== 'all';

  const resetFilters = useCallback(() => {
    setSearchQuery('');
    setActiveStatusTab('all');
  }, []);

  const emptyCopy = useMemo(() => {
    if (normalizedQuery) {
      return {
        eyebrow: 'No matches',
        title: 'No bookings found',
        body: `Nothing matches “${searchQuery.trim()}” across your DropYou and TEG load ids. Try a different id or clear the search.`,
        icon: 'search-outline' as const,
        meta: undefined,
      };
    }
    if (activeStatusTab === 'pending') {
      return {
        eyebrow: 'All clear',
        title: 'No pending bookings',
        body: 'New delivery requests and open quotes will appear here as soon as you create them.',
        icon: 'time-outline' as const,
        meta: undefined,
      };
    }
    if (activeStatusTab === 'completed') {
      return {
        eyebrow: 'Nothing delivered yet',
        title: 'No completed bookings',
        body: 'Deliveries your driver has finished will be kept here, with proof of delivery when available.',
        icon: 'checkmark-done-outline' as const,
        meta: undefined,
      };
    }
    if (activeStatusTab === 'expired') {
      return {
        eyebrow: 'Nothing expired',
        title: 'No expired bookings',
        body: 'Bookings that expired before a driver was assigned will appear here. You can repost them to try again.',
        icon: 'time-outline' as const,
        meta: undefined,
      };
    }
    if (activeStatusTab === 'failed') {
      return {
        eyebrow: 'Nothing failed',
        title: 'No failed bookings',
        body: 'Cancelled, expired, or failed delivery requests will be kept here for quick review.',
        icon: 'shield-checkmark-outline' as const,
        meta: undefined,
      };
    }
    return {
      eyebrow: 'Start a delivery',
      title: 'Your bookings will live here',
      body: 'Create your first DropYou delivery and track quotes, payments, status, and driver movement from this tab.',
      icon: 'calendar-outline' as const,
      meta: undefined,
    };
  }, [activeStatusTab, normalizedQuery, searchQuery]);

  if (!isAuthed) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={[styles.center, { paddingBottom: tabBarHeight }]}>
          <AccountRequiredEmptyState
            title="Sign in to view bookings"
            body="Your delivery history, quotes, payments, and tracking updates are linked to your DropYou account."
            icon="calendar-outline"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (profileLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <BookingsSkeletonList bottomPadding={tabBarHeight + spacing.lg} />
      </SafeAreaView>
    );
  }

  if (missingUserId) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.muted}>
            We couldn’t load your account id. Try signing out and signing in again, or
            contact support if this continues.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {isLoading ? (
        <BookingsSkeletonList bottomPadding={tabBarHeight + spacing.lg} />
      ) : isError ? (
        <View style={styles.center}>
          <Pressable onPress={onRefresh} accessibilityRole="button" hitSlop={10}>
            <Text style={styles.err}>Could not load bookings. Tap to retry.</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          style={styles.list}
          ListHeaderComponent={
            <View style={styles.tabsHeader}>
              <SearchField
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search via load ID"
                accessibilityLabel="Search bookings by load ID"
              />
              <View style={styles.filterRow}>
                <View style={styles.filterDropdownWrap}>
                  <FilterDropdown
                    value={activeStatusTab}
                    options={statusTabs}
                    title="Filter bookings"
                    onChange={setActiveStatusTab}
                  />
                </View>
                {hasActiveFilters ? (
                  <Pressable
                    style={styles.resetButton}
                    onPress={resetFilters}
                    accessibilityRole="button"
                    accessibilityLabel="Reset filters"
                  >
                    <Ionicons name="refresh" size={16} color={colors.primary} />
                    <Text style={styles.resetText}>Reset</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          }
          stickyHeaderIndices={[0]}
          data={filteredBookings}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          ItemSeparatorComponent={ListSeparator}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: tabBarHeight + spacing.lg },
            filteredBookings.length === 0 && { flexGrow: 1, paddingTop: spacing.xl },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <InteractiveEmptyState
              eyebrow={emptyCopy.eyebrow}
              title={emptyCopy.title}
              body={emptyCopy.body}
              icon={emptyCopy.icon}
              meta={emptyCopy.meta}
              primaryAction={
                normalizedQuery
                  ? {
                      label: 'Clear search',
                      icon: 'close-circle-outline' as const,
                      onPress: () => setSearchQuery(''),
                    }
                  : activeStatusTab === 'all'
                    ? {
                        label: 'Book a delivery',
                        icon: 'map-outline',
                        onPress: openNewBooking,
                      }
                    : {
                        label: 'View all bookings',
                        icon: 'albums-outline',
                        onPress: () => setActiveStatusTab('all'),
                      }
              }
              style={{ flex: 1 }}
            />
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

function BookingsSkeletonList({ bottomPadding }: { bottomPadding: number }) {
  return (
    <View
      style={{
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: bottomPadding,
        gap: spacing.md,
      }}
    >
      {[0, 1].map((item) => (
        <SkeletonCard key={item}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Skeleton width={40} height={40} radius={20} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Skeleton width="62%" height={20} />
              <Skeleton width={84} height={18} radius={999} />
            </View>
            <Skeleton width={56} height={56} radius={14} />
          </View>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Skeleton width={28} height={104} radius={14} />
            <View style={{ flex: 1, gap: spacing.sm }}>
              <Skeleton width="92%" height={18} />
              <Skeleton width="30%" height={16} />
              <Skeleton width="82%" height={18} style={{ marginTop: spacing.md }} />
              <Skeleton width="28%" height={16} />
            </View>
          </View>
        </SkeletonCard>
      ))}
    </View>
  );
}
