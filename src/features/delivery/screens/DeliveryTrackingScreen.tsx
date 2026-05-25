import { Ionicons } from '@expo/vector-icons';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  type LatLng,
  type Region,
} from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  fetchActiveTrips,
  fetchCurrentDropyouLocation,
  fetchLoadDetailsById,
} from '@/api/modules/dropyou.api';
import { useLoadQuotesSocket } from '@/features/delivery/providers/LoadQuotesSocketProvider';
import { useDeliveryOrderDraftStore } from '@/features/delivery/store/deliveryOrderDraftStore';
import { useTheme } from '@/hooks/useTheme';
import { SegmentedTabs } from '@/shared/components/SegmentedTabs';
import { Skeleton } from '@/shared/components/Skeleton';
import { StatusChip } from '@/shared/components/StatusChip';
import { env } from '@/shared/config/env';
import { DARK_MAP_STYLE } from '@/shared/theme/mapStyle';
import {
  ROUTE_MARKER_COLORS,
  ROUTE_MARKER_SOFT_COLORS,
} from '@/shared/theme/routeMarkers';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import type { AppStackParamList } from '@/types/navigation.types';

type Props = NativeStackScreenProps<AppStackParamList, 'DeliveryTracking'>;
type ObjectRecord = Record<string, unknown>;
type TrackingTab = 'tracking' | 'details';
type TimelineEntry = {
  status: string;
  time: string;
  eta?: string;
};
type VehiclePoint = LatLng & {
  address?: string;
  timestamp?: string;
  source: 'socket' | 'poll' | 'simulated';
};

