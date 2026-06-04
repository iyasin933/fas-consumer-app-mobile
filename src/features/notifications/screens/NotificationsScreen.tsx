import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchLoadDetailsById, type DropyouQuote } from '@/api/modules/dropyou.api';
import { useBookingDetailsStore } from '@/features/bookings/store/bookingDetailsStore';
import { formatMajorCurrency } from '@/features/delivery/utils/dropyouQuoteCardData';
import { vehicleIconSource } from '@/features/home/utils/vehicleIconFromManifest';
import { useDropyouQuotes } from '@/features/notifications/hooks/useDropyouQuotes';
import { useMarkNotificationsSeenOnFocus } from '@/features/notifications/hooks/useNotificationUnreadDot';
import { useTheme } from '@/hooks/useTheme';
import { AccountRequiredEmptyState } from '@/shared/components/AccountRequiredEmptyState';
import { IllustratedActionCard } from '@/shared/components/IllustratedActionCard';
import { InteractiveEmptyState } from '@/shared/components/InteractiveEmptyState';
import { Skeleton, SkeletonCard } from '@/shared/components/Skeleton';
import { StatusChip } from '@/shared/components/StatusChip';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import type { AppStackParamList } from '@/types/navigation.types';

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function quoteId(q: DropyouQuote): string {
  return asString(q.quoteId ?? q.quote_id ?? q.id) ?? 'quote';
}

function quoteBookingId(q: DropyouQuote): string {
  return asString(q.loadId ?? q.load_id) ?? '';
}

function quoteCompany(q: DropyouQuote): string {
  return (
    asString(q.quoteOwnerCompanyName ?? q.quote_owner_company_name) ??
    asString(q.companyName ?? q.company_name) ??
    'Carrier quote'
  );
}

function quotePrice(q: DropyouQuote): number {
  return asNumber(q.totalPrice ?? q.total_price ?? q.price) ?? 0;
}

function quoteCurrency(q: DropyouQuote): string {
  return asString(q.currency)?.toUpperCase() ?? 'GBP';
}

function quoteStatus(q: DropyouQuote): string {
  return asString(q.status)?.toUpperCase() ?? 'POSTED';
}

function quoteReceivedAt(q: DropyouQuote): string {
  return (
    asString(q.createdOn ?? q.created_on) ??
    asString(q.eventTime ?? q.event_time) ??
    asString(q.recordCreatedAt ?? q.record_created_at) ??
    ''
  );
}

function formatUkQuoteTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  try {
    const dateLabel = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      day: '2-digit',
      month: 'short',
    }).format(date);
    const timeLabel = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(date);
    const zoneLabel = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/London',
      timeZoneName: 'short',
    })
      .formatToParts(date)
      .find((part) => part.type === 'timeZoneName')?.value;

    return `${dateLabel}, ${timeLabel}${zoneLabel ? ` ${zoneLabel}` : ''}`;
  } catch {
    return '';
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : null;
}

function pickVehicleName(record: Record<string, unknown> | null): string | null {
  if (!record) return null;
  const direct = asString(
    record.vehicleType ??
      record.vehicle_type ??
      record.vehicleName ??
      record.vehicle_name ??
      record.vehicle ??
      record.vehicle_type_name ??
      record.equipmentType ??
      record.equipment_type,
  );
  if (direct && direct.toLowerCase() !== 'unknown') return direct;

  return (
    pickVehicleName(asRecord(record.vehicle)) ??
    pickVehicleName(asRecord(record.vehicleType)) ??
    pickVehicleName(asRecord(record.load)) ??
    pickVehicleName(asRecord(record.quote)) ??
    pickVehicleName(asRecord(record.rawData)) ??
    null
  );
}

function normalizeVehicleName(vehicle: string): string {
  const normalized = vehicle.trim().toLowerCase();
  if (normalized === 'transit') return 'Transit Van';
  if (normalized === 'swb') return 'SWB';
  if (normalized === 'mwb') return 'MWB';
  if (normalized === 'lwb') return 'LWB';
  if (normalized === 'xlwb') return 'XLWB';
  return vehicle.trim();
}

