import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useDeliveryOrderDraftStore } from '@/features/delivery/store/deliveryOrderDraftStore';

import {
  DeliveryBottomSheet,
  type DeliveryBottomSheetHandle,
} from '@/features/map/components/DeliveryBottomSheet';
import { FloatingMapButtons } from '@/features/map/components/FloatingMapButtons';
import { MapLayer, type MapLayerHandle } from '@/features/map/components/MapLayer';
import { PlacesAutocompleteModal } from '@/features/map/components/PlacesAutocompleteModal';
import { ScheduleDateTimePickerProvider } from '@/features/map/components/ScheduleDateTimePickerProvider';
import { useCurrentLocation } from '@/features/map/hooks/useCurrentLocation';
import { useDirectionsEta } from '@/features/map/hooks/useDirectionsEta';
import {
  fetchPlaceDetails,
  PlacesDetailsError,
  type PlaceSuggestion,
} from '@/features/map/hooks/usePlacesAutocomplete';
import { useReverseGeocode } from '@/features/map/hooks/useReverseGeocode';
import {
  DROPOFF_ID,
  PICKUP_ID,
  canProceed,
  scheduledPickupDropoffComplete,
  useDeliveryFormStore,
} from '@/features/map/store/deliveryFormStore';
import {
  getScheduledPickupDropoffOrderError,
  mergeStopDateTime,
} from '@/features/map/utils/deliverySchedule';
import { useMapColors } from '@/features/map/theme/useMapColors';
import type { PlaceValue, PlacesTarget } from '@/features/map/types';
import type { MainTabParamList, MapTabScreenNavigationProp } from '@/types/navigation.types';

/**
 * Rough haversine-based travel estimate used only as a graceful fallback when
 * the Google Directions API is unavailable (key not provisioned, network
 * error, or quota exhausted). Uses an average urban driving speed so the
 * resulting ETA pill is at least indicative rather than stuck on
 * "Calculating…" forever.
 */