const DEFAULT_REGION: Region = {
  latitude: 51.5074,
  longitude: -0.1278,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

const VEHICLE_ANIMATION_MS = 1200;
const LIVE_REFRESH_MS = 15_000;
const SHEET_SNAP_RATIOS = [0.3, 0.58, 0.88] as const;
const DEFAULT_TRACKING_SCREEN_HEIGHT = 760;
const TRACKING_ZOOM_DELTA = 0.035;

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

function stringAt(value: unknown, paths: string[][]): string | null {
  for (const path of paths) {
    const raw = nested(value, path);
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
    if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
  }
  return null;
}

function numberAt(value: unknown, paths: string[][]): number | null {
  for (const path of paths) {
    const raw = nested(value, path);
    const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function numberFrom(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function loadResult(response: unknown): unknown {
  return nested(response, ['result']) ?? response;
}

function arrayAt(value: unknown, paths: string[][]): unknown[] {
  for (const path of paths) {
    const raw = nested(value, path);
    if (Array.isArray(raw)) return raw;
  }
  return [];
}

function cleanTimeLabel(label: string | null | undefined): string {
  const trimmed = label?.trim() ?? '';
  if (!trimmed || trimmed === '—') return trimmed || '—';

  const [timePart] = trimmed.split('|').map((part) => part.trim());
  const withoutZone = timePart.replace(/\s+(GMT|BST|UTC)$/i, '').trim();
  const range = withoutZone.match(/^(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})$/);
  if (range && range[1] === range[2]) return range[1];

  return withoutZone;
}

function formatTimestampLabel(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return cleanTimeLabel(value);

  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(date);
  } catch {
    return cleanTimeLabel(value);
  }
}

function coordsAt(value: unknown, role: 'pickup' | 'dropoff'): LatLng | null {
  const prefix = role === 'pickup' ? 'pickup' : 'dropoff';
  const displayKey = role === 'pickup' ? 'from' : 'to';
  const addressKey = role === 'pickup' ? 'pickUpAddress' : 'dropOffAddress';

  const latitude = numberAt(value, [
    [`${prefix}Latitude`],
    [`${prefix}Lat`],
    [`${displayKey}Latitude`],
    [`${displayKey}Lat`],
    [prefix, 'latitude'],
    [prefix, 'lat'],
    [displayKey, 'coordinates', 'latitude'],
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
  ]);
  const longitude = numberAt(value, [
    [`${prefix}Longitude`],
    [`${prefix}Lng`],
    [`${displayKey}Longitude`],
    [`${displayKey}Lng`],
    [prefix, 'longitude'],
    [prefix, 'lng'],
    [displayKey, 'coordinates', 'longitude'],
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
  ]);

  return latitude == null || longitude == null ? null : { latitude, longitude };
}

function vehicleIdFrom(value: unknown): string | null {
  const direct = stringAt(value, [
    ['order', 'executorVehicleId'],
    ['order', 'executor_vehicle_id'],
    ['executorVehicleId'],
    ['executor_vehicle_id'],
    ['vehicleId'],
    ['vehicle_id'],
    ['driverVehicleId'],
    ['driver_vehicle_id'],
    ['booking', 'order', 'executorVehicleId'],
    ['booking', 'order', 'executor_vehicle_id'],
    ['booking', 'executorVehicleId'],
    ['booking', 'executor_vehicle_id'],
    ['booking', 'vehicleId'],
    ['booking', 'vehicle_id'],
    ['vehicle', 'id'],
    ['vehicle', 'vehicleId'],
    ['vehicle', 'vehicle_id'],
  ]);
  return direct;
}

function locationFromPayload(
  payload: unknown,
  source: VehiclePoint['source'],
): VehiclePoint | null {
  const raw = asRecord(loadResult(payload));
  if (!raw) return null;
  const loc = asRecord(raw.location) ?? asRecord(raw.currentLocation);
  const latitude = numberAt(raw, [
    ['latitude'],
    ['lat'],
    ['currentLatitude'],
    ['currentLat'],
    ['address', 'latitude'],
    ['address', 'lat'],
  ]);
  const longitude = numberAt(raw, [
    ['longitude'],
    ['lng'],
    ['currentLongitude'],
    ['currentLng'],
    ['address', 'longitude'],
    ['address', 'lng'],
  ]);
  const locationLatitude = numberFrom(loc?.latitude ?? loc?.lat);
  const locationLongitude = numberFrom(loc?.longitude ?? loc?.lng);
  const lat = latitude ?? locationLatitude;
  const lng = longitude ?? locationLongitude;
  if (lat == null || lng == null) return null;

  return {
    latitude: lat,
    longitude: lng,
    source,
    address:
      stringAt(raw, [['address']]) ??
      stringAt(raw, [
        ['address', 'fullAddress'],
        ['address', 'address'],
      ]) ??
      undefined,
    timestamp:
      stringAt(raw, [['timestamp'], ['createdAt'], ['updatedAt'], ['recordedAt']]) ??
      undefined,
  };
}

function timelineEntriesFromDetails(details: unknown): TimelineEntry[] {
  const source = stringAt(details, [['source']]);
  const rawTimeline =
    source === 'DRIVER_APP'
      ? arrayAt(details, [['statusHistory']]).map((item) => ({
          status: stringAt(item, [['status']]) ?? '',
          time: stringAt(item, [['timestamp']]) ?? '',
          eta: stringAt(item, [
            ['additionalData', 'additionalData', 'estimatedArrivalTime'],
            ['additionalData', 'estimatedArrivalTime'],
          ]) ?? undefined,
        }))
      : arrayAt(details, [['bookingStatuses']]).map((item) => ({
          status: stringAt(item, [['bookingStatus'], ['status']]) ?? '',
          time: stringAt(item, [['statusTime'], ['timestamp']]) ?? '',
        }));

  const bookedAt = stringAt(details, [
    ['booking', 'selectedQuoteDetails', 'createdAt'],
    ['selectedQuoteDetails', 'createdAt'],
  ]);
  const withBooked =
    bookedAt && !rawTimeline.some((item) => item.status === 'BOOKED')
      ? [{ status: 'BOOKED', time: bookedAt }, ...rawTimeline]
      : rawTimeline;

  return withBooked
    .filter((item) => Boolean(item.status.trim()) && Boolean(item.time.trim()))
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}

function statusLabelText(status: string): string {
  return status.replace(/_/g, ' ').trim() || 'Update';
}

function formatGbpFromPence(pence?: number): string | null {
  if (typeof pence !== 'number' || !Number.isFinite(pence) || pence <= 0) return null;
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(
    pence / 100,
  );
}

function focusedRegionFor(
  point: LatLng | null,
  viewportHeight = DEFAULT_TRACKING_SCREEN_HEIGHT,
  visibleMapHeight = DEFAULT_TRACKING_SCREEN_HEIGHT,
): Region {
  if (!point) return DEFAULT_REGION;
  const latitudeDelta = TRACKING_ZOOM_DELTA;
  const safeViewportHeight = Math.max(1, viewportHeight);
  const coveredHeight = Math.max(0, safeViewportHeight - visibleMapHeight);
  const latitudeOffset = (coveredHeight / 2 / safeViewportHeight) * latitudeDelta;
  return {
    latitude: point.latitude - latitudeOffset,
    longitude: point.longitude,
    latitudeDelta,
    longitudeDelta: TRACKING_ZOOM_DELTA,
  };
}

function interpolatePoint(from: LatLng, to: LatLng, progress: number): LatLng {
  return {
    latitude: from.latitude + (to.latitude - from.latitude) * progress,
    longitude: from.longitude + (to.longitude - from.longitude) * progress,
  };
}

function TrackingMarker({
  icon,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <View style={[markerStyles.pin, { backgroundColor: color }]}>
      <Ionicons name={icon} size={17} color="#ffffff" />
    </View>
  );
}

export function DeliveryTrackingScreen({ route }: Props) {
  const { colors, isDark } = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const {
    loadId,
    bookingId,
    vehicleName: routeVehicleName,
    amountPence,
    carrierName,
    pickupAddress,
    dropoffAddress,
    pickupTimeLabel: routePickupTimeLabel,
    dropoffTimeLabel: routeDropoffTimeLabel,
  } = route.params;
  const pickupDraft = useDeliveryOrderDraftStore((s) => s.pickup);
  const dropoffDraft = useDeliveryOrderDraftStore((s) => s.dropoff);
  const {
    subscribeToLoad,
    unsubscribeFromLoad,
    subscribeToVehicle,
    unsubscribeFromVehicle,
    vehicleLocations,
  } = useLoadQuotesSocket();

  const mapRef = useRef<MapView | null>(null);
  const animationRef = useRef<number | null>(null);
  const displayedVehicleRef = useRef<VehiclePoint | null>(null);
  const didFitMapRef = useRef(false);
  const sheetPosition = useSharedValue(DEFAULT_TRACKING_SCREEN_HEIGHT * (1 - 0.58));
  const [trackingDetails, setTrackingDetails] = useState<unknown>(null);
  const [fallbackTrip, setFallbackTrip] = useState<unknown>(null);
  const [pollLocation, setPollLocation] = useState<VehiclePoint | null>(null);
  const [simLocation, setSimLocation] = useState<VehiclePoint | null>(null);
  const [displayedVehicle, setDisplayedVehicle] = useState<VehiclePoint | null>(null);
  const [loadingTrip, setLoadingTrip] = useState(true);
  const [activeTab, setActiveTab] = useState<TrackingTab>('tracking');
  const [sheetIndex, setSheetIndex] = useState(1);
  const [screenHeight, setScreenHeight] = useState(DEFAULT_TRACKING_SCREEN_HEIGHT);

  const details = useMemo(
    () => loadResult(trackingDetails) ?? fallbackTrip,
    [fallbackTrip, trackingDetails],
  );

  const pickupCoords = useMemo(
    () =>
      coordsAt(details, 'pickup') ??
      (pickupDraft ? { latitude: pickupDraft.lat, longitude: pickupDraft.lng } : null),
    [details, pickupDraft],
  );
  const dropoffCoords = useMemo(
    () =>
      coordsAt(details, 'dropoff') ??
      (dropoffDraft ? { latitude: dropoffDraft.lat, longitude: dropoffDraft.lng } : null),
    [details, dropoffDraft],
  );
  const routeCoords = useMemo(
    () => (pickupCoords && dropoffCoords ? [pickupCoords, dropoffCoords] : []),
    [dropoffCoords, pickupCoords],
  );
  const vehicleId = useMemo(
    () => vehicleIdFrom(details) ?? vehicleIdFrom(fallbackTrip),
    [details, fallbackTrip],
  );
  const socketLocation = useMemo<VehiclePoint | null>(() => {
    if (!vehicleId) return null;
    const latest = vehicleLocations[vehicleId];
    return latest
      ? {
          latitude: latest.location.lat,
          longitude: latest.location.lng,
          address: latest.address,
          timestamp: latest.timestamp,
          source: 'socket',
        }
      : null;
  }, [vehicleId, vehicleLocations]);
  const targetVehicleLocation = socketLocation ?? pollLocation ?? simLocation;
  const visibleMapHeight = useMemo(() => {
    const ratio = SHEET_SNAP_RATIOS[sheetIndex] ?? SHEET_SNAP_RATIOS[1];
    return Math.max(1, screenHeight * (1 - ratio));
  }, [screenHeight, sheetIndex]);
  const mapRegion = useMemo(
    () =>
      focusedRegionFor(
        displayedVehicle ?? targetVehicleLocation ?? pickupCoords ?? dropoffCoords,
        screenHeight,
        visibleMapHeight,
      ),
    [
      displayedVehicle,
      dropoffCoords,
      pickupCoords,
      screenHeight,
      targetVehicleLocation,
      visibleMapHeight,
    ],
  );

  useEffect(() => {
    displayedVehicleRef.current = displayedVehicle;
  }, [displayedVehicle]);

  const statusLabel =
    stringAt(details, [
      ['currentStatus'],
      ['status'],
      ['loadStatus'],
      ['booking', 'status'],
    ]) ?? 'Driver assigned';
  const vehicleName =
    routeVehicleName ??
    stringAt(details, [
      ['vehicleDisplayName'],
      ['booking', 'vehicle', 'name'],
      ['minVehicleSize'],
    ]) ??
    'Delivery vehicle';
  const pickupLabel =
    pickupAddress ??
    stringAt(details, [
      ['fromDisplayAddress'],
      ['booking', 'pickUpAddress', 'address'],
    ]) ??
    pickupDraft?.address ??
    'Pickup location';
  const dropoffLabel =
    dropoffAddress ??
    stringAt(details, [['toDisplayAddress'], ['booking', 'dropOffAddress', 'address']]) ??
    dropoffDraft?.address ??
    'Dropoff location';
  const pickupTimeLabel = cleanTimeLabel(
    routePickupTimeLabel ??
      stringAt(details, [
        ['pickupTime'],
        ['booking', 'pickupTime'],
        ['readyAt'],
        ['collectBy'],
        ['scheduledPickup'],
        ['pickupAt'],
      ]),
  );
  const dropoffTimeLabel = cleanTimeLabel(
    routeDropoffTimeLabel ??
      stringAt(details, [
        ['deliveryTime'],
        ['booking', 'dropoffTime'],
        ['dropoffTime'],
        ['deliverBy'],
        ['arrivalTime'],
        ['scheduledDropoff'],
        ['dropoffAt'],
      ]),
  );
  const timelineData = useMemo(() => timelineEntriesFromDetails(details), [details]);
  const latestTimelineEntry = timelineData[0];
  const latestEtaLabel = formatTimestampLabel(latestTimelineEntry?.eta);
  const vehicleNow = displayedVehicle ?? targetVehicleLocation;
  const vehicleNowLabel = vehicleNow?.address ?? (vehicleNow ? 'Driver location received' : null);
  const priceLabel = formatGbpFromPence(amountPence);
  const sheetSnapPoints = useMemo(() => ['30%', '58%', '88%'], []);
  const mapActionsStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateY: sheetPosition.value - screenHeight,
      },
    ],
  }));
  const tabOptions = useMemo(
    () => [
      { value: 'tracking' as const, label: 'Tracking' },
      { value: 'details' as const, label: 'Details' },
    ],
    [],
  );

  useEffect(() => {
    subscribeToLoad(String(loadId));
    return () => unsubscribeFromLoad(String(loadId));
  }, [loadId, subscribeToLoad, unsubscribeFromLoad]);

  useEffect(() => {
    if (!vehicleId) return;
    subscribeToVehicle(vehicleId);
    return () => unsubscribeFromVehicle(vehicleId);
  }, [subscribeToVehicle, unsubscribeFromVehicle, vehicleId]);

  const loadTrip = useCallback(async () => {
    setLoadingTrip(true);
    try {
      const response = await fetchLoadDetailsById(loadId);
      setTrackingDetails(response);
    } catch (err) {
      if (__DEV__) console.warn('[DeliveryTracking] load-by-id failed', err);
      try {
        const trips = await fetchActiveTrips();
        const match =
          trips.find((trip) => {
            const id =
              stringAt(trip, [
                ['id'],
                ['loadId'],
                ['load_id'],
                ['tegLoadId'],
                ['teg_load_id'],
              ]) ?? stringAt(trip, [['uuid']]);
            return id === String(loadId);
          }) ?? null;
        setFallbackTrip(match);
      } catch (innerErr) {
        if (__DEV__)
          console.warn('[DeliveryTracking] active-trips fallback failed', innerErr);
      }
    } finally {
      setLoadingTrip(false);
    }
  }, [loadId]);

  const refreshCurrentLocation = useCallback(async () => {
    try {
      const response = await fetchCurrentDropyouLocation(loadId);
      const normalized = locationFromPayload(response, 'poll');
      if (normalized) setPollLocation(normalized);
    } catch (err) {
      if (__DEV__) console.warn('[DeliveryTracking] current-location failed', err);
    }
  }, [loadId]);

  useEffect(() => {
    void loadTrip();
    const interval = setInterval(loadTrip, 30_000);
    return () => clearInterval(interval);
  }, [loadTrip]);

  useEffect(() => {
    void refreshCurrentLocation();
    const interval = setInterval(refreshCurrentLocation, LIVE_REFRESH_MS);
    return () => clearInterval(interval);
  }, [refreshCurrentLocation]);

  useEffect(() => {
    if (
      !env.simulateTracking ||
      socketLocation ||
      pollLocation ||
      !pickupCoords ||
      !dropoffCoords
    )
      return;
    const startedAt = Date.now();
    const tick = () => {
      const elapsed = (Date.now() - startedAt) % 90_000;
      const progress = elapsed / 90_000;
      setSimLocation({
        ...interpolatePoint(pickupCoords, dropoffCoords, progress),
        source: 'simulated',
        timestamp: new Date().toISOString(),
      });
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [dropoffCoords, pickupCoords, pollLocation, socketLocation]);

  useEffect(() => {
    if (!targetVehicleLocation) return;
    if (animationRef.current != null) cancelAnimationFrame(animationRef.current);

    const from = displayedVehicleRef.current ?? targetVehicleLocation;
    const to = targetVehicleLocation;
    const startedAt = Date.now();
    const step = () => {
      const progress = Math.min(1, (Date.now() - startedAt) / VEHICLE_ANIMATION_MS);
      setDisplayedVehicle({
        ...to,
        ...interpolatePoint(from, to, progress),
      });
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(step);
      }
    };
    step();

    return () => {
      if (animationRef.current != null) cancelAnimationFrame(animationRef.current);
    };
  }, [targetVehicleLocation]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.animateToRegion(mapRegion, didFitMapRef.current ? 450 : 0);
    didFitMapRef.current = true;
  }, [mapRegion]);

  const recenter = useCallback(() => {
    mapRef.current?.animateToRegion(mapRegion, 400);
  }, [mapRegion]);

  const styles = useMemo(() => {
    const narrow = windowWidth < 380;
    return StyleSheet.create({
      safe: { flex: 1, backgroundColor: colors.background },
      mapWrap: {
        flex: 1,
        backgroundColor: '#EEF2F7',
      },
      map: { ...StyleSheet.absoluteFillObject },
      mapActions: {
        position: 'absolute',
        right: spacing.md,
        bottom: spacing.md,
        gap: spacing.sm,
      },
      floatingButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 4,
      },
      body: {
        flex: 1,
        backgroundColor: colors.background,
      },
      handle: {
        width: 48,
        height: 5,
        borderRadius: 3,
        backgroundColor: colors.border,
      },
      content: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.xs,
        paddingBottom: spacing.xl + spacing.md,
        gap: spacing.md,
      },
      tabsWrap: {
        paddingTop: spacing.xs,
      },
      topLiveCard: {
        backgroundColor: colors.primary + '12',
        borderRadius: 16,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.primary + '55',
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
      },
      headerRow: {
        flexDirection: narrow ? 'column' : 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: narrow ? spacing.sm : spacing.md,
      },
      title: {
        color: colors.textPrimary,
        fontSize: 22,
        lineHeight: 28,
        fontWeight: '900',
      },
      muted: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.sm,
        lineHeight: 20,
      },
      liveRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: spacing.sm,
        marginTop: spacing.xs,
      },
      livePill: {
        minHeight: 28,
        borderRadius: 14,
        paddingHorizontal: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: colors.primary + '14',
      },
      liveText: {
        color: colors.textPrimary,
        fontSize: typography.fontSize.xs,
        fontWeight: '800',
      },
      card: {
        backgroundColor: colors.surface,
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        padding: spacing.md,
        gap: spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
        elevation: 3,
      },
      timelineCard: {
        backgroundColor: colors.surface,
        borderRadius: 18,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: colors.border,
        padding: spacing.md,
      },
      timelineHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: spacing.md,
        marginBottom: spacing.sm,
      },
      timelineTitle: {
        color: colors.textPrimary,
        fontSize: typography.fontSize.md,
        fontWeight: '900',
      },
      timelineRow: {
        flexDirection: 'row',
        gap: spacing.sm,
      },
      timelineRail: {
        width: 20,
        alignItems: 'center',
      },
      timelineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: colors.surface,
      },
      timelineLine: {
        width: 2,
        flex: 1,
        minHeight: 38,
        backgroundColor: colors.border,
      },
      timelineCopy: {
        flex: 1,
        minWidth: 0,
        paddingBottom: spacing.md,
      },
      timelineCopyLast: {
        paddingBottom: 0,
      },
      timelineMeta: {
        color: colors.textSecondary,
        fontSize: typography.fontSize.xs,
        lineHeight: 17,
        marginTop: 2,
      },
      row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
      },
      iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
      },
      rowCopy: { flex: 1, minWidth: 0 },
      label: {
        color: colors.textSecondary,
        fontSize: 11,
        fontWeight: typography.fontWeight.bold,
        textTransform: 'uppercase',
      },
      value: {
        color: colors.textPrimary,
        fontSize: typography.fontSize.sm,
        lineHeight: 19,
        fontWeight: typography.fontWeight.bold,
        marginTop: 2,
      },
    });
  }, [colors, windowWidth]);

  return (
    <SafeAreaView
      style={styles.safe}
      edges={['bottom']}
      onLayout={(event) => {
        const nextHeight = event.nativeEvent.layout.height;
        if (nextHeight > 0) setScreenHeight(nextHeight);
      }}
    >
      <View style={styles.mapWrap}>
        <MapView
          key={isDark ? 'tracking-map-dark' : 'tracking-map-light'}
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
          initialRegion={mapRegion}
          rotateEnabled={false}
          showsCompass={false}
          toolbarEnabled={false}
          loadingBackgroundColor={colors.background}
          userInterfaceStyle={isDark ? 'dark' : 'light'}
          customMapStyle={isDark && Platform.OS === 'android' ? DARK_MAP_STYLE : undefined}
        >
          {routeCoords.length === 2 ? (
            <Polyline
              coordinates={routeCoords}
              strokeColor={colors.primary}
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
            />
          ) : null}
          {pickupCoords ? (
            <Marker coordinate={pickupCoords} anchor={{ x: 0.5, y: 0.5 }}>
              <TrackingMarker icon="location-sharp" color={ROUTE_MARKER_COLORS.pickup} />
            </Marker>
          ) : null}
          {dropoffCoords ? (
            <Marker coordinate={dropoffCoords} anchor={{ x: 0.5, y: 0.5 }}>
              <TrackingMarker icon="flag" color={ROUTE_MARKER_COLORS.dropoff} />
            </Marker>
          ) : null}
          {displayedVehicle ? (
            <Marker coordinate={displayedVehicle} anchor={{ x: 0.5, y: 0.5 }}>
              <TrackingMarker icon="car-sport" color="#111827" />
            </Marker>
          ) : null}
        </MapView>
        <Animated.View style={[styles.mapActions, mapActionsStyle]}>
          <Pressable
            style={styles.floatingButton}
            onPress={recenter}
            accessibilityRole="button"
            accessibilityLabel="Recenter tracking map"
          >
            <Ionicons name="locate" size={20} color={colors.textPrimary} />
          </Pressable>
        </Animated.View>
      </View>

      <BottomSheet
        index={1}
        snapPoints={sheetSnapPoints}
        animatedPosition={sheetPosition}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        onChange={setSheetIndex}
        handleIndicatorStyle={styles.handle}
        backgroundStyle={styles.body}
      >
        <BottomSheetScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator
        >
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Tracking your delivery</Text>
              <Text style={styles.muted}>
                Vehicle movement updates automatically when the driver is online.
              </Text>
            </View>
            <StatusChip label={statusLabel} />
          </View>

          {vehicleNowLabel ? (
            <View style={styles.topLiveCard}>
              <View style={[styles.iconWrap, { backgroundColor: colors.primary + '20' }]}>
                <Ionicons name="navigate-circle" size={18} color={colors.primary} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.label}>Driver location</Text>
                <Text style={styles.value}>{vehicleNowLabel}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.tabsWrap}>
            <SegmentedTabs
              value={activeTab}
              options={tabOptions}
              onChange={setActiveTab}
            />
          </View>

          {activeTab === 'tracking' ? (
            <>
              <View style={styles.card}>
                <View style={styles.row}>
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: ROUTE_MARKER_SOFT_COLORS.pickup },
                    ]}
                  >
                    <Ionicons
                      name="location-sharp"
                      size={18}
                      color={ROUTE_MARKER_COLORS.pickup}
                    />
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={styles.label}>Pickup</Text>
                    <Text style={styles.value}>{pickupLabel}</Text>
                  </View>
                </View>
                <View style={styles.row}>
                  <View
                    style={[
                      styles.iconWrap,
                      { backgroundColor: ROUTE_MARKER_SOFT_COLORS.dropoff },
                    ]}
                  >
                    <Ionicons name="flag" size={17} color={ROUTE_MARKER_COLORS.dropoff} />
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={styles.label}>Dropoff</Text>
                    <Text style={styles.value}>{dropoffLabel}</Text>
                  </View>
                </View>
              </View>

              {timelineData.length > 0 ? (
                <View style={styles.timelineCard}>
                  <View style={styles.timelineHeader}>
                    <Text style={styles.timelineTitle}>Delivery timeline</Text>
                    {latestEtaLabel ? (
                      <View style={styles.livePill}>
                        <Ionicons name="time" size={14} color={colors.primary} />
                        <Text style={styles.liveText}>ETA {latestEtaLabel}</Text>
                      </View>
                    ) : null}
                  </View>

                  {timelineData.map((item, index) => {
                    const isLast = index === timelineData.length - 1;
                    const eta = formatTimestampLabel(item.eta);
                    return (
                      <View key={`${item.status}-${item.time}-${index}`} style={styles.timelineRow}>
                        <View style={styles.timelineRail}>
                          <View
                            style={[
                              styles.timelineDot,
                              {
                                backgroundColor:
                                  index === 0 ? colors.primary : colors.border,
                              },
                            ]}
                          />
                          {isLast ? null : <View style={styles.timelineLine} />}
                        </View>
                        <View
                          style={[
                            styles.timelineCopy,
                            isLast && styles.timelineCopyLast,
                          ]}
                        >
                          <Text style={styles.label}>{statusLabelText(item.status)}</Text>
                          <Text style={styles.value}>
                            {formatTimestampLabel(item.time) ?? cleanTimeLabel(item.time)}
                          </Text>
                          {eta ? <Text style={styles.timelineMeta}>ETA {eta}</Text> : null}
                        </View>
                      </View>
                    );
                  })}
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.card}>
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="car-sport" size={18} color={colors.primary} />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={styles.label}>Carrier</Text>
                  <Text style={styles.value}>{carrierName ?? 'Assigned carrier'}</Text>
                </View>
              </View>
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                  <Ionicons name="cube" size={18} color={colors.primary} />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={styles.label}>Booking</Text>
                  <Text style={styles.value}>
                    {vehicleName}
                    {priceLabel ? ` · ${priceLabel}` : ''}
                  </Text>
                </View>
              </View>
              <View style={styles.row}>
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: ROUTE_MARKER_SOFT_COLORS.pickup },
                  ]}
                >
                  <Ionicons
                    name="location-sharp"
                    size={18}
                    color={ROUTE_MARKER_COLORS.pickup}
                  />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={styles.label}>Pickup</Text>
                  <Text style={styles.value}>{pickupLabel}</Text>
                  <Text style={styles.timelineMeta}>{pickupTimeLabel}</Text>
                </View>
              </View>
              <View style={styles.row}>
                <View
                  style={[
                    styles.iconWrap,
                    { backgroundColor: ROUTE_MARKER_SOFT_COLORS.dropoff },
                  ]}
                >
                  <Ionicons name="flag" size={17} color={ROUTE_MARKER_COLORS.dropoff} />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={styles.label}>Dropoff</Text>
                  <Text style={styles.value}>{dropoffLabel}</Text>
                  <Text style={styles.timelineMeta}>{dropoffTimeLabel}</Text>
                </View>
              </View>
            </View>
          )}

          {loadingTrip ? (
            <View style={styles.row}>
              <Skeleton width={36} height={36} radius={18} />
              <View style={styles.rowCopy}>
                <Skeleton width="58%" height={16} />
                <Skeleton width="42%" height={14} style={{ marginTop: spacing.xs }} />
              </View>
            </View>
          ) : null}
        </BottomSheetScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const markerStyles = StyleSheet.create({
  pin: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 5,
  },
});
