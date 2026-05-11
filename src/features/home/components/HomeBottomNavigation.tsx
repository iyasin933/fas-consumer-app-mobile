import {
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useContext, useEffect, useMemo } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { LiquidTabBarLayer } from '@/features/home/components/LiquidTabBarLayer';
import { useTheme } from '@/hooks/useTheme';
import { lightColors, type ThemeColors } from '@/shared/theme/colors';
import type { MainTabParamList } from '@/types/navigation.types';
import { debugLog } from '@/utils/debugLog';

// ─── Layout constants ────────────────────────────────────────────────────────
const BAR_H = 72;          // visible bar height
const FAB_SIZE = 64;       // floating action button diameter
const FAB_R = FAB_SIZE / 2; // 32
/** Notch depth (must satisfy: notchR ≥ FAB_R + vertical_overlap). */
const NOTCH_R = 30;
/** FAB protrudes (FAB_R − (NOTCH_R − FAB_R)) = 2*FAB_R − NOTCH_R = 28 px above bar top. */
const FAB_TOP = NOTCH_R - FAB_SIZE; // −28

const INACTIVE_COLOR = '#6B7280';

// ─── Tab metadata ─────────────────────────────────────────────────────────────
const TAB_META: {
  name: keyof MainTabParamList;
  iconActive: keyof typeof Ionicons.glyphMap;
  iconInactive: keyof typeof Ionicons.glyphMap;
  label: string;
  badge?: number;
}[] = [
  {
    name: 'HomeMain',
    iconActive: 'home',
    iconInactive: 'home-outline',
    label: 'Home',
  },
  {
    name: 'Bookings',
    iconActive: 'calendar',
    iconInactive: 'calendar-outline',
    label: 'Schedule',
  },
  {
    name: 'Map',
    iconActive: 'location',
    iconInactive: 'location-outline',
    label: 'Map',
  },
  {
    name: 'Notifications',
    iconActive: 'notifications',
    iconInactive: 'notifications-outline',
    label: 'Notifications',
    badge: 3,
  },
  {
    name: 'Settings',
    iconActive: 'person',
    iconInactive: 'person-outline',
    label: 'Profile',
  },
];

const CENTER_IDX = 2; // Map

