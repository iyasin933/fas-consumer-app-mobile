import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  type Region,
  Polyline,
} from 'react-native-maps';

import { MapMarkerBadge } from '@/features/map/components/MapMarker';
import { PulsingDot } from '@/features/map/components/PulsingDot';
import { useMapColors } from '@/features/map/theme/useMapColors';
import type { DeliveryStop, LatLng } from '@/features/map/types';

/**
 * Minimal dark-mode map style for Android (Google Maps). iOS uses the
 * `userInterfaceStyle` prop to switch Apple Maps' appearance automatically.
 * This is a small, conservative palette (no poi tweaking) chosen to blend
 * with the app's dark surfaces without changing road legibility.
 */
const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#1f2937' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#e5e7eb' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1f2937' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#374151' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#4b5563' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
];

export type MapLayerHandle = {
  animateTo: (coords: LatLng, durationMs?: number) => void;
};

type Props = {
  initialRegion?: Region;
  currentLocation: LatLng | null;
  rows: DeliveryStop[];
};

/**
 * Default framing: London, UK (Trafalgar Square). We always start on London
 * regardless of the device's GPS fix; after a fix resolves, the screen
 * imperatively animates the camera to the user's current location via
 * `animateTo`, so this only affects the initial paint / GPS-unavailable case.
 *
 * Deltas are tuned for a city-level view (~ Greater London in frame).
 */
const DEFAULT_REGION: Region = {
  latitude: 51.5074,
  longitude: -0.1278,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

/**
 * Full-screen map that renders:
 *  - the pulsing green "you are here" dot
 *  - one pin per filled row (green pickup, orange stops, red dropoff)
 *  - a green polyline connecting them in list order
 *
 * Uses the Google provider on Android for consistent styling. iOS falls back to
 * Apple Maps by default (the Google key is still read for Places/Geocoding).
 */
export const MapLayer = forwardRef<MapLayerHandle, Props>(function MapLayer(
  { initialRegion, currentLocation, rows },
  ref,
) {
  const mapRef = useRef<MapView | null>(null);
  const c = useMapColors();

  useImperativeHandle(
    ref,
    () => ({
      animateTo: (coords, duration = 600) => {
        mapRef.current?.animateToRegion(
          {
            latitude: coords.latitude,
            longitude: coords.longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          },
          duration,
        );
      },
    }),
    [],
  );

  const { polylineCoords, pinnedRows } = useMemo(() => {
    const filled = rows
      .filter((r) => r.place)
      .map((r) => ({
        id: r.id,
        kind: r.kind,
        latitude: r.place!.lat,
        longitude: r.place!.lng,
      }));
    return {
      pinnedRows: filled,
      polylineCoords: filled.map((f) => ({ latitude: f.latitude, longitude: f.longitude })),
    };
  }, [rows]);

  const stopNumberByRowId = useMemo(() => {
    const map = new Map<string, number>();
    let n = 0;
    for (const r of rows) {
      if (r.kind === 'stop') {
        n += 1;
        map.set(r.id, n);
      }
    }
    return map;
  }, [rows]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={(r) => {
          mapRef.current = r;
        }}
        style={StyleSheet.absoluteFill}
        // Google on Android gives us a consistent tile style and matches the
        // rest of the app. iOS uses Apple Maps by default (no key required for
        // rendering — our key is for the Places/Geocoding HTTP APIs).
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        initialRegion={initialRegion ?? DEFAULT_REGION}
        showsCompass={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        loadingEnabled
        // Apple Maps (iOS) honors this automatically; Google Maps (Android)
        // reads `customMapStyle` below instead.
        userInterfaceStyle={c.isDark ? 'dark' : 'light'}
        customMapStyle={c.isDark && Platform.OS === 'android' ? DARK_MAP_STYLE : undefined}
      >
        {currentLocation && (
          <Marker
            coordinate={currentLocation}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
            zIndex={20}
          >
            <PulsingDot />
          </Marker>
        )}

        {pinnedRows.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.latitude, longitude: p.longitude }}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
          >
            <MapMarkerBadge
              kind={p.kind}
              label={
                p.kind === 'stop' ? String(stopNumberByRowId.get(p.id) ?? '') : undefined
              }
            />
          </Marker>
        ))}

        {polylineCoords.length >= 2 && (
          <Polyline
            coordinates={polylineCoords}
            strokeColor={c.brandGreen}
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        )}
      </MapView>
    </View>
  );
});
