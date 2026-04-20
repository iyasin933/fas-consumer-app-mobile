import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const BRAND_GREEN = '#2ECC71';

/**
 * Green "you are here" dot with two concentric pulsing rings.
 * Rendered as the content of a `Marker` inside the map. Uses the UI thread
 * (shared value + animated style) so it never drops frames while the map pans.
 */
export function PulsingDot() {
  const progressA = useSharedValue(0);
  const progressB = useSharedValue(0);

  useEffect(() => {
    progressA.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
    // Offset the second ring so the two waves don't align.
    progressB.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }),
      -1,
      false,
    );
    const handle = setTimeout(() => {
      progressB.value = withRepeat(
        withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }),
        -1,
        false,
      );
    }, 900);
    return () => clearTimeout(handle);
  }, [progressA, progressB]);

  const ringA = useAnimatedStyle(() => ({
    opacity: 0.55 * (1 - progressA.value),
    transform: [{ scale: 0.6 + progressA.value * 1.6 }],
  }));
  const ringB = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - progressB.value),
    transform: [{ scale: 0.6 + progressB.value * 2.2 }],
  }));

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.ring, ringB]} />
      <Animated.View style={[styles.ring, ringA]} />
      <View style={styles.dotOuter}>
        <View style={styles.dotInner} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: BRAND_GREEN,
  },
  dotOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  dotInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: BRAND_GREEN,
  },
});