function quoteVehicle(q: DropyouQuote): string {
  const vehicle = pickVehicleName(q);
  return vehicle ? normalizeVehicleName(vehicle) : 'Van';
}

type QuoteNotificationVm = {
  id: string;
  quoteId: string;
  bookingId: string;
  company: string;
  price: number;
  currency: string;
  status: string;
  vehicle: string;
  receivedAtLabel: string;
};

function mapQuoteToNotification(quote: DropyouQuote, index: number): QuoteNotificationVm {
  const quoteIdValue = quoteId(quote);
  const bookingId = quoteBookingId(quote);

  return {
    id: `${quoteIdValue}:${bookingId || 'booking'}:${index}`,
    quoteId: quoteIdValue,
    bookingId,
    company: quoteCompany(quote),
    price: quotePrice(quote),
    currency: quoteCurrency(quote),
    status: quoteStatus(quote),
    vehicle: quoteVehicle(quote),
    receivedAtLabel: formatUkQuoteTimestamp(quoteReceivedAt(quote)),
  };
}

function bookingAccent(colors: ThemeColors, status: string) {
  const normalized = status.toLowerCase();
  if (
    normalized.includes('cancel') ||
    normalized.includes('declin') ||
    normalized.includes('reject')
  ) {
    return colors.danger;
  }
  if (
    normalized.includes('post') ||
    normalized.includes('active') ||
    normalized.includes('accept')
  ) {
    return colors.primary;
  }
  return colors.textSecondary;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    list: { flex: 1 },
    listContent: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.md,
      gap: spacing.md,
    },
    headerCard: {
      padding: spacing.md,
      borderRadius: 18,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.xs,
    },
    headerEyebrow: {
      color: colors.primary,
      fontSize: typography.fontSize.xs,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    headerTitle: {
      color: colors.textPrimary,
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
    },
    headerBody: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.sm,
      lineHeight: 20,
    },
    notificationCard: {
      minHeight: 206,
    },
    footer: {
      paddingVertical: spacing.lg,
      alignItems: 'stretch',
    },
    cardFooter: {
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    cardMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    bookingMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      minWidth: 0,
      gap: spacing.xs,
    },
    bookingMetaText: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.sm,
      flexShrink: 1,
    },
    priceText: {
      color: colors.textPrimary,
      fontSize: typography.fontSize.lg,
      fontWeight: '800',
    },
    receivedText: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.sm,
      lineHeight: 20,
      fontWeight: typography.fontWeight.medium,
      flex: 1,
    },
    emptyCard: {
      marginHorizontal: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      alignItems: 'center',
      gap: spacing.sm,
    },
    emptyIcon: {
      width: 62,
      height: 62,
      borderRadius: 31,
      backgroundColor: colors.primary + '14',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.xs,
    },
    errorIcon: {
      backgroundColor: colors.danger + '14',
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      textAlign: 'center',
    },
    emptyBody: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.sm,
      lineHeight: 20,
      textAlign: 'center',
    },
    refreshButton: {
      marginTop: spacing.sm,
      minHeight: 44,
      borderRadius: 12,
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    refreshButtonPressed: {
      backgroundColor: colors.primaryPressed,
      transform: [{ scale: 0.98 }],
    },
    refreshButtonText: {
      color: colors.onPrimary,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.bold,
    },
    errorButton: {
      backgroundColor: colors.danger,
    },
    errorButtonPressed: {
      backgroundColor: colors.danger,
      opacity: 0.86,
      transform: [{ scale: 0.98 }],
    },
  });
}

