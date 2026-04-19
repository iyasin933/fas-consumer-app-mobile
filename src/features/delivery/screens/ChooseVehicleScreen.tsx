import { useCallback, useMemo } from 'react';
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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  buildConsumerBookingPriceParams,
  consumerBookingPriceQueryRecord,
  summarizeConsumerBookingPriceError,
  type DeliveryVehicleDto,
} from '@/features/delivery/api/consumerBookingPriceApi';
import { VehicleOptionCard } from '@/features/delivery/components/VehicleOptionCard';
import { useConsumerBookingPriceVehicles } from '@/features/delivery/hooks/useConsumerBookingPriceVehicles';
import { useDeliveryOrderDraftStore } from '@/features/delivery/store/deliveryOrderDraftStore';
import { useDeliveryFormStore } from '@/features/map/store/deliveryFormStore';
import { useTheme } from '@/hooks/useTheme';
import { env } from '@/shared/config/env';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

const BOOKING_PRICE_URL = `${env.apiUrl.replace(/\/$/, '')}/consumer/booking/price`;

export function ChooseVehicleScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
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
      }),
    [colors],
  );

  const onRequest = useCallback(() => {
    const id = useDeliveryOrderDraftStore.getState().selectedVehicleId;
    const list = data ?? [];
    const v = list.find((x) => x.id === id);
    if (!v) {
      Alert.alert('Select a vehicle', 'Choose one of the options above.');
      return;
    }
    Alert.alert('Request sent', `${v.name} — your booking flow can continue from here.`);
  }, [data]);

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
          style={[styles.cta, !selectedVehicleId && styles.ctaDisabled]}
          onPress={onRequest}
          disabled={!selectedVehicleId}
        >
          <Text style={styles.ctaTxt}>REQUEST VEHICLE</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
