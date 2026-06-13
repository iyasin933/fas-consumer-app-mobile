import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchLoadDetailsById } from '@/api/modules/dropyou.api';
import { useUserBookings } from '@/features/bookings/hooks/useUserBookings';
import { captureSafe } from '@/services/posthog';
import { useBookingDetailsStore } from '@/features/bookings/store/bookingDetailsStore';
import { ActiveTripCard } from '@/features/home/components/ActiveTripCard';
import { useTheme } from '@/hooks/useTheme';
import { useAuthStore } from '@/store/authStore';
import { AccountRequiredEmptyState } from '@/shared/components/AccountRequiredEmptyState';
import { InteractiveEmptyState } from '@/shared/components/InteractiveEmptyState';
import { SegmentedTabs } from '@/shared/components/SegmentedTabs';
import { Skeleton, SkeletonCard } from '@/shared/components/Skeleton';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import type { ActiveTripCardVm } from '@/types/activeTrip.types';
import type { AppStackParamList } from '@/types/navigation.types';

type LoadStatusTab = 'all' | 'pending' | 'failed';

const FAILED_STATUS_TERMS = [
  'failed',
  'failure',
  'rejected',
  'cancelled',
  'canceled',
  'declined',
  'expired',
  'error',
];
const PENDING_STATUS_TERMS = [
  'pending',
  'waiting',
  'processing',
  'requested',
  'created',
  'posted',
  'open',
  'quote',
  'unassigned',
];

function logJson(label: string, value: unknown): void {
  try {
    console.log(label, JSON.stringify(value, null, 2));
  } catch {
    console.log(label, value);
  }
}

function createStyles(colors: ThemeColors) {
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

function normalizedStatus(trip: ActiveTripCardVm): string {
  return trip.statusLabel.trim().toLowerCase();
}

function isFailedLoad(trip: ActiveTripCardVm): boolean {
  const status = normalizedStatus(trip);
  return FAILED_STATUS_TERMS.some((term) => status.includes(term));
}

function isPendingLoad(trip: ActiveTripCardVm): boolean {
  const status = normalizedStatus(trip);
  return PENDING_STATUS_TERMS.some((term) => status.includes(term));
}

export function BookingsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isAuthed = useAuthStore((s) => s.session === 'authed');
  const [activeStatusTab, setActiveStatusTab] = useState<LoadStatusTab>('all');
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

  const pendingCount = useMemo(() => bookings.filter(isPendingLoad).length, [bookings]);
  const failedCount = useMemo(() => bookings.filter(isFailedLoad).length, [bookings]);
  const filteredBookings = useMemo(() => {
    if (activeStatusTab === 'pending') return bookings.filter(isPendingLoad);
    if (activeStatusTab === 'failed') return bookings.filter(isFailedLoad);
    return bookings;
  }, [activeStatusTab, bookings]);

  const statusTabs = useMemo(
    () => [
      { value: 'all' as const, label: 'All', badge: bookings.length },
      { value: 'pending' as const, label: 'Pending', badge: pendingCount },
      { value: 'failed' as const, label: 'Failed', badge: failedCount },
    ],
    [bookings.length, failedCount, pendingCount],
  );

  const handleBookingPress = useCallback(
    (trip: ActiveTripCardVm) => {
      const loadId = (trip.loadId || trip.id).trim();
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

  const emptyCopy = useMemo(() => {
    if (activeStatusTab === 'pending') {
      return {
        eyebrow: 'All clear',
        title: 'No pending bookings',
        body: 'New delivery requests and open quotes will appear here as soon as you create them.',
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
  }, [activeStatusTab]);

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
              <SegmentedTabs
                value={activeStatusTab}
                options={statusTabs}
                onChange={setActiveStatusTab}
              />
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
                activeStatusTab === 'all'
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