export function NotificationsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const tabBarHeight = useBottomTabBarHeight();
  const horizontalPadding = width < 380 ? spacing.md : spacing.lg;
  const adaptiveListContent = useMemo(
    () => ({
      alignSelf: 'center' as const,
      maxWidth: 720,
      width: '100%' as const,
      paddingHorizontal: horizontalPadding,
    }),
    [horizontalPadding],
  );
  const detailsByBookingId = useBookingDetailsStore((s) => s.detailsByLoadId);
  const loadingByBookingId = useBookingDetailsStore((s) => s.loadingByLoadId);
  const setSelectedBookingId = useBookingDetailsStore((s) => s.setSelectedLoadId);
  const setDetails = useBookingDetailsStore((s) => s.setDetails);
  const setDetailsError = useBookingDetailsStore((s) => s.setError);
  const clearDetailsError = useBookingDetailsStore((s) => s.clearError);
  const setDetailsLoading = useBookingDetailsStore((s) => s.setLoading);
  const {
    quotes,
    total,
    isLoading,
    isRefreshing,
    isError,
    isAuthed,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    fetchNextPage,
  } = useDropyouQuotes();
  useMarkNotificationsSeenOnFocus(total);

  const onRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const onEndReached = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const quoteItems = useMemo(
    () => quotes.map((quote, index) => mapQuoteToNotification(quote, index)),
    [quotes],
  );

  const handleBookingPress = useCallback(
    (quote: QuoteNotificationVm) => {
      const bookingId = quote.bookingId.trim();
      if (!bookingId) {
        Alert.alert('Booking details', 'This quote does not include a booking id.');
        return;
      }

      const hasCachedDetails = Boolean(detailsByBookingId[bookingId]);
      const routeParams = {
        backTitle: 'Notifications',
        loadId: bookingId,
        passengerLabel: quote.company,
        statusLabel: quote.status,
        vehicleName: quote.vehicle,
      };

      if (loadingByBookingId[bookingId]) {
        navigation.navigate('BookingDetails', routeParams);
        return;
      }

      setSelectedBookingId(bookingId);
      clearDetailsError(bookingId);
      if (!hasCachedDetails) {
        setDetailsLoading(bookingId, true);
      }
      navigation.navigate('BookingDetails', routeParams);

      void (async () => {
        try {
          const response = await fetchLoadDetailsById(bookingId);
          setDetails(bookingId, response);
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Failed to load booking details.';
          console.warn(
            `[Notifications] GET /dropyou/load-by-id/${bookingId} failed`,
            err,
          );
          setDetailsError(bookingId, message);
        } finally {
          if (!hasCachedDetails) {
            setDetailsLoading(bookingId, false);
          }
        }
      })();
    },
    [
      clearDetailsError,
      detailsByBookingId,
      loadingByBookingId,
      navigation,
      setDetails,
      setDetailsError,
      setDetailsLoading,
      setSelectedBookingId,
    ],
  );

  const renderItem = useCallback(
    ({ item }: { item: QuoteNotificationVm }) => (
      <QuoteNotificationCard quote={item} onPress={() => handleBookingPress(item)} />
    ),
    [handleBookingPress],
  );

  const keyExtractor = useCallback((item: QuoteNotificationVm) => item.id, []);

  if (!isAuthed) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={[styles.listContent, { flex: 1, justifyContent: 'center' }]}>
          <AccountRequiredEmptyState
            title="Sign in to view updates"
            body="Carrier quotes, booking changes, and live delivery updates are linked to your DropYou account."
            icon="notifications-outline"
          />
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <QuoteSkeletonList bottomPadding={tabBarHeight + spacing.lg} />
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={[styles.listContent, { flex: 1, justifyContent: 'center' }]}>
          <QuoteErrorState isRefreshing={isRefreshing} onRefresh={onRefresh} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        style={styles.list}
        data={quoteItems}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ListHeaderComponent={quoteItems.length > 0 ? <QuoteListHeader /> : null}
        contentContainerStyle={[
          styles.listContent,
          adaptiveListContent,
          { paddingBottom: tabBarHeight + spacing.lg },
          quoteItems.length === 0 && { flexGrow: 1, paddingTop: spacing.xl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        onEndReached={onEndReached}
        onEndReachedThreshold={0.45}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        updateCellsBatchingPeriod={60}
        windowSize={7}
        removeClippedSubviews
        ListEmptyComponent={<QuoteEmptyState isAuthed={isAuthed} />}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footer}>
              <QuoteSkeletonCards />
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function QuoteEmptyState({ isAuthed }: { isAuthed: boolean }) {
  const { colors } = useTheme();

  return (
    <InteractiveEmptyState
      eyebrow={isAuthed ? 'No updates' : 'Account required'}
      title={isAuthed ? 'No booking updates yet' : 'Sign in to view updates'}
      body={
        isAuthed
          ? 'Carrier quotes, booking changes, and live delivery updates will appear here as they arrive.'
          : 'Your booking notifications are linked to your DropYou account.'
      }
      icon="notifications-outline"
      accent={colors.primary}
      style={{ flex: 1 }}
    />
  );
}

function QuoteErrorState({
  isRefreshing,
  onRefresh,
}: {
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  const { colors } = useTheme();

  return (
    <InteractiveEmptyState
      eyebrow="Connection issue"
      title="Couldn’t load notifications"
      body="We couldn’t fetch your booking updates. Check your connection and try again."
      icon="alert-circle-outline"
      accent={colors.danger}
      primaryAction={{
        label: isRefreshing ? 'Retrying' : 'Try again',
        icon: 'refresh',
        loading: isRefreshing,
        onPress: onRefresh,
      }}
    />
  );
}

function QuoteListHeader() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.headerCard}>
      <Text style={styles.headerEyebrow}>Booking quotes</Text>
      <Text style={styles.headerTitle}>Booking updates</Text>
      <Text style={styles.headerBody}>
        Latest carrier quotes. Tap any card to view booking details.
      </Text>
    </View>
  );
}

