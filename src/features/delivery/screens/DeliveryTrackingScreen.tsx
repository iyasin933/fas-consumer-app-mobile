import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
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

import { fetchActiveTrips } from '@/api/modules/dropyou.api';
import { useDeliveryOrderDraftStore } from '@/features/delivery/store/deliveryOrderDraftStore';
import { useLoadQuotesSocket } from '@/features/delivery/providers/LoadQuotesSocketProvider';
import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import type { AppStackParamList } from '@/types/navigation.types';

type Props = NativeStackScreenProps<AppStackParamList, 'DeliveryTracking'>;

const DEFAULT_REGION: Region = {
  latitude: 51.5074,
  longitude: -0.1278,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

function formatGbpFromPence(pence: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
}

function valueAt(obj: Record<string, unknown> | null, keys: string[]): unknown {
  if (!obj) return undefined;
  for (const key of keys) {
    const value = obj[key];
    if (value != null) return value;
  }
  return undefined;
}

function stringAt(obj: Record<string, unknown> | null, keys: string[]): string | null {
  const value = valueAt(obj, keys);
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return null;
}

function coordsFromPlace(place: { lat: number; lng: number } | null) {
  return place ? { latitude: place.lat, longitude: place.lng } : null;
}

function regionForPickup(pickup: { latitude: number; longitude: number } | null): Region {
  if (!pickup) return DEFAULT_REGION;
  return {
    latitude: pickup.latitude,
    longitude: pickup.longitude,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
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

export function DeliveryTrackingScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { loadId, bookingId, vehicleName, amountPence, carrierName } = route.params;
  const pickup = useDeliveryOrderDraftStore((s) => s.pickup);
  const dropoff = useDeliveryOrderDraftStore((s) => s.dropoff);
  const {
    isConnected,
    subscribeToLoad,
    unsubscribeFromLoad,
    subscribeToVehicle,
    unsubscribeFromVehicle,
    vehicleLocations,
  } = useLoadQuotesSocket();

  const [activeTrip, setActiveTrip] = useState<Record<string, unknown> | null>(null);
  const [loadingTrip, setLoadingTrip] = useState(true);

  const pickupCoords = useMemo(() => coordsFromPlace(pickup), [pickup]);
  const dropoffCoords = useMemo(() => coordsFromPlace(dropoff), [dropoff]);
  const routeCoords = useMemo(
    () => (pickupCoords && dropoffCoords ? [pickupCoords, dropoffCoords] : []),
    [dropoffCoords, pickupCoords],
  );
  const mapRegion = useMemo(() => regionForPickup(pickupCoords), [pickupCoords]);

  const vehicleId = useMemo(() => {
    const direct =
      stringAt(activeTrip, ['vehicleId', 'vehicle_id']) ??
      stringAt(activeTrip, ['driverVehicleId', 'driver_vehicle_id']);
    const vehicle = valueAt(activeTrip, ['vehicle']);
    if (direct) return direct;
    return vehicle && typeof vehicle === 'object'
      ? stringAt(vehicle as Record<string, unknown>, ['id', 'vehicleId', 'vehicle_id'])
      : null;
  }, [activeTrip]);

  const liveVehicleLocation = useMemo(() => {
    if (!vehicleId) return null;
    const latest = vehicleLocations[vehicleId];
    return latest ? { latitude: latest.location.lat, longitude: latest.location.lng } : null;
  }, [vehicleId, vehicleLocations]);

  const statusLabel =
    stringAt(activeTrip, ['status', 'loadStatus', 'bookingStatus']) ?? 'Driver assigned';
  const referenceLabel = bookingId ?? String(loadId);

  useEffect(() => {
    subscribeToLoad(String(loadId));
    return () => unsubscribeFromLoad(String(loadId));
  }, [loadId, subscribeToLoad, unsubscribeFromLoad]);

  useEffect(() => {
    if (!vehicleId) return;
    subscribeToVehicle(vehicleId);
    return () => unsubscribeFromVehicle(vehicleId);
  }, [subscribeToVehicle, unsubscribeFromVehicle, vehicleId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadingTrip(true);
      try {
        const trips = await fetchActiveTrips();
        if (cancelled) return;
        const match =
          trips.find((trip) => {
            const id =
              stringAt(trip, ['id', 'loadId', 'load_id', 'tegLoadId', 'teg_load_id']) ??
              stringAt(trip, ['uuid']);
            return id === String(loadId);
          }) ?? null;
        setActiveTrip(match);
      } finally {
        if (!cancelled) setLoadingTrip(false);
      }
    };
    void load();
    const interval = setInterval(load, 20_000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [loadId]);

  const styles = useMemo(
    () => {
      const mapHeight = Math.max(220, Math.min(330, windowHeight * 0.34));
      const narrow = windowWidth < 380;
      return StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.background },
        mapWrap: {
          height: mapHeight,
          backgroundColor: '#EEF2F7',
          overflow: 'hidden',
        },
        map: { ...StyleSheet.absoluteFillObject },
        body: {
          flex: 1,
          marginTop: -18,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          backgroundColor: colors.background,
          paddingTop: spacing.sm,
        },
        handle: {
          alignSelf: 'center',
          width: 54,
          height: 5,
          borderRadius: 999,
          backgroundColor: colors.border,
          marginBottom: spacing.md,
        },
        content: {
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xl,
          gap: spacing.md,
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
        statusPill: {
          alignSelf: 'flex-start',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          backgroundColor: colors.primary + '18',
          borderRadius: 999,
          paddingHorizontal: 10,
          paddingVertical: 7,
        },
        statusText: {
          color: colors.primary,
          fontSize: 12,
          fontWeight: typography.fontWeight.bold,
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
        muted: {
          color: colors.textSecondary,
          fontSize: typography.fontSize.sm,
          lineHeight: 20,
        },
        footerButton: {
          minHeight: 52,
          borderRadius: 12,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
          backgroundColor: colors.surface,
        },
        footerText: {
          color: colors.textPrimary,
          fontSize: typography.fontSize.md,
          fontWeight: typography.fontWeight.bold,
        },
      });
    },
    [colors, windowHeight, windowWidth],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.mapWrap}>
        <MapView
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
              strokeColor={colors.primary}
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
            />
          ) : null}
          {pickupCoords ? (
            <Marker coordinate={pickupCoords} anchor={{ x: 0.5, y: 0.5 }}>
              <TrackingMarker icon="location-sharp" color={colors.primary} />
            </Marker>
          ) : null}
          {dropoffCoords ? (
            <Marker coordinate={dropoffCoords} anchor={{ x: 0.5, y: 0.5 }}>
              <TrackingMarker icon="flag" color="#EF4444" />
            </Marker>
          ) : null}
          {liveVehicleLocation ? (
            <Marker coordinate={liveVehicleLocation} anchor={{ x: 0.5, y: 0.5 }}>
              <TrackingMarker icon="car-sport" color="#111827" />
            </Marker>
          ) : null}
        </MapView>
      </View>

      <View style={styles.body}>
        <View style={styles.handle} />
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Tracking your delivery</Text>
              <Text style={styles.muted}>
                {isConnected ? 'Live updates are connected.' : 'Reconnecting to live updates...'}
              </Text>
            </View>
            <View style={styles.statusPill}>
              <Ionicons name="radio" size={14} color={colors.primary} />
              <Text style={styles.statusText} numberOfLines={1}>
                {statusLabel}
              </Text>
            </View>
          </View>

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
                  {vehicleName} · {formatGbpFromPence(amountPence)}
                </Text>
                <Text style={styles.muted}>Ref {referenceLabel}</Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="location-sharp" size={18} color={colors.primary} />
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.label}>Pickup</Text>
                <Text style={styles.value}>{pickup?.address ?? 'Pickup location'}</Text>
              </View>
            </View>
            <View style={styles.row}>
              <View style={[styles.iconWrap, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="flag" size={17} color="#EF4444" />
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.label}>Dropoff</Text>
                <Text style={styles.value}>{dropoff?.address ?? 'Dropoff location'}</Text>
              </View>
            </View>
          </View>

          {loadingTrip ? (
            <View style={styles.row}>
              <ActivityIndicator color={colors.primary} />
              <Text style={styles.muted}>Refreshing booking details...</Text>
            </View>
          ) : null}

          <Pressable style={styles.footerButton} onPress={() => navigation.navigate('MainTabs', { screen: 'HomeMain' })}>
            <Ionicons name="home-outline" size={20} color={colors.textPrimary} />
            <Text style={styles.footerText}>Back to Home</Text>
          </Pressable>
        </ScrollView>
      </View>
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
