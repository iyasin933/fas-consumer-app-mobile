import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
  type Region,
  Polyline,
  type EdgePadding,
} from 'react-native-maps';

import { MapMarkerBadge } from '@/features/map/components/MapMarker';
import { PulsingDot } from '@/features/map/components/PulsingDot';
import { useMapColors } from '@/features/map/theme/useMapColors';
import { DARK_MAP_STYLE } from '@/shared/theme/mapStyle';
import type { DeliveryStop, LatLng } from '@/features/map/types';

export type MapLayerHandle = {
  animateTo: (coords: LatLng, durationMs?: number) => void;
  fitRoute: (coords: LatLng[], edgePadding?: EdgePadding) => void;
};

type Props = {
  initialRegion?: Region;
  currentLocation: LatLng | null;
  rows: DeliveryStop[];
  routeCoords?: LatLng[];
  routeSummaryLabel?: string | null;
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
  { initialRegion, currentLocation, rows, routeCoords, routeSummaryLabel },
  ref,
) {
  const mapRef = useRef<MapView | null>(null);
  const c = useMapColors();
  const { width } = useWindowDimensions();
  const narrow = width < 380;

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
      fitRoute: (coords, edgePadding) => {
        if (coords.length < 2) return;
        mapRef.current?.fitToCoordinates(coords, {
          animated: true,
          edgePadding: edgePadding ?? {
            top: 110,
            right: 60,
            bottom: 360,
            left: 60,
          },
        });
      },
    }),
    [],
  );

  const { fallbackPolylineCoords, pinnedRows } = useMemo(() => {
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
      fallbackPolylineCoords: filled.map((f) => ({ latitude: f.latitude, longitude: f.longitude })),
    };
  }, [rows]);
  const visiblePolylineCoords =
    routeCoords && routeCoords.length >= 2 ? routeCoords : fallbackPolylineCoords;
  const routeSummaryCoord = useMemo(() => {
    if (!routeSummaryLabel || visiblePolylineCoords.length < 2) return null;
    return visiblePolylineCoords[Math.floor((visiblePolylineCoords.length - 1) / 2)];
  }, [routeSummaryLabel, visiblePolylineCoords]);

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

  const styles = useMemo(
    () =>
      StyleSheet.create({
        routeChip: {
          minHeight: narrow ? 28 : 32,
          maxWidth: narrow ? 160 : 180,
          borderRadius: 16,
          paddingHorizontal: narrow ? 10 : 12,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: StyleSheet.hairlineWidth,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.14,
          shadowRadius: 10,
          elevation: 5,
        },
        routeChipText: {
          fontSize: narrow ? 12 : 13,
          lineHeight: narrow ? 14 : 16,
          fontWeight: '800',
        },
      }),
    [narrow],
  );

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        key={c.isDark ? 'delivery-map-dark' : 'delivery-map-light'}
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
        loadingBackgroundColor={c.background}
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

        {visiblePolylineCoords.length >= 2 && (
          <Polyline
            coordinates={visiblePolylineCoords}
            strokeColor={c.brandGreen}
            strokeWidth={4}
            lineCap="round"
            lineJoin="round"
          />
        )}

        {routeSummaryCoord ? (
          <Marker
            coordinate={routeSummaryCoord}
            anchor={{ x: 0.5, y: 1.25 }}
            zIndex={30}
          >
            <View
              style={[
                styles.routeChip,
                {
                  backgroundColor: c.surface,
                  borderColor: c.border,
                },
              ]}
            >
              <Text style={[styles.routeChipText, { color: c.textPrimary }]} numberOfLines={1}>
                {routeSummaryLabel}
              </Text>
            </View>
          </Marker>
        ) : null}
      </MapView>
    </View>
  );
});