function QuoteNotificationCard({
  quote,
  onPress,
}: {
  quote: QuoteNotificationVm;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const accent = bookingAccent(colors, quote.status);
  const price = formatMajorCurrency(quote.price, quote.currency);

  return (
    <IllustratedActionCard
      eyebrow={quote.bookingId ? `Booking #${quote.bookingId}` : 'Booking quote'}
      title={quote.company}
      body={undefined}
      accent={accent}
      imageSource={vehicleIconSource(quote.vehicle)}
      artLabel={quote.vehicle}
      imageBubbleBackgroundColor={colors.surface}
      hideArtPin
      hideArtArrow
      onPress={onPress}
      containerStyle={styles.notificationCard}
      accessibilityLabel={`Open booking ${quote.bookingId}`}
      footer={
        <View style={styles.cardFooter}>
          <View style={styles.cardMetaRow}>
            <StatusChip label={quote.status} />
            <Text style={styles.priceText}>{price}</Text>
          </View>
          {quote.receivedAtLabel ? (
            <View style={styles.cardMetaRow}>
              <View style={styles.bookingMeta}>
                <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
                <Text style={styles.receivedText} numberOfLines={2}>
                  {quote.receivedAtLabel}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      }
    />
  );
}

function QuoteSkeletonList({ bottomPadding }: { bottomPadding: number }) {
  return (
    <View
      style={{
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: bottomPadding,
        gap: spacing.md,
      }}
    >
      {[0, 1, 2].map((item) => (
        <SkeletonCard key={item}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Skeleton width={42} height={42} radius={21} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Skeleton width="64%" height={20} />
              <Skeleton width="42%" height={16} />
            </View>
            <Skeleton width={56} height={56} radius={14} />
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: spacing.sm,
            }}
          >
            <Skeleton width={86} height={20} radius={999} />
            <Skeleton width={74} height={22} />
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: spacing.sm,
            }}
          >
            <Skeleton width="38%" height={16} />
            <Skeleton width="28%" height={16} />
          </View>
        </SkeletonCard>
      ))}
    </View>
  );
}

function QuoteSkeletonCards() {
  return (
    <View style={{ gap: spacing.md }}>
      {[0, 1, 2].map((item) => (
        <SkeletonCard key={item}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Skeleton width={42} height={42} radius={21} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Skeleton width="64%" height={20} />
              <Skeleton width="42%" height={16} />
            </View>
            <Skeleton width={56} height={56} radius={14} />
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: spacing.sm,
            }}
          >
            <Skeleton width={86} height={20} radius={999} />
            <Skeleton width={74} height={22} />
          </View>
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              gap: spacing.sm,
            }}
          >
            <Skeleton width="38%" height={16} />
            <Skeleton width="28%" height={16} />
          </View>
        </SkeletonCard>
      ))}
    </View>
  );
}
