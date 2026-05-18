import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { isAxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchLoadDetailsById, fetchQuotesByLoadId } from '@/api/modules/dropyou.api';
import { useBookingDetailsStore } from '@/features/bookings/store/bookingDetailsStore';
import { acceptDropyouQuote } from '@/features/delivery/api/dropyouAcceptQuoteApi';
import { summarizePaymentApiError } from '@/features/delivery/api/deliveryPaymentApi';
import { DropyouQuoteCard } from '@/features/delivery/components/DropyouQuoteCard';
import type { LoadQuoteRow } from '@/features/delivery/socket/loadQuotesSocket.types';
import {
  majorToPence,
  parseDropyouQuoteCardModel,
} from '@/features/delivery/utils/dropyouQuoteCardData';
import { vehicleIconSource } from '@/features/home/utils/vehicleIconFromManifest';
import { useTheme } from '@/hooks/useTheme';
import { SegmentedTabs } from '@/shared/components/SegmentedTabs';
import { Skeleton, SkeletonCard } from '@/shared/components/Skeleton';
import { StatusChip } from '@/shared/components/StatusChip';
import type { ThemeColors } from '@/shared/theme/colors';
import { ROUTE_MARKER_COLORS, ROUTE_MARKER_SOFT_COLORS } from '@/shared/theme/routeMarkers';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import type { AppStackParamList } from '@/types/navigation.types';

type Props = NativeStackScreenProps<AppStackParamList, 'BookingDetails'>;

type ObjectRecord = Record<string, unknown>;
type RouteCoord = { latitude: number; longitude: number };
type DetailsTab = 'details' | 'quotes';

const EMPTY_QUOTES: unknown[] = [];

