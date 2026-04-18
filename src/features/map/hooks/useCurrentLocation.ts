import * as Location from 'expo-location';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { LatLng } from '@/features/map/types';
import { debugLog } from '@/utils/debugLog';

type State = {
  coords: LatLng | null;
  status: 'idle' | 'requesting' | 'granted' | 'denied' | 'error';
  error: string | null;
};

/**
 * Requests foreground location permission once on mount and tracks a single
 * high-accuracy fix. Exposes `refresh()` for the GPS pill inside the pickup card.
 *
 * Using `expo-location` (rather than `@react-native-community/geolocation`)
 * because this is an Expo-managed project — same runtime surface, no extra
 * native wiring.
 */
export function useCurrentLocation(autoRequest = true) {
  const [state, setState] = useState<State>({
    coords: null,
    status: 'idle',
    error: null,
  });
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetchOnce = useCallback(async () => {
    setState((s) => ({ ...s, status: 'requesting', error: null }));
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (mountedRef.current) {
          setState({ coords: null, status: 'denied', error: 'Location permission denied' });
        }
        return null;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords: LatLng = {
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      };
      if (mountedRef.current) {
        setState({ coords, status: 'granted', error: null });
      }
      return coords;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Location error';
      debugLog('Location', msg);
      if (mountedRef.current) {
        setState({ coords: null, status: 'error', error: msg });
      }
      return null;
    }
  }, []);

  useEffect(() => {
    if (autoRequest) void fetchOnce();
  }, [autoRequest, fetchOnce]);

  return { ...state, refresh: fetchOnce };
}