// ─── Styles factory ───────────────────────────────────────────────────────────
function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    /**
     * Outer wrapper — transparent so the curved SVG corners and the notch
     * show the screen content behind them.
     */
    wrap: {
      backgroundColor: 'transparent',
      overflow: 'visible',
      zIndex: 10,
      elevation: 10,
    },
    /**
     * The bar itself.  overflow:visible lets the FAB escape the clipping rect.
     * The white background is provided entirely by the SVG inside LiquidTabBarLayer.
     */
    bar: {
      height: BAR_H,
      overflow: 'visible',
      position: 'relative',
      ...Platform.select({
        ios: {
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.07,
          shadowRadius: 10,
        },
      }),
    },
    /**
     * Absolute row that holds the four regular tab buttons.
     * A centerSpacer at index 2 reserves space for the FAB.
     */
    tabRow: {
      ...StyleSheet.absoluteFillObject,
      flexDirection: 'row',
      alignItems: 'center',
      zIndex: 2,
      elevation: 2,
    },
    tabCell: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 12,
      paddingBottom: 6,
      gap: 3,
    },
    /** Empty flex slot that reserves the same width as a tab cell for the FAB. */
    centerSpacer: {
      flex: 1,
    },
    label: {
      fontSize: 10.5,
      letterSpacing: 0.15,
      textAlign: 'center',
    },
    iconWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      width: 28,
      height: 28,
      position: 'relative',
    },
    /** Notification badge dot. */
    badge: {
      position: 'absolute',
      right: -7,
      top: -4,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
      zIndex: 6,
    },
    badgeTxt: {
      color: '#ffffff',
      fontSize: 9,
      fontWeight: '700',
    },
    /** Floating action button — lifts above the bar via negative top. */
    fab: {
      position: 'absolute',
      width: FAB_SIZE,
      height: FAB_SIZE,
      borderRadius: FAB_R,
      alignItems: 'center',
      justifyContent: 'center',
      top: FAB_TOP,
      zIndex: 4,
      elevation: 12,
      ...Platform.select({
        ios: {
          shadowColor: '#16a34a',
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.38,
          shadowRadius: 14,
        },
      }),
    },
    /** White fill below the bar that covers the device safe-area strip. */
    safeAreaFill: {
      backgroundColor: colors.surface,
    },
    homeIndicatorWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    homeIndicator: {
      width: 134,
      height: 5,
      borderRadius: 3,
      backgroundColor: '#1a1a1a',
      opacity: 0.18,
    },
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
export function HomeBottomNavigation({ state, navigation, insets }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const tabBarOnHeightChange = useContext(BottomTabBarHeightCallbackContext);
  const { colors: themeColors } = useTheme();
  const colors = themeColors ?? lightColors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const shouldHideForMapFlow = state.routes[state.index]?.name === 'Map';
  const visibility = useSharedValue(shouldHideForMapFlow ? 0 : 1);

  const onTabBarLayout = useCallback(
    (e: LayoutChangeEvent) => {
      tabBarOnHeightChange?.(e.nativeEvent.layout.height);
    },
    [tabBarOnHeightChange],
  );

  useEffect(() => {
    visibility.value = withTiming(shouldHideForMapFlow ? 0 : 1, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
  }, [shouldHideForMapFlow, visibility]);

  const animatedWrapStyle = useAnimatedStyle(() => ({
    height: visibility.value * (BAR_H + insets.bottom),
    opacity: visibility.value,
    transform: [{ translateY: (1 - visibility.value) * (BAR_H + insets.bottom + 18) }],
  }));

  const handleTabPress = useCallback(
    (routeKey: string, routeName: string) => {
      debugLog('BottomNav', `tab: ${routeName}`);
      const e = navigation.emit({
        type: 'tabPress',
        target: routeKey,
        canPreventDefault: true,
      });
      if (!e.defaultPrevented) {
        navigation.navigate(routeName);
      }
    },
    [navigation],
  );

  const centerRoute = state.routes[CENTER_IDX];
  const isCenterActive = state.index === CENTER_IDX;

  return (
    <Animated.View
      onLayout={onTabBarLayout}
      pointerEvents={shouldHideForMapFlow ? 'none' : 'auto'}
      style={[styles.wrap, animatedWrapStyle]}
    >
      {/* ── Main bar ────────────────────────────────────────────────────── */}
      <View style={styles.bar}>
        {/* White notch-shaped background */}
        <LiquidTabBarLayer width={width} height={BAR_H} />

        {/* Left (Home, Schedule) + spacer + Right (Notifications, Profile) */}
        <View style={styles.tabRow}>
          {([0, 1] as const).map((i) => {
            const route = state.routes[i];
            const meta = TAB_META[i];
            const active = state.index === i;
            return (
              <Pressable
                key={route.key}
                style={styles.tabCell}
                onPress={() => handleTabPress(route.key, route.name)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={meta.label}
              >
                <View style={styles.iconWrap}>
                  <Ionicons
                    name={active ? meta.iconActive : meta.iconInactive}
                    size={24}
                    color={active ? colors.primary : INACTIVE_COLOR}
                  />
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.label,
                    {
                      color: active ? colors.primary : INACTIVE_COLOR,
                      fontWeight: active ? '700' : '500',
                    },
                  ]}
                >
                  {meta.label}
                </Text>
              </Pressable>
            );
          })}

          {/* Reserve the center slot for the FAB */}
          <View style={styles.centerSpacer} />

          {([3, 4] as const).map((i) => {
            const route = state.routes[i];
            const meta = TAB_META[i];
            const active = state.index === i;
            return (
              <Pressable
                key={route.key}
                style={styles.tabCell}
                onPress={() => handleTabPress(route.key, route.name)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={meta.label}
              >
                <View style={styles.iconWrap}>
                  <Ionicons
                    name={active ? meta.iconActive : meta.iconInactive}
                    size={24}
                    color={active ? colors.primary : INACTIVE_COLOR}
                  />
                  {meta.badge != null && meta.badge > 0 && (
                    <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                      <Text style={styles.badgeTxt}>
                        {meta.badge > 9 ? '9+' : meta.badge}
                      </Text>
                    </View>
                  )}
                </View>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.label,
                    {
                      color: active ? colors.primary : INACTIVE_COLOR,
                      fontWeight: active ? '700' : '500',
                    },
                  ]}
                >
                  {meta.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* ── Floating Map button ─────────────────────────────────────── */}
        <Pressable
          style={[
            styles.fab,
            {
              left: width / 2 - FAB_R,
              backgroundColor: isCenterActive
                ? colors.primaryPressed
                : colors.primary,
            },
          ]}
          onPress={() => handleTabPress(centerRoute.key, centerRoute.name)}
          accessibilityRole="button"
          accessibilityState={{ selected: isCenterActive }}
          accessibilityLabel={TAB_META[CENTER_IDX].label}
        >
          <Ionicons
            name={isCenterActive ? 'location' : 'location-outline'}
            size={30}
            color="#ffffff"
          />
        </Pressable>
      </View>

      {/* ── Safe-area fill + iOS home indicator ─────────────────────── */}
      {insets.bottom > 0 && (
        <View style={[styles.safeAreaFill, { height: insets.bottom }]}>
          {Platform.OS === 'ios' && (
            <View style={styles.homeIndicatorWrap}>
              <View style={styles.homeIndicator} />
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
}
