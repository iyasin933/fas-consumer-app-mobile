import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { isAxiosError } from 'axios';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  buildConsumerBookingPriceParams,
  consumerBookingPriceQueryRecord,
  summarizeConsumerBookingPriceError,
  type DeliveryVehicleDto,
} from '@/features/delivery/api/consumerBookingPriceApi';
import { buildDropyouLoadPayload } from '@/features/delivery/api/buildDropyouLoadPayload';
import { createDropyouLoad, summarizeDropyouLoadError } from '@/features/delivery/api/dropyouLoadApi';
import { VehicleOptionCard } from '@/features/delivery/components/VehicleOptionCard';
import { useConsumerBookingPriceVehicles } from '@/features/delivery/hooks/useConsumerBookingPriceVehicles';
import { useDeliveryOrderDraftStore } from '@/features/delivery/store/deliveryOrderDraftStore';
import { useDeliveryFormStore } from '@/features/map/store/deliveryFormStore';
import { getScheduledPickupDropoffOrderError } from '@/features/map/utils/deliverySchedule';
import { useTheme } from '@/hooks/useTheme';
import { env } from '@/shared/config/env';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import type { AppStackParamList } from '@/types/navigation.types';

const BOOKING_PRICE_URL = `${env.apiUrl.replace(/\/$/, '')}/consumer/booking/price`;

/** GBP vehicle quote from API → pence for Stripe (`amount` smallest unit). */
function vehicleQuoteToAmountPence(v: DeliveryVehicleDto): number {
  const pounds = v.priceWithVat ?? v.maxPrice ?? v.minPrice ?? 0;
  const pence = Math.round(Number(pounds) * 100);
  return Math.max(50, pence);
}