function haversineKm(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const la1 = (a.latitude * Math.PI) / 180;
  const la2 = (b.latitude * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}
const AVG_URBAN_SPEED_KMH = 35;

type MapRoute = RouteProp<MainTabParamList, 'Map'>;

/**
 * Map Delivery screen — composes:
 *  1. Full-screen Google/Apple map with pins + polyline + pulsing location.
 *  2. Floating back / kebab buttons.
 *  3. Bottom sheet with tabs + draggable stop list + proceed.
 *  4. A full-screen Places modal (single instance used by every field).
 */
export function MapScreen() {
  const navigation = useNavigation<MapTabScreenNavigationProp>();
  const route = useRoute<MapRoute>();
  const tabBarHeight = useBottomTabBarHeight();
  const c = useMapColors();

  const rows = useDeliveryFormStore((s) => s.rows);
  const tab = useDeliveryFormStore((s) => s.tab);
  const hydrateFromMapRows = useDeliveryOrderDraftStore((s) => s.hydrateFromMapRows);
  const setPlace = useDeliveryFormStore((s) => s.setPlace);
  const setStopExtraDropoff = useDeliveryFormStore((s) => s.setStopExtraDropoff);
  const setWindow = useDeliveryFormStore((s) => s.setWindow);
  const setDateISO = useDeliveryFormStore((s) => s.setDateISO);
  const setRouteMetrics = useDeliveryFormStore((s) => s.setRouteMetrics);
  const toast = useDeliveryFormStore((s) => s.toast);
  const setToast = useDeliveryFormStore((s) => s.setToast);

  const { coords, refresh } = useCurrentLocation(true);
  const { reverse } = useReverseGeocode();
  const { fetchEta } = useDirectionsEta();

  const mapRef = useRef<MapLayerHandle | null>(null);
  const sheetRef = useRef<DeliveryBottomSheetHandle | null>(null);

  const [placesTarget, setPlacesTarget] = useState<PlacesTarget | null>(null);
  // Mirror the current `placesTarget` in a ref so the modal's optimistic-close
  // flow (onPickSuggestion → onClose same tick) can still dispatch the result
  // to the correct row after `placesTarget` has been cleared.
  const placesTargetRef = useRef<PlacesTarget | null>(null);
  /** When true, skip overwriting dropoff schedule from fresh Directions ETA. */
  const dropoffScheduleUserEditedRef = useRef(false);

  // ── Apply nav params (initialDropoff + initialSnapIndex) once per mount ───
  const initialSnapIndex = route.params?.initialSnapIndex ?? 1;
  useEffect(() => {
    const initialDropoff = route.params?.initialDropoff;
    if (initialDropoff) {
      setPlace(DROPOFF_ID, {
        address: initialDropoff.address,
        lat: initialDropoff.lat,
        lng: initialDropoff.lng,
        placeId: initialDropoff.placeId,
      });
      // Re-center the map on the selected dropoff.
      mapRef.current?.animateTo({
        latitude: initialDropoff.lat,
        longitude: initialDropoff.lng,
      });
    }
    // `route.params` identity already captures this dependency.
  }, [route.params, setPlace]);

  // ── Clear the toast after a short delay ─────────────────────────────────
  useEffect(() => {
    if (!toast) return;
    const h = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(h);
  }, [toast, setToast]);

  // ── Directions ETA: route duration + suggested dropoff window (scheduled) ─
  // `fetchEta` uses Google Directions when configured; otherwise haversine fallback.
  // Dropoff date/time is filled from ETA until the user edits it; pickup time
  // or route changes clear the guard via `etaDepsKey`.
  const pickupRow = rows.find((r) => r.kind === 'pickup');
  const dropoffRow = rows.find((r) => r.kind === 'dropoff');
  const pickupKey = pickupRow?.place ? `${pickupRow.place.lat},${pickupRow.place.lng}` : '';
  const dropoffKey = dropoffRow?.place ? `${dropoffRow.place.lat},${dropoffRow.place.lng}` : '';
  const stopsKey = rows
    .filter((r) => r.kind === 'stop' && r.place)
    .map((r) => `${r.place!.lat},${r.place!.lng}`)
    .join('|');
  const pickupFromISO = pickupRow?.window?.fromISO ?? '';
  const pickupDateISO = pickupRow?.dateISO ?? '';

  const etaDepsKey = `${pickupKey}|${dropoffKey}|${stopsKey}|${pickupFromISO}|${pickupDateISO}`;
  useEffect(() => {
    dropoffScheduleUserEditedRef.current = false;
  }, [etaDepsKey]);

  useEffect(() => {
    if (!pickupRow?.place || !dropoffRow?.place) {
      setRouteMetrics(null, null);
      return;
    }

    let cancelled = false;
    const waypoints = rows
      .filter((r) => r.kind === 'stop' && r.place)
      .map((r) => ({ latitude: r.place!.lat, longitude: r.place!.lng }));

    // Same merge as ScheduledPills / validation: pickup calendar + time-of-day.
    // `Date.parse(window.fromISO)` alone ignores a changed date pill until the time is re-saved.
    const departureMs = pickupRow.window?.fromISO
      ? mergeStopDateTime(pickupRow.dateISO, pickupRow.window.fromISO).getTime()
      : Date.now();

    void (async () => {
      const origin = { latitude: pickupRow.place!.lat, longitude: pickupRow.place!.lng };
      const destination = { latitude: dropoffRow.place!.lat, longitude: dropoffRow.place!.lng };

      const eta = await fetchEta({ origin, destination, waypoints, departureMs });
      if (cancelled) return;

      let durationSec: number;
      let distanceM: number;
      if (eta) {
        durationSec = eta.durationSec;
        distanceM = eta.distanceM;
      } else {
        // Graceful fallback — sum haversine distance across the full route and
        // convert to seconds using an average urban speed. This means the pill
        // always shows *something* even if Directions API isn't enabled.
        const points = [origin, ...waypoints, destination];
        let km = 0;
        for (let i = 1; i < points.length; i += 1) km += haversineKm(points[i - 1], points[i]);
        durationSec = Math.max(60, Math.round((km / AVG_URBAN_SPEED_KMH) * 3600));
        distanceM = Math.max(1, Math.round(km * 1000));
      }

      setRouteMetrics(durationSec, distanceM);

      if (dropoffScheduleUserEditedRef.current || tab !== 'scheduled') return;

      const arriveMs = departureMs + durationSec * 1000;
      const arrive = new Date(arriveMs);
      const fromISO = arrive.toISOString();
      const toISO = new Date(arriveMs + 30 * 60 * 1000).toISOString();
      setWindow(DROPOFF_ID, { fromISO, toISO });
      // Calendar day for dropoff must follow **arrival**, not pickup's date — otherwise
      // `mergeStopDateTime(dropoff.dateISO, dropoff.window)` overwrites the ETA day and
      // breaks overnight routes + validation (pickup evening / dropoff next morning).
      setDateISO(
        DROPOFF_ID,
        new Date(
          arrive.getFullYear(),
          arrive.getMonth(),
          arrive.getDate(),
          12,
          0,
          0,
          0,
        ).toISOString(),
      );
    })();

    return () => {
      cancelled = true;
    };
    // `pickupKey` / `dropoffKey` / `stopsKey` are intentional stable dep keys.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickupKey, dropoffKey, stopsKey, pickupFromISO, pickupDateISO, tab]);

  const onDropoffScheduleEdited = useCallback(() => {
    dropoffScheduleUserEditedRef.current = true;
  }, []);

  // ── Places modal plumbing ───────────────────────────────────────────────
  const openPlaces = useCallback((target: PlacesTarget) => {
    placesTargetRef.current = target;
    setPlacesTarget(target);
  }, []);

  const closePlaces = useCallback(() => {
    setPlacesTarget(null);
    // NB: we deliberately do NOT clear `placesTargetRef` here. The modal calls
    // `onClose` on the same tick as `onPickSuggestion`, and the async details
    // resolver still needs the target to write back to the right row.
  }, []);

  const writePlaceToTarget = useCallback(
    (target: PlacesTarget, place: PlaceValue) => {
      if (target.kind === 'pickup') setPlace(PICKUP_ID, place);
      else if (target.kind === 'dropoff') setPlace(DROPOFF_ID, place);
      else if (target.kind === 'stop') setPlace(target.stopId, place);
      else if (target.kind === 'stopExtraDropoff')
        setStopExtraDropoff(target.stopId, place);
      mapRef.current?.animateTo({ latitude: place.lat, longitude: place.lng });
    },
    [setPlace, setStopExtraDropoff],
  );

  // Resolve a tapped suggestion in the BACKGROUND. The modal has already
  // closed by the time this runs, so a slow or failing Google Details request
  // can never freeze the autocomplete UI.
  const handlePickSuggestion = useCallback(
    async (s: PlaceSuggestion) => {
      const target = placesTargetRef.current;
      if (!target) return;
      try {
        const details = await fetchPlaceDetails(s.placeId);
        writePlaceToTarget(target, {
          address: details.address || s.fullText,
          lat: details.lat,
          lng: details.lng,
          placeId: details.placeId,
        });
      } catch (err) {
        const message =
          err instanceof PlacesDetailsError
            ? err.message
            : 'Unknown error resolving place.';
        Alert.alert("Couldn't load that place", message);
      }
    },
    [writePlaceToTarget],
  );

  const handlePickCurrentLocation = useCallback(async () => {
    const target = placesTargetRef.current;
    if (!target) return;
    const pos = coords ?? (await refresh());
    if (!pos) {
      Alert.alert(
        'Location unavailable',
        'Please enable location services and try again.',
      );
      return;
    }
    const rev = await reverse(pos.latitude, pos.longitude);
    writePlaceToTarget(target, {
      address:
        rev?.address ?? `${pos.latitude.toFixed(5)}, ${pos.longitude.toFixed(5)}`,
      lat: pos.latitude,
      lng: pos.longitude,
      placeId: rev?.placeId,
    });
  }, [coords, refresh, reverse, writePlaceToTarget]);

  const handleClearPlace = useCallback(
    (target: PlacesTarget) => {
      if (target.kind === 'pickup') setPlace(PICKUP_ID, null);
      else if (target.kind === 'dropoff') setPlace(DROPOFF_ID, null);
      else if (target.kind === 'stop') setPlace(target.stopId, null);
      else if (target.kind === 'stopExtraDropoff')
        setStopExtraDropoff(target.stopId, null);
    },
    [setPlace, setStopExtraDropoff],
  );

  // ── GPS button on pickup row ─────────────────────────────────────────────
  const handlePickupGps = useCallback(async () => {
    const pos = coords ?? (await refresh());
    if (!pos) {
      Alert.alert('Location unavailable', 'Please enable location services and try again.');
      return;
    }
    mapRef.current?.animateTo(pos);
    const rev = await reverse(pos.latitude, pos.longitude);
    setPlace(PICKUP_ID, {
      address: rev?.address ?? `${pos.latitude.toFixed(5)}, ${pos.longitude.toFixed(5)}`,
      lat: pos.latitude,
      lng: pos.longitude,
      placeId: rev?.placeId,
    });
  }, [coords, refresh, reverse, setPlace]);

  const handleProceed = useCallback(() => {
    if (!canProceed(rows, tab)) {
      const pickup = rows.find((r) => r.kind === 'pickup');
      const dropoff = rows.find((r) => r.kind === 'dropoff');
      const addressesOk = Boolean(pickup?.place?.address && dropoff?.place?.address);
      const orderErr =
        tab === 'scheduled' && addressesOk && scheduledPickupDropoffComplete(rows)
          ? getScheduledPickupDropoffOrderError(tab, rows)
          : null;
      setToast(
        orderErr ??
          (tab === 'scheduled' && addressesOk
            ? 'Set pickup date & time and dropoff date & time to continue.'
            : 'Please fill in both pickup and dropoff.'),
      );
      return;
    }
    hydrateFromMapRows(rows, tab);
    navigation.navigate('AddDeliveryContents');
  }, [hydrateFromMapRows, navigation, rows, setToast, tab]);

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <ScheduleDateTimePickerProvider>
        {/*
          Intentionally not forwarding `initialRegion` — MapLayer falls back to
          its UK-wide default. Users set pickup from search or the GPS control.
        */}
        <MapLayer ref={mapRef} currentLocation={coords} rows={rows} />

        <FloatingMapButtons
          onBack={() => {
            if (navigation.canGoBack()) navigation.goBack();
          }}
          onMenu={() => Alert.alert('Menu', 'No actions yet.')}
        />

        <DeliveryBottomSheet
          ref={sheetRef}
          initialSnapIndex={initialSnapIndex}
          onOpenPlaces={openPlaces}
          onClearPlace={handleClearPlace}
          onPickupGps={handlePickupGps}
          onProceed={handleProceed}
          onDropoffScheduleEdited={onDropoffScheduleEdited}
          // Reserve space so AddStop / Proceed clear the floating tab bar.
          bottomInset={tabBarHeight}
        />

        {toast && (
          <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(150)}
            style={[styles.toast, { backgroundColor: c.toastBg, bottom: tabBarHeight + 24 }]}
            pointerEvents="none"
          >
            <Text style={[styles.toastTxt, { color: c.toastText }]}>{toast}</Text>
          </Animated.View>
        )}

        {/* Last so z-index wins over map, sheet, and floating controls (not RN Modal). */}
        <PlacesAutocompleteModal
          visible={!!placesTarget}
          onClose={closePlaces}
          onPickSuggestion={handlePickSuggestion}
          onPickCurrentLocation={handlePickCurrentLocation}
          bias={coords ? { lat: coords.latitude, lng: coords.longitude } : undefined}
          title={placesTargetTitle(placesTarget)}
        />
      </ScheduleDateTimePickerProvider>
    </View>
  );
}

function placesTargetTitle(t: PlacesTarget | null): string {
  if (!t) return 'Search location';
  if (t.kind === 'pickup') return 'Search pickup location';
  if (t.kind === 'dropoff') return 'Search dropoff location';
  if (t.kind === 'stop') return 'Search stop location';
  return 'Search dropoff location';
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  toastTxt: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
});