const DEFAULT_ROUTE_REGION: Region = {
  latitude: 51.5074,
  longitude: -0.1278,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

function asRecord(value: unknown): ObjectRecord | null {
  return value && typeof value === 'object' ? (value as ObjectRecord) : null;
}

function nested(value: unknown, path: string[]): unknown {
  let cur: unknown = value;
  for (const key of path) {
    const record = asRecord(cur);
    if (!record) return undefined;
    cur = record[key];
  }
  return cur;
}

function textAt(value: unknown, paths: string[][], fallback = '—'): string {
  for (const path of paths) {
    const raw = nested(value, path);
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
    if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
    if (typeof raw === 'boolean') return raw ? 'Yes' : 'No';
  }
  return fallback;
}

function numberAt(value: unknown, paths: string[][]): number | null {
  for (const path of paths) {
    const raw = nested(value, path);
    const num = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
    if (Number.isFinite(num)) return num;
  }
  return null;
}

function loadResult(response: unknown): unknown {
  return nested(response, ['result']) ?? response;
}

function cleanTimeLabel(label: string): string {
  const trimmed = label.trim();
  if (!trimmed || trimmed === '—') return trimmed || '—';

  const [timePart] = trimmed.split('|').map((part) => part.trim());
  const withoutZone = timePart.replace(/\s+(GMT|BST|UTC)$/i, '').trim();
  const range = withoutZone.match(/^(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})$/);
  if (range && range[1] === range[2]) return range[1];

  return withoutZone;
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function truthyAt(value: unknown, paths: string[][]): boolean {
  for (const path of paths) {
    const raw = nested(value, path);
    if (typeof raw === 'boolean') return raw;
    if (typeof raw === 'string') {
      const normalized = raw.trim().toLowerCase();
      if (normalized === 'true') return true;
      if (normalized === 'false') return false;
    }
  }
  return false;
}

function routeCoordFromDetails(details: unknown, role: 'pickup' | 'dropoff'): RouteCoord | null {
  const prefix = role === 'pickup' ? 'pickup' : 'dropoff';
  const addressKey = role === 'pickup' ? 'pickUpAddress' : 'dropOffAddress';
  const displayKey = role === 'pickup' ? 'from' : 'to';

  const latitude = numberAt(details, [
    [`${prefix}Latitude`],
    [`${prefix}Lat`],
    [`${displayKey}Latitude`],
    [`${displayKey}Lat`],
    [prefix, 'latitude'],
    [prefix, 'lat'],
    [displayKey, 'coordinates', 'lat'],
    [`${prefix}Location`, 'latitude'],
    [`${prefix}Location`, 'lat'],
    [addressKey, 'latitude'],
    [addressKey, 'lat'],
    [addressKey, 'location', 'latitude'],
    [addressKey, 'location', 'lat'],
    ['booking', addressKey, 'latitude'],
    ['booking', addressKey, 'lat'],
    ['booking', addressKey, 'location', 'latitude'],
    ['booking', addressKey, 'location', 'lat'],
    ['booking', prefix, 'latitude'],
    ['booking', prefix, 'lat'],
  ]);
  const longitude = numberAt(details, [
    [`${prefix}Longitude`],
    [`${prefix}Lng`],
    [`${displayKey}Longitude`],
    [`${displayKey}Lng`],
    [prefix, 'longitude'],
    [prefix, 'lng'],
    [displayKey, 'coordinates', 'lng'],
    [`${prefix}Location`, 'longitude'],
    [`${prefix}Location`, 'lng'],
    [addressKey, 'longitude'],
    [addressKey, 'lng'],
    [addressKey, 'location', 'longitude'],
    [addressKey, 'location', 'lng'],
    ['booking', addressKey, 'longitude'],
    ['booking', addressKey, 'lng'],
    ['booking', addressKey, 'location', 'longitude'],
    ['booking', addressKey, 'location', 'lng'],
    ['booking', prefix, 'longitude'],
    ['booking', prefix, 'lng'],
  ]);

  return latitude == null || longitude == null ? null : { latitude, longitude };
}

function quoteRowFromRaw(
  raw: unknown,
  loadId: string,
  fallbackBookingId: string | undefined,
  index: number,
): LoadQuoteRow | null {
  if (!raw || typeof raw !== 'object') return null;

  const realQuoteId = textAt(
    raw,
    [['quote', 'quoteId'], ['quote', 'quote_id'], ['quoteId'], ['quote_id']],
    '',
  );
  if (!realQuoteId) return null;

  const quoteId = textAt(
    raw,
    [['quote', 'quoteId'], ['quote', 'quote_id'], ['quoteId'], ['quote_id']],
    `quote-${loadId}-${index}`,
  );
  const rowLoadId = textAt(raw, [['quote', 'loadId'], ['quote', 'load_id'], ['loadId'], ['load_id']], loadId);
  const bookingId = textAt(
    raw,
    [
      ['quote', 'bookingId'],
      ['quote', 'booking_id'],
      ['bookingId'],
      ['booking_id'],
      ['booking', 'id'],
      ['booking', 'bookingId'],
      ['booking', 'booking_id'],
    ],
    fallbackBookingId ?? '',
  );
  const receivedAt = textAt(
    raw,
    [['quote', 'createdOn'], ['quote', 'created_on'], ['quote', 'eventTime'], ['createdOn'], ['created_at'], ['eventTime']],
    new Date().toISOString(),
  );

  return {
    quoteId,
    loadId: rowLoadId,
    bookingId: bookingId && bookingId !== '—' ? bookingId : undefined,
    receivedAt,
    source: 'teg_quotes',
    raw,
  };
}

function bookingIdFromDetails(details: unknown, routeBookingId?: string): string {
  return (
    nonEmpty(routeBookingId) ??
    textAt(
      details,
      [
        ['bookingId'],
        ['booking_id'],
        ['booking', 'bookingId'],
        ['booking', 'booking_id'],
        ['booking', 'id'],
        ['dropyouBookingId'],
        ['dropyou_booking_id'],
      ],
      '',
    )
  );
}

function routeRegion(pickup: RouteCoord | null, dropoff: RouteCoord | null): Region {
  if (!pickup && !dropoff) return DEFAULT_ROUTE_REGION;
  if (!pickup || !dropoff) {
    const coord = pickup ?? dropoff!;
    return { ...coord, latitudeDelta: 0.06, longitudeDelta: 0.06 };
  }

  const latitudeDelta = Math.max(Math.abs(pickup.latitude - dropoff.latitude) * 1.8, 0.05);
  const longitudeDelta = Math.max(Math.abs(pickup.longitude - dropoff.longitude) * 1.8, 0.05);
  return {
    latitude: (pickup.latitude + dropoff.latitude) / 2,
    longitude: (pickup.longitude + dropoff.longitude) / 2,
    latitudeDelta,
    longitudeDelta,
  };
}

function RouteMapMarker({
  icon,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <View style={[mapMarkerStyles.pin, { backgroundColor: color }]}>
      <Ionicons name={icon} size={17} color="#ffffff" />
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    content: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.md,
    },
    hero: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      minHeight: 134,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    heroPressed: {
      opacity: 0.86,
      transform: [{ scale: 0.99 }],
    },
    heroCopy: {
      flex: 1,
      minWidth: 0,
      gap: spacing.sm,
    },
    heroVehicleWrap: {
      width: 76,
      height: 76,
      borderRadius: 18,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
    },
    heroVehicleIcon: {
      width: 66,
      height: 66,
    },
    eyebrow: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.sm,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    title: {
      color: colors.textPrimary,
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.bold,
    },
    section: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.lg,
      gap: spacing.lg,
    },
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.bold,
    },
    mapCard: {
      height: 188,
      borderRadius: 14,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    map: {
      ...StyleSheet.absoluteFillObject,
    },
    mapActions: {
      position: 'absolute',
      right: spacing.sm,
      bottom: spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
    },
    mapIconAction: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    mapAction: {
      minHeight: 34,
      borderRadius: 17,
      paddingHorizontal: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    mapActionPressed: {
      opacity: 0.8,
      transform: [{ scale: 0.98 }],
    },
    mapActionText: {
      color: colors.textPrimary,
      fontSize: typography.fontSize.xs,
      fontWeight: '700',
    },
    tabPanel: {
      gap: spacing.md,
    },
    quoteList: {
      gap: spacing.md,
    },
    quoteActionsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.md,
    },
    outlineButton: {
      minHeight: 38,
      borderRadius: 10,
      paddingHorizontal: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    outlineButtonPressed: {
      opacity: 0.78,
      transform: [{ scale: 0.98 }],
    },
    outlineText: {
      color: colors.textPrimary,
      fontSize: typography.fontSize.sm,
      fontWeight: '700',
    },
    row: {
      gap: spacing.xs,
    },
    label: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.sm,
      fontWeight: '700',
    },
    value: {
      color: colors.textPrimary,
      fontSize: typography.fontSize.md,
      lineHeight: 22,
    },
    routeTime: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.sm,
      lineHeight: 20,
      fontWeight: '500',
    },
    routeRow: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'flex-start',
    },
    routeIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
    routeCopy: { flex: 1, gap: spacing.xs, minWidth: 0 },
    center: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
      gap: spacing.md,
    },
    muted: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.md,
      textAlign: 'center',
      lineHeight: 22,
    },
    retry: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    retryText: {
      color: colors.onPrimary,
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.bold,
    },
    skeletonRouteRow: {
      flexDirection: 'row',
      gap: spacing.md,
      alignItems: 'flex-start',
    },
    skeletonRouteCopy: { flex: 1, gap: spacing.sm },
  });
}

