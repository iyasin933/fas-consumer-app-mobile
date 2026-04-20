import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ContentImageUploadZone } from '@/features/delivery/components/ContentImageUploadZone';
import { DeliveryLocationSummaryCard } from '@/features/delivery/components/DeliveryLocationSummaryCard';
import { DeliveryOutlineField } from '@/features/delivery/components/DeliveryOutlineField';
import { PalletTypeSelectField } from '@/features/delivery/components/PalletTypeSelectField';
import { useDeliveryOrderDraftStore } from '@/features/delivery/store/deliveryOrderDraftStore';
import { useCurrentLocation } from '@/features/map/hooks/useCurrentLocation';
import {
  fetchPlaceDetails,
  PlacesDetailsError,
  type PlaceSuggestion,
} from '@/features/map/hooks/usePlacesAutocomplete';
import { useReverseGeocode } from '@/features/map/hooks/useReverseGeocode';
import { PlacesAutocompleteModal } from '@/features/map/components/PlacesAutocompleteModal';
import { DROPOFF_ID, PICKUP_ID, useDeliveryFormStore } from '@/features/map/store/deliveryFormStore';
import type { PlaceValue, PlacesTarget } from '@/features/map/types';
import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import type { AppStackParamList } from '@/types/navigation.types';

export function AddDeliveryContentsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const syncLocationsFromRows = useDeliveryOrderDraftStore((s) => s.syncLocationsFromRows);
  const setPlace = useDeliveryFormStore((s) => s.setPlace);
  const setPickup = useDeliveryOrderDraftStore((s) => s.setPickup);
  const setDropoff = useDeliveryOrderDraftStore((s) => s.setDropoff);

  const { coords, refresh } = useCurrentLocation(true);
  const { reverse } = useReverseGeocode();

  const [placesTarget, setPlacesTarget] = useState<PlacesTarget | null>(null);
  const placesTargetRef = useRef<PlacesTarget | null>(null);

  const pickup = useDeliveryOrderDraftStore((s) => s.pickup);
  const dropoff = useDeliveryOrderDraftStore((s) => s.dropoff);
  const contentImageKeys = useDeliveryOrderDraftStore((s) => s.contentImageKeys);
  const dimensions = useDeliveryOrderDraftStore((s) => s.dimensions);
  const pallets = useDeliveryOrderDraftStore((s) => s.pallets);

  const setDimensions = useDeliveryOrderDraftStore((s) => s.setDimensions);
  const addContentImagePlaceholder = useDeliveryOrderDraftStore((s) => s.addContentImagePlaceholder);
  const removeContentImageKey = useDeliveryOrderDraftStore((s) => s.removeContentImageKey);
  const setPalletField = useDeliveryOrderDraftStore((s) => s.setPalletField);
  const addPalletLine = useDeliveryOrderDraftStore((s) => s.addPalletLine);
  const removePalletLine = useDeliveryOrderDraftStore((s) => s.removePalletLine);

  useFocusEffect(
    useCallback(() => {
      const rows = useDeliveryFormStore.getState().rows;
      const tab = useDeliveryFormStore.getState().tab;
      syncLocationsFromRows(rows, tab);
    }, [syncLocationsFromRows]),
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.background },
        scroll: { flex: 1 },
        content: {
          padding: spacing.lg,
          gap: spacing.lg,
        },
        title: {
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.bold,
          color: colors.textPrimary,
        },
        sub: { fontSize: typography.fontSize.md, color: colors.textSecondary, lineHeight: 22 },
        sectionHead: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
        dimRow: { flexDirection: 'row', gap: spacing.sm },
        dimCell: { flex: 1 },
        palletHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
        palletTitle: { fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.bold, color: colors.textPrimary },
        addMore: { fontSize: typography.fontSize.sm, fontWeight: typography.fontWeight.bold, color: colors.primary },
        palletCard: {
          borderRadius: 12,
          padding: spacing.md,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          gap: spacing.md,
        },
        palletToolbar: { flexDirection: 'row', justifyContent: 'flex-end' },
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
        },
        ctaTxt: {
          color: colors.onPrimary,
          fontSize: typography.fontSize.md,
          fontWeight: typography.fontWeight.bold,
          letterSpacing: 0.5,
        },
        empty: { flex: 1, padding: spacing.lg, gap: spacing.md, justifyContent: 'center' },
        emptyTxt: { fontSize: typography.fontSize.md, color: colors.textSecondary },
        ghostBtn: {
          alignSelf: 'flex-start',
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: colors.border,
        },
        ghostBtnTxt: { fontWeight: '600', color: colors.primary },
      }),
    [colors],
  );

  const openPlacesFor = useCallback((kind: 'pickup' | 'dropoff') => {
    const t: PlacesTarget = { kind };
    placesTargetRef.current = t;
    setPlacesTarget(t);
  }, []);

  const closePlaces = useCallback(() => {
    setPlacesTarget(null);
  }, []);

  const writePickupOrDropoff = useCallback(
    (target: PlacesTarget, place: PlaceValue) => {
      if (target.kind === 'pickup') {
        setPlace(PICKUP_ID, place);
        setPickup(place);
      } else if (target.kind === 'dropoff') {
        setPlace(DROPOFF_ID, place);
        setDropoff(place);
      }
    },
    [setDropoff, setPickup, setPlace],
  );

  const handlePickSuggestion = useCallback(
    async (s: PlaceSuggestion) => {
      const target = placesTargetRef.current;
      if (!target || (target.kind !== 'pickup' && target.kind !== 'dropoff')) return;
      try {
        const details = await fetchPlaceDetails(s.placeId);
        writePickupOrDropoff(target, {
          address: details.address || s.fullText,
          lat: details.lat,
          lng: details.lng,
          placeId: details.placeId,
        });
      } catch (err) {
        const message =
          err instanceof PlacesDetailsError ? err.message : 'Unknown error resolving place.';
        Alert.alert("Couldn't load that place", message);
      }
    },
    [writePickupOrDropoff],
  );

  const handlePickCurrentLocation = useCallback(async () => {
    const target = placesTargetRef.current;
    if (!target || (target.kind !== 'pickup' && target.kind !== 'dropoff')) return;
    const pos = coords ?? (await refresh());
    if (!pos) {
      Alert.alert('Location unavailable', 'Please enable location services and try again.');
      return;
    }
    const rev = await reverse(pos.latitude, pos.longitude);
    writePickupOrDropoff(target, {
      address: rev?.address ?? `${pos.latitude.toFixed(5)}, ${pos.longitude.toFixed(5)}`,
      lat: pos.latitude,
      lng: pos.longitude,
      placeId: rev?.placeId,
    });
  }, [coords, refresh, reverse, writePickupOrDropoff]);

  const onChooseVehicle = useCallback(() => {
    navigation.navigate('RecipientDetails');
  }, [navigation]);

  if (!pickup?.address || !dropoff?.address) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.empty}>
          <Text style={styles.title}>Delivery details missing</Text>
          <Text style={styles.emptyTxt}>Pick pickup and dropoff on the map, then tap Proceed again.</Text>
          <Pressable style={styles.ghostBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.ghostBtnTxt}>Back to map</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={[styles.content, { paddingBottom: spacing.lg }]}
          showsVerticalScrollIndicator={false}
        >
          <DeliveryLocationSummaryCard
            pickupAddress={pickup.address}
            dropoffAddress={dropoff.address}
            onPressPickup={() => openPlacesFor('pickup')}
            onPressDropoff={() => openPlacesFor('dropoff')}
          />

          <View style={styles.sectionHead}>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text style={styles.title}>Add your contents</Text>
              <Text style={styles.sub}>Add details so we can suggest the right vehicle.</Text>
            </View>
            <Ionicons name="chevron-down" size={20} color={colors.muted} />
          </View>

          <ContentImageUploadZone
            imageKeys={contentImageKeys}
            onAdd={addContentImagePlaceholder}
            onRemove={removeContentImageKey}
          />

          <View style={styles.dimRow}>
            <View style={styles.dimCell}>
              <DeliveryOutlineField
                label="Height (cm)"
                value={dimensions.height}
                onChangeText={(height) => setDimensions({ height })}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.dimCell}>
              <DeliveryOutlineField
                label="Length (cm)"
                value={dimensions.length}
                onChangeText={(length) => setDimensions({ length })}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.dimCell}>
              <DeliveryOutlineField
                label="Width (cm)"
                value={dimensions.width}
                onChangeText={(width) => setDimensions({ width })}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {pallets.map((p, idx) => (
            <View key={p.id} style={styles.palletCard}>
              <View style={styles.palletHead}>
                <Text style={styles.palletTitle}>Pallet {idx + 1}</Text>
                {pallets.length > 1 ? (
                  <Pressable
                    onPress={() => removePalletLine(p.id)}
                    hitSlop={10}
                    accessibilityLabel={`Remove pallet ${idx + 1}`}
                  >
                    <Ionicons name="trash-outline" size={22} color={colors.danger} />
                  </Pressable>
                ) : null}
              </View>
              <PalletTypeSelectField
                value={p.palletTypeValue}
                onChange={(palletTypeValue) => setPalletField(p.id, { palletTypeValue })}
              />
              <DeliveryOutlineField
                label="Pallet contents"
                value={p.content}
                onChangeText={(content) => setPalletField(p.id, { content })}
              />
              <DeliveryOutlineField
                label="Value of goods"
                value={p.valueOfGoods}
                onChangeText={(valueOfGoods) => setPalletField(p.id, { valueOfGoods })}
                keyboardType="decimal-pad"
              />
              <DeliveryOutlineField
                label="Weight (kg)"
                value={p.weightKg}
                onChangeText={(weightKg) => setPalletField(p.id, { weightKg })}
                keyboardType="decimal-pad"
              />
            </View>
          ))}

          <View style={styles.palletToolbar}>
            <Pressable
              onPress={() => {
                const { ok } = addPalletLine();
                if (!ok) Alert.alert('Limit reached', 'You can add up to five pallet lines.');
              }}
              hitSlop={8}
            >
              <Text style={styles.addMore}>+ Add more</Text>
            </Pressable>
          </View>
        </ScrollView>
        <View style={[styles.ctaWrap, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Pressable style={styles.cta} onPress={onChooseVehicle}>
            <Text style={styles.ctaTxt}>CHOOSE VEHICLE</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <PlacesAutocompleteModal
        visible={!!placesTarget}
        onClose={closePlaces}
        onPickSuggestion={handlePickSuggestion}
        onPickCurrentLocation={handlePickCurrentLocation}
        bias={
          pickup
            ? { lat: pickup.lat, lng: pickup.lng }
            : dropoff
              ? { lat: dropoff.lat, lng: dropoff.lng }
              : coords
                ? { lat: coords.latitude, lng: coords.longitude }
                : undefined
        }
        title={placesSheetTitle(placesTarget)}
      />
    </SafeAreaView>
  );
}

function placesSheetTitle(t: PlacesTarget | null): string {
  if (!t) return 'Search location';
  if (t.kind === 'pickup') return 'Search pickup location';
  if (t.kind === 'dropoff') return 'Search dropoff location';
  return 'Search location';
}
