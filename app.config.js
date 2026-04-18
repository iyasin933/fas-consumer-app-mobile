/**
 * Expo dynamic config. Runs at build time (on EAS and on `expo prebuild` /
 * `expo run:*`) with access to `process.env`, so secrets live only in `.env`
 * (which is git-ignored) — NOT in a tracked JSON file.
 *
 * Keys consumed here:
 *   - GOOGLE_MAPS_IOS_API_KEY      (native iOS key, only required if you use
 *                                   PROVIDER_GOOGLE on iOS)
 *   - GOOGLE_MAPS_ANDROID_API_KEY  (native Android key, REQUIRED for Google
 *                                   Maps on Android)
 *   - EXPO_PUBLIC_GOOGLE_MAPS_API_KEY is consumed at runtime from JS for the
 *                                   Places + Geocoding HTTP APIs.
 */

module.exports = () => {
  const iosKey = process.env.GOOGLE_MAPS_IOS_API_KEY ?? '';
  const androidKey = process.env.GOOGLE_MAPS_ANDROID_API_KEY ?? '';

  const iosConfig = iosKey ? { googleMapsApiKey: iosKey } : undefined;
  const androidConfig = androidKey
    ? { googleMaps: { apiKey: androidKey } }
    : undefined;

  return {
    expo: {
      name: 'DropYou',
      slug: 'dropyou',
      scheme: 'dropyou',
      version: '1.0.0',
      orientation: 'portrait',
      icon: './assets/generated/icon.png',
      userInterfaceStyle: 'automatic',
      newArchEnabled: true,
      splash: {
        image: './assets/generated/splash-logo.png',
        resizeMode: 'contain',
        backgroundColor: '#ffffff',
      },
      ios: {
        supportsTablet: true,
        bundleIdentifier: 'co.uk.dropyou.app',
        infoPlist: {
          NSLocationWhenInUseUsageDescription:
            'DropYou needs your location to find nearby pickups and plan deliveries.',
          NSLocationAlwaysAndWhenInUseUsageDescription:
            'DropYou needs your location to find nearby pickups and plan deliveries.',
          // Declares the app uses only standard/exempt encryption (skips yearly
          // export-compliance wizard when submitting to App Store Connect).
          ITSAppUsesNonExemptEncryption: false,
        },
        ...(iosConfig ? { config: iosConfig } : {}),
      },
      android: {
        adaptiveIcon: {
          foregroundImage: './assets/generated/icon.png',
          backgroundColor: '#ffffff',
        },
        edgeToEdgeEnabled: true,
        predictiveBackGestureEnabled: false,
        permissions: ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION'],
        ...(androidConfig ? { config: androidConfig } : {}),
      },
      web: {
        favicon: './assets/favicon.png',
      },
      plugins: [
        'expo-web-browser',
        'expo-secure-store',
        'expo-dev-client',
        [
          'expo-location',
          {
            locationAlwaysAndWhenInUsePermission:
              'DropYou needs your location to find nearby pickups and plan deliveries.',
          },
        ],
        '@react-native-community/datetimepicker',
      ],
      extra: {
        eas: {
          projectId: 'f8fabd19-7d45-40cf-9162-ebfa7131500c',
        },
      },
      updates: {
        url: 'https://u.expo.dev/f8fabd19-7d45-40cf-9162-ebfa7131500c',
      },
      runtimeVersion: {
        policy: 'appVersion',
      },
    },
  };
};
