import { useNavigation } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { isAxiosError } from 'axios';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import MapView, {
  Marker,
  Polyline,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';
import Animated, {
  BounceInRight,
  Easing,
  LinearTransition,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { acceptDropyouQuote } from '@/features/delivery/api/dropyouAcceptQuoteApi';
import { cancelDropyouBooking } from '@/features/delivery/api/dropyouCancelBookingApi';
import { DropyouQuoteCard } from '@/features/delivery/components/DropyouQuoteCard';
import { summarizePaymentApiError } from '@/features/delivery/api/deliveryPaymentApi';
import { useLoadQuotesSocket } from '@/features/delivery/providers/LoadQuotesSocketProvider';
import type { LoadQuoteRow } from '@/features/delivery/socket/loadQuotesSocket.types';
import { useDeliveryOrderDraftStore } from '@/features/delivery/store/deliveryOrderDraftStore';
import { useLoadQuotesForLoad, useLoadQuotesStore } from '@/features/delivery/store/loadQuotesStore';
import {
  majorToPence,
  parseDropyouQuoteCardModel,
} from '@/features/delivery/utils/dropyouQuoteCardData';
import { useDeliveryFormStore } from '@/features/map/store/deliveryFormStore';
import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import type { AppStackParamList } from '@/types/navigation.types';

type Props = NativeStackScreenProps<AppStackParamList, 'ChooseQuotes'>;

const DEFAULT_REGION: Region = {
  latitude: 51.5074,
  longitude: -0.1278,
  latitudeDelta: 0.035,
  longitudeDelta: 0.035,
};

function seededUnit(seed: number): number {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
}

function createDriverOffsets(seedText: string) {
  const seed = seedText.split('').reduce((acc, char) => acc + char.charCodeAt(0), 37);
  return Array.from({ length: 6 }, (_, index) => {
    const angle = seededUnit(seed + index * 19) * Math.PI * 2;
    const radius = 0.010 + seededUnit(seed + index * 31) * 0.021;
    return {
      latitude: Math.sin(angle) * radius,
      longitude: Math.cos(angle) * radius * 1.15,
    };
  });
}

function formatReceivedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** Best-effort line from unknown socket payload (TEG / legacy). */
function quoteSummaryLine(raw: unknown): string | null {
  if (raw == null || typeof raw !== 'object') return null;
  const top = raw as Record<string, unknown>;
  const quote = top.quote && typeof top.quote === 'object' ? (top.quote as Record<string, unknown>) : null;
  const o = quote ?? top;
  const bits: string[] = [];
  for (const key of ['price', 'amount', 'total', 'carrierName', 'carrier', 'name', 'driverName']) {
    const v = o[key];
    if (v != null && typeof v !== 'object') bits.push(String(v));
  }
  return bits.length ? bits.join(' · ') : null;
}

function PickupPulseMarker() {
  const pulseA = useSharedValue(0);
  const pulseB = useSharedValue(0);

  useEffect(() => {
    pulseA.value = withRepeat(withTiming(1, { duration: 1900, easing: Easing.out(Easing.quad) }), -1, false);
    const offset = setTimeout(() => {
      pulseB.value = withRepeat(withTiming(1, { duration: 1900, easing: Easing.out(Easing.quad) }), -1, false);
    }, 700);
    return () => clearTimeout(offset);
  }, [pulseA, pulseB]);

  const ringA = useAnimatedStyle(() => ({
    opacity: 0.32 * (1 - pulseA.value),
    transform: [{ scale: 0.65 + pulseA.value * 2.5 }],
  }));
  const ringB = useAnimatedStyle(() => ({
    opacity: 0.2 * (1 - pulseB.value),
    transform: [{ scale: 0.65 + pulseB.value * 3.2 }],
  }));

  return (
    <View style={pickupMarkerStyles.wrap}>
      <Animated.View style={[pickupMarkerStyles.ring, ringB]} />
      <Animated.View style={[pickupMarkerStyles.ring, ringA]} />
      <View style={pickupMarkerStyles.pin}>
        <View style={pickupMarkerStyles.pinInner} />
      </View>
    </View>
  );
}

function DriverMarker({
  index,
  color,
}: {
  index: number;
  color: string;
}) {
  const drift = useSharedValue(0);

  useEffect(() => {
    const delay = setTimeout(() => {
      drift.value = withRepeat(
        withTiming(1, { duration: 2100 + index * 220, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    }, index * 160);
    return () => clearTimeout(delay);
  }, [drift, index]);

  const markerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(drift.value, [0, 1], [index % 2 === 0 ? -2 : 2, index % 2 === 0 ? 3 : -3]) },
      { translateY: interpolate(drift.value, [0, 1], [index % 3 === 0 ? 2 : -2, index % 3 === 0 ? -3 : 3]) },
      { scale: interpolate(drift.value, [0, 1], [0.98, 1.04]) },
    ],
  }));

  return (
    <Animated.View style={[driverMarkerStyles.wrap, { backgroundColor: color }, markerStyle]}>
      <Ionicons name="car-sport" size={15} color="#ffffff" />
      <View style={[driverMarkerStyles.shadow, { backgroundColor: color }]} />
      <Text style={[driverMarkerStyles.dots, { color }]}>{index % 2 === 0 ? '••' : '•••'}</Text>
    </Animated.View>
  );
}

