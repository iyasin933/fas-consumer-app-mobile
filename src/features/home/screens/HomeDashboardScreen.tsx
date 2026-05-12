import { useNavigation } from '@react-navigation/native';
import { useBottomTabBarHeight, type BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useCallback, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActiveTripsSection } from '@/features/home/components/ActiveTripsSection';
import { HomePromoBanner } from '@/features/home/components/HomePromoBanner';
import { HomeSearchHeader } from '@/features/home/components/HomeSearchHeader';
import { HomeServiceGrid } from '@/features/home/components/HomeServiceGrid';
import { PlacesAutocompleteModal } from '@/features/map/components/PlacesAutocompleteModal';
import { useCurrentLocation } from '@/features/map/hooks/useCurrentLocation';
import {
  fetchPlaceDetails,
  PlacesDetailsError,
  type PlaceSuggestion,
} from '@/features/map/hooks/usePlacesAutocomplete';
import { useReverseGeocode } from '@/features/map/hooks/useReverseGeocode';
import { useTheme } from '@/hooks/useTheme';
import type { MainTabParamList, MapScreenPickedPlace } from '@/types/navigation.types';

/** Main “home” feed (tabs add their own `HomeBottomNavigation`). */
export function HomeDashboardScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const tabBarHeight = useBottomTabBarHeight();
  const { coords, refresh } = useCurrentLocation(false);
  const { reverse } = useReverseGeocode();

  const [whereToOpen, setWhereToOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const inFlightRef = useRef(false);

  const navigateToMapWith = useCallback(
    (place: MapScreenPickedPlace) => {
      navigation.navigate('Map', {
        initialDropoff: place,
        initialSnapIndex: 1,
      });
    },
    [navigation],
  );

  const handlePickSuggestion = useCallback(
    async (s: PlaceSuggestion) => {
      if (inFlightRef.current) return;
      inFlightRef.current = true;
      setResolving(true);
      try {
        const details = await fetchPlaceDetails(s.placeId);
        navigateToMapWith({
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
      } finally {
        inFlightRef.current = false;
        setResolving(false);
      }
    },
    [navigateToMapWith],
  );

  const handlePickCurrentLocation = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setResolving(true);
    try {
      const pos = coords ?? (await refresh());
      if (!pos) {
        Alert.alert(
          'Location unavailable',
          'Please enable location services and try again.',
        );
        return;
      }
      const rev = await reverse(pos.latitude, pos.longitude);
      navigateToMapWith({
        address:
          rev?.address ?? `${pos.latitude.toFixed(5)}, ${pos.longitude.toFixed(5)}`,
        lat: pos.latitude,
        lng: pos.longitude,
        placeId: rev?.placeId,
      });
    } finally {
      inFlightRef.current = false;
      setResolving(false);
    }
  }, [coords, navigateToMapWith, refresh, reverse]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.root}>
        <HomeSearchHeader
          onOpenWhereTo={() => setWhereToOpen(true)}
          resolving={resolving}
        />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.content, { paddingBottom: tabBarHeight + 16 }]}
          showsVerticalScrollIndicator={false}
        >
          <HomePromoBanner />
          <HomeServiceGrid />
          <ActiveTripsSection />
        </ScrollView>

        {/* Render last so stacking is above ScrollView + tab bar region */}
        <PlacesAutocompleteModal
          visible={whereToOpen}
          onClose={() => setWhereToOpen(false)}
          onPickSuggestion={handlePickSuggestion}
          onPickCurrentLocation={handlePickCurrentLocation}
          bias={coords ? { lat: coords.latitude, lng: coords.longitude } : undefined}
          title="Where to?"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  root: { flex: 1 },
  scroll: { flex: 1 },
  content: {},
});