const mapMarkerStyles = StyleSheet.create({
  pin: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 4,
  },
});

export function BookingDetailsScreen({ route, navigation }: Props) {
  const { loadId } = route.params;
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const mapRef = useRef<MapView | null>(null);
  const [activeTab, setActiveTab] = useState<DetailsTab>('details');
  const [acceptingKey, setAcceptingKey] = useState<string | null>(null);
  const detailsResponse = useBookingDetailsStore((s) => s.detailsByLoadId[loadId]);
  const rawQuotes = useBookingDetailsStore((s) => s.quotesByLoadId[loadId] ?? EMPTY_QUOTES);
  const quotesFetched = useBookingDetailsStore((s) => Boolean(s.quotesFetchedByLoadId?.[loadId]));
  const loading = useBookingDetailsStore((s) => Boolean(s.loadingByLoadId[loadId]));
  const quotesLoading = useBookingDetailsStore((s) => Boolean(s.quotesLoadingByLoadId[loadId]));
  const error = useBookingDetailsStore((s) => s.errorByLoadId[loadId]);
  const quotesError = useBookingDetailsStore((s) => s.quotesErrorByLoadId[loadId]);
  const setDetails = useBookingDetailsStore((s) => s.setDetails);
  const setQuotes = useBookingDetailsStore((s) => s.setQuotes);
  const setError = useBookingDetailsStore((s) => s.setError);
  const setQuotesError = useBookingDetailsStore((s) => s.setQuotesError);
  const clearError = useBookingDetailsStore((s) => s.clearError);
  const clearQuotesError = useBookingDetailsStore((s) => s.clearQuotesError);
  const setLoading = useBookingDetailsStore((s) => s.setLoading);
  const setQuotesLoading = useBookingDetailsStore((s) => s.setQuotesLoading);

  const refresh = useCallback(async () => {
    setLoading(loadId, true);
    clearError(loadId);
    try {
      const response = await fetchLoadDetailsById(loadId);
      try {
        console.log(
          `[BookingDetailsScreen] GET /dropyou/load-by-id/${loadId} response`,
          JSON.stringify(response, null, 2),
        );
      } catch {
        console.log(`[BookingDetailsScreen] GET /dropyou/load-by-id/${loadId} response`, response);
      }
      setDetails(loadId, response);
    } catch (err) {
      setError(loadId, err instanceof Error ? err.message : 'Failed to load booking details.');
    } finally {
      setLoading(loadId, false);
    }
  }, [clearError, loadId, setDetails, setError, setLoading]);

  const refreshQuotes = useCallback(async () => {
    setQuotesLoading(loadId, true);
    clearQuotesError(loadId);
    try {
      const response = await fetchQuotesByLoadId(loadId);
      try {
        console.log(
          `[BookingDetailsScreen] GET /dropyou/quote-by-load-id/${loadId} response`,
          JSON.stringify(response, null, 2),
        );
      } catch {
        console.log(`[BookingDetailsScreen] GET /dropyou/quote-by-load-id/${loadId} response`, response);
      }
      setQuotes(loadId, response);
    } catch (err) {
      setQuotesError(loadId, err instanceof Error ? err.message : 'Failed to load quotes.');
    } finally {
      setQuotesLoading(loadId, false);
    }
  }, [clearQuotesError, loadId, setQuotes, setQuotesError, setQuotesLoading]);

  useEffect(() => {
    if (detailsResponse || loading) return;
    void refresh();
  }, [detailsResponse, loading, refresh]);

  useEffect(() => {
    if (quotesFetched || quotesLoading) return;
    void refreshQuotes();
  }, [quotesFetched, quotesLoading, refreshQuotes]);

  const details = loadResult(detailsResponse);

  if (!detailsResponse && loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <BookingDetailsSkeleton styles={styles} />
      </SafeAreaView>
    );
  }

  if (!detailsResponse) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.muted}>{error || 'Booking details are not loaded yet.'}</Text>
          <Pressable style={styles.retry} onPress={() => void refresh()} accessibilityRole="button">
            <Text style={styles.retryText}>Load details</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const status =
    nonEmpty(route.params.statusLabel) ??
    textAt(details, [['currentStatus'], ['status'], ['booking', 'status']], 'Status unavailable');
  const displayLoadId = textAt(details, [['loadId']], loadId);
  const pickup =
    nonEmpty(route.params.pickupAddress) ??
    textAt(details, [['fromDisplayAddress'], ['booking', 'pickUpAddress', 'address']]);
  const dropoff =
    nonEmpty(route.params.dropoffAddress) ??
    textAt(details, [['toDisplayAddress'], ['booking', 'dropOffAddress', 'address']]);
  const pickupTime = cleanTimeLabel(
    nonEmpty(route.params.pickupTimeLabel) ??
      textAt(details, [['pickupTime'], ['booking', 'pickupTime'], ['readyAt'], ['collectBy']]),
  );
  const dropoffTime = cleanTimeLabel(
    nonEmpty(route.params.dropoffTimeLabel) ??
      textAt(details, [['deliveryTime'], ['booking', 'dropoffTime'], ['deliverBy']]),
  );
  const vehicle =
    nonEmpty(route.params.vehicleName) ??
    textAt(details, [['vehicleDisplayName'], ['booking', 'vehicle', 'name'], ['minVehicleSize']]);
  const vehicleSrc = vehicleIconSource(vehicle);
  const owner = textAt(details, [['ownerDisplayName'], ['booking', 'recipientName'], ['booking', 'user', 'name']]);
  const phone = textAt(details, [['phoneNumber'], ['booking', 'phone']]);
  const reference = textAt(details, [['reference'], ['booking', 'id']], route.params.bookingId ?? '—');
  const acceptBookingId = bookingIdFromDetails(details, route.params.bookingId);
  const quotesEnabled = truthyAt(details, [['quotesEnabled'], ['booking', 'quotesEnabled']]);
  const pickupCoord = routeCoordFromDetails(details, 'pickup');
  const dropoffCoord = routeCoordFromDetails(details, 'dropoff');
  const routeCoords = pickupCoord && dropoffCoord ? [pickupCoord, dropoffCoord] : [];
  const hasRouteMap = Boolean(pickupCoord || dropoffCoord);
  const mapRegion = routeRegion(pickupCoord, dropoffCoord);

  const openMaps = () => {
    const origin = pickupCoord ? `${pickupCoord.latitude},${pickupCoord.longitude}` : pickup;
    const destination = dropoffCoord ? `${dropoffCoord.latitude},${dropoffCoord.longitude}` : dropoff;
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(destination)}`
        : `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
            origin,
          )}&destination=${encodeURIComponent(destination)}`;
    void Linking.openURL(url);
  };

  const recenterMap = () => {
    mapRef.current?.animateToRegion(mapRegion, 350);
  };

  const quoteModels = rawQuotes
    .map((quote, index) => quoteRowFromRaw(quote, loadId, acceptBookingId, index))
    .filter((row): row is LoadQuoteRow => Boolean(row))
    .map((row) => parseDropyouQuoteCardModel(row, acceptBookingId))
    .filter((quote): quote is NonNullable<ReturnType<typeof parseDropyouQuoteCardModel>> => Boolean(quote));
  const quoteOptions = [
    { value: 'details' as const, label: 'Details' },
    { value: 'quotes' as const, label: 'Quotes', badge: quoteModels.length },
  ];

  const acceptQuote = async (model: NonNullable<ReturnType<typeof parseDropyouQuoteCardModel>>) => {
    const key = `${model.loadId}:${model.quoteId}`;
    const bookingIdForAccept = nonEmpty(model.bookingId) ?? acceptBookingId;
    if (!bookingIdForAccept) {
      Alert.alert('Quote', 'This quote is missing a booking id, so it cannot be accepted yet.');
      return;
    }
    if (!nonEmpty(model.quoteId)) {
      Alert.alert('Quote', 'This quote is missing a quote id, so it cannot be accepted yet.');
      return;
    }

    setAcceptingKey(key);
    try {
      if (__DEV__) {
        console.log('[BookingDetails] accepting quote', {
          loadId: model.loadId,
          bookingId: bookingIdForAccept,
          quoteId: model.quoteId,
          carrierName: model.companyName,
          price: model.price,
          currency: model.currency,
        });
      }
      await acceptDropyouQuote(bookingIdForAccept, model.quoteId);
      navigation.navigate('DeliveryPayment', {
        amountPence: majorToPence(model.price, model.currency),
        vehicleName: model.vehicleType || vehicle,
        loadId: model.loadId,
        bookingId: bookingIdForAccept,
        quoteId: model.quoteId,
        carrierName: model.companyName,
        quoteOwnerId: model.quoteOwnerId ?? undefined,
        quoteOwnerPhone: model.quoteOwnerPhone ?? undefined,
        agreedRate: model.agreedRate ?? undefined,
      });
    } catch (err) {
      if (isAxiosError(err)) {
        console.warn(
          '[BookingDetails] accept-quote failed',
          err.config?.method,
          err.config?.url,
          err.response?.status,
          err.response?.data,
        );
      }
      Alert.alert('Quote', summarizePaymentApiError(err));
    } finally {
      setAcceptingKey(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable
          style={({ pressed }) => [styles.hero, pressed && styles.heroPressed]}
          onPress={() => void refresh()}
          accessibilityRole="button"
          accessibilityLabel="Refresh booking details"
        >
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>Booking #{displayLoadId}</Text>
            <Text style={styles.title} numberOfLines={2}>
              {vehicle}
            </Text>
            <StatusChip label={status} />
          </View>
          <View style={styles.heroVehicleWrap} accessibilityLabel={vehicle}>
            <Image
              source={vehicleSrc}
              style={styles.heroVehicleIcon}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </View>
        </Pressable>

        <SegmentedTabs value={activeTab} options={quoteOptions} onChange={setActiveTab} />

        {activeTab === 'details' ? (
          <View style={styles.tabPanel}>
            {hasRouteMap ? (
              <View style={styles.mapCard}>
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                  initialRegion={mapRegion}
                  rotateEnabled={false}
                  showsCompass={false}
                  toolbarEnabled={false}
                >
                  {routeCoords.length === 2 ? (
                    <Polyline
                      coordinates={routeCoords}
                      strokeColor={ROUTE_MARKER_COLORS.pickup}
                      strokeWidth={4}
                      lineCap="round"
                      lineJoin="round"
                    />
                  ) : null}
                  {pickupCoord ? (
                    <Marker coordinate={pickupCoord} anchor={{ x: 0.5, y: 0.5 }}>
                      <RouteMapMarker icon="location-sharp" color={ROUTE_MARKER_COLORS.pickup} />
                    </Marker>
                  ) : null}
                  {dropoffCoord ? (
                    <Marker coordinate={dropoffCoord} anchor={{ x: 0.5, y: 0.5 }}>
                      <RouteMapMarker icon="flag" color={ROUTE_MARKER_COLORS.dropoff} />
                    </Marker>
                  ) : null}
                </MapView>
                <View style={styles.mapActions}>
                  <Pressable
                    style={({ pressed }) => [styles.mapIconAction, pressed && styles.mapActionPressed]}
                    onPress={recenterMap}
                    accessibilityRole="button"
                    accessibilityLabel="Recenter route map"
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name="locate" size={16} color={colors.textPrimary} />
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.mapAction, pressed && styles.mapActionPressed]}
                    onPress={openMaps}
                    accessibilityRole="button"
                    accessibilityLabel="Open route in maps"
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="navigate" size={14} color={colors.textPrimary} />
                    <Text style={styles.mapActionText}>Open route</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Route</Text>
              <View style={styles.routeRow}>
                <View style={[styles.routeIcon, { backgroundColor: ROUTE_MARKER_SOFT_COLORS.pickup }]}>
                  <Ionicons name="location-sharp" size={18} color={ROUTE_MARKER_COLORS.pickup} />
                </View>
                <View style={styles.routeCopy}>
                  <Text style={styles.label}>Pickup</Text>
                  <Text style={styles.value}>{pickup}</Text>
                  <Text style={styles.routeTime}>{pickupTime}</Text>
                </View>
              </View>
              <View style={styles.routeRow}>
                <View style={[styles.routeIcon, { backgroundColor: ROUTE_MARKER_SOFT_COLORS.dropoff }]}>
                  <Ionicons name="flag" size={17} color={ROUTE_MARKER_COLORS.dropoff} />
                </View>
                <View style={styles.routeCopy}>
                  <Text style={styles.label}>Dropoff</Text>
                  <Text style={styles.value}>{dropoff}</Text>
                  <Text style={styles.routeTime}>{dropoffTime}</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Details</Text>
              <DetailRow label="Reference" value={reference} styles={styles} />
              <DetailRow label="Carrier / owner" value={owner} styles={styles} />
              <DetailRow label="Phone" value={phone} styles={styles} />
              <DetailRow
                label="Job type"
                value={textAt(details, [['jobDisplayDescription'], ['jobType'], ['booking', 'deliveryType']])}
                styles={styles}
              />
            </View>
          </View>
        ) : (
          <View style={styles.tabPanel}>
            <View style={styles.quoteActionsRow}>
              <Text style={styles.sectionTitle}>
                {quoteModels.length} quote{quoteModels.length === 1 ? '' : 's'}
              </Text>
              <Pressable
                style={({ pressed }) => [styles.outlineButton, pressed && styles.outlineButtonPressed]}
                onPress={() => void refreshQuotes()}
                accessibilityRole="button"
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Text style={styles.outlineText}>{quotesLoading ? 'Refreshing' : 'Refresh'}</Text>
              </Pressable>
            </View>

            {quotesLoading && quoteModels.length === 0 ? (
              <QuotesSkeleton />
            ) : quoteModels.length > 0 ? (
              <View style={styles.quoteList}>
                {quoteModels.map((quote) => {
                  const busy = acceptingKey === `${quote.loadId}:${quote.quoteId}`;
                  return (
                    <DropyouQuoteCard
                      key={`${quote.loadId}:${quote.quoteId}`}
                      quote={quote}
                      busy={busy}
                      onAccept={() => void acceptQuote(quote)}
                    />
                  );
                })}
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.muted}>
                  {quotesError || (quotesEnabled ? 'No quotes have been received for this booking yet.' : 'Quotes are not enabled for this booking.')}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BookingDetailsSkeleton({ styles }: { styles: ReturnType<typeof createStyles> }) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <SkeletonCard>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
          <View style={{ flex: 1, gap: spacing.sm }}>
            <Skeleton width="42%" height={14} />
            <Skeleton width="70%" height={30} radius={10} />
            <Skeleton width={92} height={22} radius={999} />
          </View>
          <Skeleton width={76} height={76} radius={18} />
        </View>
      </SkeletonCard>

      <SkeletonCard>
        <Skeleton width="28%" height={18} />
        <View style={styles.skeletonRouteRow}>
          <Skeleton width={40} height={40} radius={20} />
          <View style={styles.skeletonRouteCopy}>
            <Skeleton width="20%" height={14} />
            <Skeleton width="95%" height={18} />
            <Skeleton width="36%" height={14} />
          </View>
        </View>
        <View style={styles.skeletonRouteRow}>
          <Skeleton width={40} height={40} radius={20} />
          <View style={styles.skeletonRouteCopy}>
            <Skeleton width="24%" height={14} />
            <Skeleton width="88%" height={18} />
            <Skeleton width="34%" height={14} />
          </View>
        </View>
      </SkeletonCard>

      <SkeletonCard>
        <Skeleton width="32%" height={18} />
        <Skeleton width="58%" height={16} />
        <Skeleton width="74%" height={16} />
        <Skeleton width="46%" height={16} />
        <Skeleton width="64%" height={16} />
      </SkeletonCard>
    </ScrollView>
  );
}

function QuotesSkeleton() {
  return (
    <View style={{ gap: spacing.md }}>
      {[0, 1].map((item) => (
        <SkeletonCard key={item}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
            <Skeleton width={44} height={44} radius={22} />
            <View style={{ flex: 1, gap: spacing.sm }}>
              <Skeleton width="74%" height={18} />
              <Skeleton width="38%" height={14} />
            </View>
            <View style={{ alignItems: 'flex-end', gap: spacing.xs }}>
              <Skeleton width={92} height={24} radius={8} />
              <Skeleton width={54} height={14} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Skeleton width="58%" height={44} radius={14} />
            <Skeleton width={104} height={44} radius={14} />
          </View>
        </SkeletonCard>
      ))}
    </View>
  );
}

function DetailRow({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}