function DropoffMarker() {
  return (
    <View style={dropoffMarkerStyles.wrap}>
      <Ionicons name="flag" size={16} color="#ffffff" />
    </View>
  );
}

function regionForPickup(
  pickupCoords: { latitude: number; longitude: number } | null,
): Region {
  if (!pickupCoords) return DEFAULT_REGION;
  return {
    latitude: pickupCoords.latitude,
    longitude: pickupCoords.longitude,
    latitudeDelta: 0.08,
    longitudeDelta: 0.08,
  };
}

export function ChooseQuotesScreen({ route }: Props) {
  const { colors } = useTheme();
  const { height: windowHeight } = useWindowDimensions();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const mapRef = useRef<MapView | null>(null);
  const { loadId, bookingId: routeBookingId, vehicleName, amountPence } = route.params;
  const baselinePriceMajor = amountPence / 100;
  const pickup = useDeliveryOrderDraftStore((s) => s.pickup);
  const dropoff = useDeliveryOrderDraftStore((s) => s.dropoff);

  const quotes = useLoadQuotesForLoad(loadId);
  const { isConnected, unsubscribeFromLoad } = useLoadQuotesSocket();
  const [acceptingKey, setAcceptingKey] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const progress = useSharedValue(0);
  const sheetHeight = useSharedValue(360);
  const sheetDragStart = useSharedValue(360);
  const pickupCoords = useMemo(
    () => (pickup ? { latitude: pickup.lat, longitude: pickup.lng } : null),
    [pickup],
  );
  const dropoffCoords = useMemo(
    () => (dropoff ? { latitude: dropoff.lat, longitude: dropoff.lng } : null),
    [dropoff],
  );
  const pickupRegion = useMemo<Region>(
    () => regionForPickup(pickupCoords),
    [pickupCoords],
  );
  const routeCoords = useMemo(
    () => (pickupCoords && dropoffCoords ? [pickupCoords, dropoffCoords] : []),
    [dropoffCoords, pickupCoords],
  );
  const driverOffsets = useMemo(() => createDriverOffsets(String(loadId)), [loadId]);
  const driverCoords = useMemo(
    () =>
      driverOffsets.map((offset) => ({
        latitude: pickupRegion.latitude + offset.latitude,
        longitude: pickupRegion.longitude + offset.longitude,
      })),
    [driverOffsets, pickupRegion.latitude, pickupRegion.longitude],
  );
  const sortedQuotes = useMemo(
    () =>
      [...quotes].sort((a, b) => {
        const qa = parseDropyouQuoteCardModel(a, routeBookingId, baselinePriceMajor);
        const qb = parseDropyouQuoteCardModel(b, routeBookingId, baselinePriceMajor);
        const aCancelled = qa?.status.toUpperCase() === 'CANCELLED';
        const bCancelled = qb?.status.toUpperCase() === 'CANCELLED';
        if (aCancelled !== bCancelled) return aCancelled ? 1 : -1;
        return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
      }),
    [baselinePriceMajor, quotes, routeBookingId],
  );
  const sheetSnaps = useMemo(() => {
    const collapsed = Math.max(176, Math.min(212, windowHeight * 0.22));
    const normal = sortedQuotes.length > 0
      ? Math.max(270, Math.min(315, windowHeight * 0.34))
      : Math.max(300, Math.min(350, windowHeight * 0.39));
    const expanded = Math.max(normal + 80, windowHeight * 0.74);
    return { collapsed, normal, expanded };
  }, [sortedQuotes.length, windowHeight]);

  useEffect(() => {
    sheetHeight.value = withTiming(sheetSnaps.normal, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [sheetHeight, sheetSnaps.normal]);

  const sheetStyle = useAnimatedStyle(() => ({
    height: sheetHeight.value,
  }));

  const drawerPan = useMemo(
    () =>
      Gesture.Pan()
        .onBegin(() => {
          sheetDragStart.value = sheetHeight.value;
        })
        .onUpdate((event) => {
          const next = sheetDragStart.value - event.translationY;
          sheetHeight.value = Math.max(sheetSnaps.collapsed, Math.min(sheetSnaps.expanded, next));
        })
        .onEnd((event) => {
          const projected = sheetHeight.value - event.velocityY * 0.08;
          const snaps = [sheetSnaps.collapsed, sheetSnaps.normal, sheetSnaps.expanded];
          let nearest = snaps[0];
          let nearestDistance = Math.abs(projected - nearest);
          for (let i = 1; i < snaps.length; i += 1) {
            const distance = Math.abs(projected - snaps[i]);
            if (distance < nearestDistance) {
              nearest = snaps[i];
              nearestDistance = distance;
            }
          }
          sheetHeight.value = withTiming(nearest, {
            duration: 240,
            easing: Easing.out(Easing.cubic),
          });
        }),
    [sheetDragStart, sheetHeight, sheetSnaps.collapsed, sheetSnaps.expanded, sheetSnaps.normal],
  );

  const onToggleDrawer = useCallback(() => {
    const midpoint = (sheetSnaps.collapsed + sheetSnaps.expanded) / 2;
    const next = sheetHeight.value > midpoint ? sheetSnaps.collapsed : sheetSnaps.expanded;
    sheetHeight.value = withTiming(next, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [sheetHeight, sheetSnaps.collapsed, sheetSnaps.expanded]);

  const centerOnPickup = useCallback(() => {
    mapRef.current?.animateToRegion(pickupRegion, 450);
  }, [pickupRegion]);

  useEffect(() => {
    const handle = setTimeout(centerOnPickup, 350);
    return () => clearTimeout(handle);
  }, [centerOnPickup]);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: 1700, easing: Easing.inOut(Easing.cubic) }),
      -1,
      false,
    );
  }, [progress]);

  const progressFillStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: `${interpolate(progress.value, [0, 1], [-100, 170])}%` },
    ],
  }));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.background },
        mapStage: {
          flex: 1,
          backgroundColor: '#EEF2F7',
          overflow: 'hidden',
        },
        map: { ...StyleSheet.absoluteFillObject },
        quoteOverlay: {
          position: 'absolute',
          top: spacing.sm,
          left: 0,
          right: 0,
          maxHeight: 238,
          zIndex: 20,
        },
        quoteOverlayContent: {
          paddingHorizontal: spacing.lg,
          gap: spacing.sm,
          paddingBottom: spacing.sm,
        },
        pickupCenterButton: {
          position: 'absolute',
          right: spacing.lg,
          bottom: spacing.md,
          width: 48,
          height: 48,
          borderRadius: 24,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.16,
          shadowRadius: 8,
          elevation: 5,
          zIndex: 30,
        },
        pickupCenterButtonPressed: {
          transform: [{ scale: 0.96 }],
          backgroundColor: colors.background,
        },
        sheet: {
          marginTop: -8,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          backgroundColor: colors.background,
          overflow: 'hidden',
        },
        handle: {
          alignSelf: 'center',
          width: 54,
          height: 5,
          borderRadius: 999,
          backgroundColor: colors.border,
          marginTop: 7,
          marginBottom: spacing.xs,
        },
        statusHeader: {
          paddingHorizontal: spacing.lg,
          gap: spacing.xs,
          paddingBottom: spacing.xs,
        },
        statusTitle: {
          color: colors.textPrimary,
          fontSize: 22,
          fontWeight: '900',
          letterSpacing: 0,
        },
        statusBody: {
          color: colors.textSecondary,
          fontSize: 13,
          lineHeight: 18,
        },
        locationsWrap: {
          gap: spacing.xs,
          paddingTop: spacing.xs,
        },
        disabledInput: {
          flexDirection: 'row',
          alignItems: 'center',
          minHeight: 48,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.md,
          gap: spacing.sm,
        },
        disabledInputText: {
          flex: 1,
          color: colors.textPrimary,
          fontSize: typography.fontSize.sm,
          fontWeight: '700',
        },
        disabledInputMuted: {
          color: colors.textSecondary,
        },
        cancelButton: {
          minHeight: 54,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: '#FCA5A5',
          backgroundColor: '#FEF2F2',
          paddingHorizontal: spacing.md,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
        },
        cancelButtonPressed: {
          backgroundColor: '#FEE2E2',
        },
        cancelText: {
          color: '#DC2626',
          fontSize: typography.fontSize.md,
          fontWeight: '900',
        },
        progressTrack: {
          height: 5,
          borderRadius: 999,
          backgroundColor: colors.border,
          overflow: 'hidden',
          marginTop: 2,
        },
        progressFill: {
          width: '46%',
          height: '100%',
          borderRadius: 999,
          backgroundColor: colors.primary,
        },
        drawerContent: {
          paddingHorizontal: spacing.lg,
          paddingBottom: 96,
          gap: spacing.sm,
        },
        stickyCancelFooter: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: spacing.md,
          backgroundColor: colors.background,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
        },
        empty: {
          alignItems: 'center',
          paddingVertical: 0,
        },
        emptyTitle: {
          fontSize: typography.fontSize.lg,
          fontWeight: '700',
          color: colors.textPrimary,
          textAlign: 'center',
        },
        emptyBody: {
          fontSize: typography.fontSize.md,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: 22,
        },
        card: {
          backgroundColor: colors.surface,
          borderRadius: 14,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          gap: spacing.sm,
        },
        cardTitle: { fontSize: typography.fontSize.md, fontWeight: '700', color: colors.textPrimary },
        cardLine: { fontSize: typography.fontSize.sm, color: colors.textSecondary },
        sourcePill: {
          alignSelf: 'flex-start',
          paddingHorizontal: spacing.sm,
          paddingVertical: 4,
          borderRadius: 8,
          backgroundColor: colors.primary + '22',
        },
        sourceTxt: { fontSize: 12, fontWeight: '600', color: colors.primary },
      }),
    [colors, sortedQuotes.length],
  );

  const onAcceptQuote = useCallback(
    async (model: NonNullable<ReturnType<typeof parseDropyouQuoteCardModel>>) => {
      const key = `${model.loadId}:${model.quoteId}`;
      setAcceptingKey(key);
      try {
        if (__DEV__) {
          console.log('[ChooseQuotes] accepting quote', {
            loadId: model.loadId,
            bookingId: model.bookingId,
            quoteId: model.quoteId,
            carrierName: model.companyName,
            quoteOwnerId: model.quoteOwnerId,
            quoteOwnerPhone: model.quoteOwnerPhone,
            agreedRate: model.agreedRate,
            price: model.price,
            currency: model.currency,
          });
        }
        await acceptDropyouQuote(model.bookingId, model.quoteId);
        navigation.navigate('DeliveryPayment', {
          amountPence: majorToPence(model.price, model.currency),
          vehicleName: model.vehicleType || vehicleName,
          loadId: model.loadId,
          bookingId: model.bookingId,
          quoteId: model.quoteId,
          carrierName: model.companyName,
          quoteOwnerId: model.quoteOwnerId ?? undefined,
          quoteOwnerPhone: model.quoteOwnerPhone ?? undefined,
          agreedRate: model.agreedRate ?? undefined,
        });
      } catch (e) {
        if (isAxiosError(e)) {
          console.warn(
            '[ChooseQuotes] accept-quote failed',
            e.config?.method,
            e.config?.url,
            e.response?.status,
            e.response?.data,
          );
        }
        Alert.alert('Quote', summarizePaymentApiError(e));
      } finally {
        setAcceptingKey(null);
      }
    },
    [navigation, vehicleName],
  );

  const cancelBookingNow = useCallback(async () => {
    setCancelling(true);
    try {
      await cancelDropyouBooking(loadId);
      unsubscribeFromLoad(loadId);
      useLoadQuotesStore.getState().reset();
      useDeliveryOrderDraftStore.getState().resetDraft();
      useDeliveryFormStore.getState().resetForm();
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs', params: { screen: 'HomeMain' } }],
      });
    } catch (e) {
      if (isAxiosError(e)) {
        console.warn('[ChooseQuotes] cancel booking failed', e.response?.status, e.response?.data);
      }
      Alert.alert('Cancel booking', summarizePaymentApiError(e));
    } finally {
      setCancelling(false);
    }
  }, [loadId, navigation, unsubscribeFromLoad]);

  const onCancelBooking = useCallback(() => {
    Alert.alert('Cancel booking', 'Are you sure you want to cancel this booking?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: () => void cancelBookingNow(),
      },
    ]);
  }, [cancelBookingNow]);

  const renderQuote = useCallback(
    ({ item }: { item: LoadQuoteRow }) => {
      const parsed = parseDropyouQuoteCardModel(item, routeBookingId, baselinePriceMajor);
      if (parsed) {
        const busy = acceptingKey === `${parsed.loadId}:${parsed.quoteId}`;
        return (
          <Animated.View entering={BounceInRight.springify().damping(13).stiffness(120)} layout={LinearTransition.springify()}>
            <DropyouQuoteCard quote={parsed} onAccept={() => void onAcceptQuote(parsed)} busy={busy} />
          </Animated.View>
        );
      }
      const summary = quoteSummaryLine(item.raw);
      return (
        <Animated.View
          entering={BounceInRight.springify().damping(13).stiffness(120)}
          layout={LinearTransition.springify()}
          style={styles.card}
        >
          <View style={styles.sourcePill}>
            <Text style={styles.sourceTxt}>{item.source}</Text>
          </View>
          <Text style={styles.cardTitle}>Quote {item.quoteId}</Text>
          {summary ? <Text style={styles.cardLine}>{summary}</Text> : null}
          <Text style={styles.cardLine}>Received {formatReceivedAt(item.receivedAt)}</Text>
        </Animated.View>
      );
    },
    [acceptingKey, baselinePriceMajor, onAcceptQuote, routeBookingId, styles],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <View style={styles.mapStage}>
        <MapView
          ref={mapRef}
          style={styles.map}
          provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
          initialRegion={pickupRegion}
          scrollEnabled
          zoomEnabled
          rotateEnabled={false}
          pitchEnabled
          showsCompass={false}
          showsMyLocationButton={false}
          toolbarEnabled={false}
          loadingEnabled
        >
          {pickupCoords ? (
            <Marker coordinate={pickupCoords} anchor={{ x: 0.5, y: 0.5 }} zIndex={30}>
              <PickupPulseMarker />
            </Marker>
          ) : null}
          {dropoffCoords ? (
            <Marker coordinate={dropoffCoords} anchor={{ x: 0.5, y: 0.85 }} zIndex={28}>
              <DropoffMarker />
            </Marker>
          ) : null}
          {routeCoords.length === 2 ? (
            <Polyline
              coordinates={routeCoords}
              strokeColor={colors.primary}
              strokeWidth={5}
              lineCap="round"
              lineJoin="round"
              zIndex={5}
            />
          ) : null}
          {driverCoords.map((coord, index) => (
            <Marker
              key={`${coord.latitude}:${coord.longitude}`}
              coordinate={coord}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={10 + index}
            >
              <DriverMarker index={index} color={colors.primary} />
            </Marker>
          ))}
        </MapView>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Center pickup on map"
          style={({ pressed }) => [styles.pickupCenterButton, pressed && styles.pickupCenterButtonPressed]}
          onPress={centerOnPickup}
        >
          <Ionicons name="locate" size={22} color={colors.primary} />
        </Pressable>
        {sortedQuotes.length > 0 ? (
          <FlatList
            style={styles.quoteOverlay}
            data={sortedQuotes}
            keyExtractor={(item) => `${item.loadId}:${item.quoteId}:${item.receivedAt}`}
            renderItem={renderQuote}
            contentContainerStyle={styles.quoteOverlayContent}
            showsVerticalScrollIndicator={false}
          />
        ) : null}
      </View>

      <Animated.View style={[styles.sheet, sheetStyle]}>
        <GestureDetector gesture={drawerPan}>
          <Pressable onPress={onToggleDrawer} hitSlop={12}>
            <View style={styles.handle} />
          </Pressable>
        </GestureDetector>
        <View style={styles.statusHeader}>
          <Text style={styles.statusTitle}>
            {sortedQuotes.length === 0 ? 'Finding drivers' : 'Select a quote'}
          </Text>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, progressFillStyle]} />
          </View>
          {sortedQuotes.length === 0 ? (
            <Text style={styles.statusBody}>Offers appear automatically.</Text>
          ) : (
            <Text style={styles.statusBody}>
              {sortedQuotes.length} quote{sortedQuotes.length === 1 ? '' : 's'} received for {vehicleName}.
            </Text>
          )}
          {!isConnected ? (
            <Text style={styles.statusBody}>
              You are offline from the quotes server. Check `EXPO_PUBLIC_SOCKET_URL` and your connection.
            </Text>
          ) : null}
        </View>
        <ScrollView contentContainerStyle={styles.drawerContent} showsVerticalScrollIndicator={false}>
          <View style={styles.locationsWrap}>
            <View style={styles.disabledInput}>
              <Ionicons name="location-sharp" size={18} color={colors.primary} />
              <Text
                style={[styles.disabledInputText, !pickup?.address && styles.disabledInputMuted]}
                numberOfLines={1}
              >
                {pickup?.address ?? 'Pickup location'}
              </Text>
              <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />
            </View>
            <View style={styles.disabledInput}>
              <Ionicons name="flag" size={17} color="#EF4444" />
              <Text
                style={[styles.disabledInputText, !dropoff?.address && styles.disabledInputMuted]}
                numberOfLines={1}
              >
                {dropoff?.address ?? 'Dropoff location'}
              </Text>
              <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />
            </View>
          </View>
        </ScrollView>
      </Animated.View>

      <View style={styles.stickyCancelFooter}>
          <Pressable
            style={({ pressed }) => [styles.cancelButton, pressed && styles.cancelButtonPressed]}
            onPress={onCancelBooking}
            disabled={cancelling}
          >
            {cancelling ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <Ionicons name="close-circle-outline" size={20} color="#DC2626" />
            )}
            <Text style={styles.cancelText}>{cancelling ? 'Cancelling booking' : 'Cancel Booking'}</Text>
          </Pressable>
      </View>
    </SafeAreaView>
  );
}

const pickupMarkerStyles = StyleSheet.create({
  wrap: {
    width: 104,
    height: 104,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: '#2ECC71',
  },
  pin: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#16A34A',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 6,
  },
  pinInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
  },
});

const driverMarkerStyles = StyleSheet.create({
  wrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#111827',
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
  shadow: {
    position: 'absolute',
    bottom: -5,
    width: 16,
    height: 5,
    borderRadius: 8,
    backgroundColor: 'rgba(17, 24, 39, 0.2)',
  },
  dots: {
    position: 'absolute',
    top: -17,
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 1,
  },
});

const dropoffMarkerStyles = StyleSheet.create({
  wrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EF4444',
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