export function ChooseVehicleScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);
  const [loadErrorText, setLoadErrorText] = useState<string | null>(null);
  const { data, isPending, isError, error, refetch, isRefetching } = useConsumerBookingPriceVehicles();
  const selectedVehicleId = useDeliveryOrderDraftStore((s) => s.selectedVehicleId);
  const setSelectedVehicleId = useDeliveryOrderDraftStore((s) => s.setSelectedVehicleId);
  const pickup = useDeliveryOrderDraftStore((s) => s.pickup);
  const dropoff = useDeliveryOrderDraftStore((s) => s.dropoff);
  const pallets = useDeliveryOrderDraftStore((s) => s.pallets);
  const dimensions = useDeliveryOrderDraftStore((s) => s.dimensions);
  const routeDurationSec = useDeliveryFormStore((s) => s.routeDurationSec);
  const routeDistanceM = useDeliveryFormStore((s) => s.routeDistanceM);
  const tab = useDeliveryFormStore((s) => s.tab);

  const queryParamsPreview = useMemo(() => {
    if (!pickup || !dropoff) return null;
    const params = buildConsumerBookingPriceParams({
      pickup,
      dropoff,
      routeDistanceM,
      routeDurationSec,
      tab,
      pallets,
      dimensions,
    });
    return consumerBookingPriceQueryRecord(params);
  }, [pickup, dropoff, routeDistanceM, routeDurationSec, tab, pallets, dimensions]);

  const errorDetail = useMemo(() => (error ? summarizeConsumerBookingPriceError(error) : ''), [error]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.background },
        center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
        err: { fontSize: typography.fontSize.md, color: colors.textSecondary, textAlign: 'center' },
        retry: {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          borderRadius: 10,
          backgroundColor: colors.primary,
        },
        retryTxt: { color: colors.onPrimary, fontWeight: '700' },
        list: { padding: spacing.lg, paddingBottom: spacing.xl },
        ctaWrap: {
          padding: spacing.lg,
          paddingBottom: spacing.md,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
        cta: {
          backgroundColor: colors.primary,
          paddingVertical: spacing.md,
          borderRadius: 12,
          alignItems: 'center',
          opacity: 1,
        },
        ctaDisabled: { opacity: 0.45 },
        ctaTxt: {
          color: colors.onPrimary,
          fontSize: typography.fontSize.md,
          fontWeight: typography.fontWeight.bold,
          letterSpacing: 0.5,
        },
        debugUrl: {
          fontSize: typography.fontSize.sm,
          color: colors.muted,
          textAlign: 'center',
          marginBottom: spacing.sm,
        },
        debugBlock: {
          alignSelf: 'stretch',
          maxHeight: 220,
          backgroundColor: colors.surface,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.md,
        },
        debugLabel: {
          fontSize: typography.fontSize.sm,
          fontWeight: '700',
          color: colors.textSecondary,
          marginBottom: spacing.xs,
        },
        debugMono: {
          fontSize: 12,
          lineHeight: 17,
          color: colors.textPrimary,
          fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
        },
        errOverlayHost: {
          ...StyleSheet.absoluteFillObject,
          zIndex: 2147483000,
          ...Platform.select({
            android: { elevation: 64 },
            default: {},
          }),
        },
        errGhRoot: { flex: 1 },
        errDim: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          justifyContent: 'center',
          padding: spacing.lg,
        },
        errCardWrap: { width: '100%', maxWidth: 520, alignSelf: 'center' },
        errCard: {
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: spacing.lg,
          gap: spacing.sm,
        },
        errTitle: { fontSize: typography.fontSize.lg, fontWeight: '800', color: colors.textPrimary },
        errBody: { fontSize: typography.fontSize.md, color: colors.textSecondary, lineHeight: 22 },
        errBtn: {
          marginTop: spacing.md,
          backgroundColor: colors.primary,
          minHeight: 48,
          paddingVertical: spacing.md,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
        },
        errBtnTxt: { color: colors.onPrimary, fontWeight: '700', fontSize: typography.fontSize.md },
      }),
    [colors],
  );

  const onRequest = useCallback(async () => {
    const id = useDeliveryOrderDraftStore.getState().selectedVehicleId;
    const list = data ?? [];
    const v = list.find((x) => x.id === id);
    if (!v) {
      Alert.alert('Select a vehicle', 'Choose one of the options above.');
      return;
    }
    if (!env.stripePublishableKey) {
      Alert.alert(
        'Payments',
        'Stripe is not configured. Add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY to your .env and rebuild the app.',
      );
      return;
    }

    const draft = useDeliveryOrderDraftStore.getState();
    if (!draft.pickup || !draft.dropoff) {
      Alert.alert('Missing addresses', 'Go back and complete pickup and dropoff.');
      return;
    }
    const phoneLocal = draft.recipientPhoneLocal.replace(/\s/g, '');
    if (!draft.recipientName.trim() || phoneLocal.length < 6) {
      Alert.alert('Recipient required', 'Go back and add recipient name and phone.');
      return;
    }

    const { rows, tab, routeDurationSec } = useDeliveryFormStore.getState();

    const scheduleOrderError = getScheduledPickupDropoffOrderError(tab, rows);
    if (scheduleOrderError) {
      setLoadErrorText(scheduleOrderError);
      return;
    }

    setSubmitting(true);
    try {
      const payload = buildDropyouLoadPayload({
        tab,
        rows,
        routeDurationSec,
        pickup: draft.pickup,
        dropoff: draft.dropoff,
        pallets: draft.pallets,
        dimensions: draft.dimensions,
        contentImageKeys: draft.contentImageKeys,
        vehicle: v,
        recipientName: draft.recipientName,
        recipientCompany: draft.recipientCompany,
        recipientDialCode: draft.recipientDialCode,
        recipientPhoneLocal: draft.recipientPhoneLocal,
        recipientNotes: draft.recipientNotes,
      });
      const { loadId, bookingId } = await createDropyouLoad(payload);
      useDeliveryOrderDraftStore.getState().setCreatedLoadIds({ loadId, bookingId });
      const amountPence = vehicleQuoteToAmountPence(v);
      navigation.navigate('ChooseQuotes', {
        loadId,
        bookingId: bookingId ?? undefined,
        amountPence,
        vehicleName: v.name,
      });
    } catch (e) {
      if (isAxiosError(e)) {
        console.warn('[ChooseVehicle] create load failed HTTP', e.response?.status);
        try {
          console.warn(
            '[ChooseVehicle] create load response.data (full)',
            e.response?.data != null
              ? JSON.stringify(e.response.data, null, 2)
              : '(no body)',
          );
        } catch {
          console.warn('[ChooseVehicle] create load response.data (non-JSONable)', e.response?.data);
        }
      } else {
        console.warn('[ChooseVehicle] create load failed (non-HTTP)', e);
      }
      setLoadErrorText(summarizeDropyouLoadError(e));
    } finally {
      setSubmitting(false);
    }
  }, [data, navigation]);

  const renderItem = useCallback(
    ({ item }: { item: DeliveryVehicleDto }) => (
      <VehicleOptionCard
        vehicle={item}
        selected={item.id === selectedVehicleId}
        onPress={() => setSelectedVehicleId(item.id)}
      />
    ),
    [selectedVehicleId, setSelectedVehicleId],
  );

  if (isPending && !data) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.err}>Loading vehicles…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView
          contentContainerStyle={[styles.center, { paddingVertical: spacing.lg, flexGrow: 1 }]}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.err}>Could not load vehicles.</Text>
          <Text style={styles.debugUrl}>{BOOKING_PRICE_URL}</Text>
          <View style={styles.debugBlock}>
            <Text style={styles.debugLabel}>Request query params</Text>
            <Text style={styles.debugMono} selectable>
              {queryParamsPreview ? JSON.stringify(queryParamsPreview, null, 2) : '—'}
            </Text>
          </View>
          <View style={[styles.debugBlock, { marginTop: spacing.md, maxHeight: 280 }]}>
            <Text style={styles.debugLabel}>Server / network error</Text>
            <Text style={styles.debugMono} selectable>
              {errorDetail || 'Unknown error'}
            </Text>
          </View>
          <Pressable style={[styles.retry, { marginTop: spacing.lg }]} onPress={() => refetch()}>
            <Text style={styles.retryTxt}>Try again</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const list = data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={list.length === 0 ? { flexGrow: 1 } : styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.err}>No vehicles returned for this route yet.</Text>
          </View>
        }
      />
      <View style={[styles.ctaWrap, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Pressable
          style={[styles.cta, (!selectedVehicleId || submitting) && styles.ctaDisabled]}
          onPress={() => void onRequest()}
          disabled={!selectedVehicleId || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.ctaTxt}>REQUEST VEHICLE</Text>
          )}
        </Pressable>
      </View>

      {loadErrorText ? (
        <View
          style={styles.errOverlayHost}
          pointerEvents="auto"
          collapsable={false}
          accessibilityViewIsModal
        >
          <GestureHandlerRootView style={styles.errGhRoot}>
            <Pressable style={styles.errDim} onPress={() => setLoadErrorText(null)} accessibilityLabel="Dismiss error">
              <View style={styles.errCardWrap} pointerEvents="box-none">
                <Pressable
                  onPress={(ev) => {
                    ev.stopPropagation();
                  }}
                  style={styles.errCard}
                >
                  <Text style={styles.errTitle}>Could not create load</Text>
                  <ScrollView
                    style={{ maxHeight: 280 }}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator
                  >
                    <Text style={styles.errBody} selectable>
                      {loadErrorText}
                    </Text>
                  </ScrollView>
                  <Pressable
                    style={styles.errBtn}
                    onPress={() => setLoadErrorText(null)}
                    accessibilityRole="button"
                    accessibilityLabel="OK"
                  >
                    <Text style={styles.errBtnTxt}>OK</Text>
                  </Pressable>
                </Pressable>
              </View>
            </Pressable>
          </GestureHandlerRootView>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
