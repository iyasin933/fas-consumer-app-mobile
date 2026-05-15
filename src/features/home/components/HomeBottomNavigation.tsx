import {
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useContext, useEffect, useMemo } from 'react';
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

type TabBarMetrics = {
  barHeight: number;
  fabSize: number;
  fabRadius: number;
  fabTop: number;
  fabIconSize: number;
  iconSize: number;
  iconBoxSize: number;
  labelFontSize: number;
  tabPaddingTop: number;
  tabPaddingBottom: number;
  tabGap: number;
  badgeSize: number;
  badgeFontSize: number;
  cornerRadius: number;
  notchRadius: number;
  notchControlLength: number;
};

function tabBarMetrics(width: number, height: number): TabBarMetrics {
  const shortestSide = Math.min(width, height);
  const compactWidth = width < 360;
  const compactHeight = height < 720;
  const roomyWidth = width >= 430;

  const barHeight = compactHeight ? 66 : roomyWidth ? 76 : 72;
  const fabSize = compactWidth || compactHeight ? 56 : roomyWidth ? 68 : 64;
  const fabRadius = fabSize / 2;
  const notchRadius = Math.max(30, Math.min(38, fabRadius + (roomyWidth ? 4 : 3)));
  const fabTop = notchRadius - fabSize;

  return {
    barHeight,
    fabSize,
    fabRadius,
    fabTop,
    fabIconSize: compactWidth ? 26 : roomyWidth ? 32 : 30,
    iconSize: compactWidth ? 22 : roomyWidth ? 25 : 24,
    iconBoxSize: compactWidth ? 26 : roomyWidth ? 30 : 28,
    labelFontSize: shortestSide < 360 ? 9.5 : roomyWidth ? 11 : 10.5,
    tabPaddingTop: compactHeight ? 9 : 12,
    tabPaddingBottom: compactHeight ? 5 : 6,
    tabGap: compactWidth ? 2 : 3,
    badgeSize: compactWidth ? 15 : 16,
    badgeFontSize: compactWidth ? 8 : 9,
    cornerRadius: compactWidth ? 20 : 24,
    notchRadius,
    notchControlLength: compactWidth ? 18 : roomyWidth ? 24 : 22,
  };
}

// ─── Styles factory ───────────────────────────────────────────────────────────
function createStyles(colors: ThemeColors, metrics: TabBarMetrics) {
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
      height: metrics.barHeight,
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
      minHeight: metrics.barHeight,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: metrics.tabPaddingTop,
      paddingBottom: metrics.tabPaddingBottom,
      gap: metrics.tabGap,
    },
    /** Empty flex slot that reserves the same width as a tab cell for the FAB. */
    centerSpacer: {
      flex: 1,
      minHeight: metrics.barHeight,
    },
    label: {
      fontSize: metrics.labelFontSize,
      letterSpacing: 0.15,
      textAlign: 'center',
    },
    iconWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      width: metrics.iconBoxSize,
      height: metrics.iconBoxSize,
      position: 'relative',
    },
    /** Notification badge dot. */
    badge: {
      position: 'absolute',
      right: -metrics.badgeSize * 0.42,
      top: -metrics.badgeSize * 0.25,
      minWidth: metrics.badgeSize,
      height: metrics.badgeSize,
      borderRadius: metrics.badgeSize / 2,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
      zIndex: 6,
    },
    badgeTxt: {
      color: '#ffffff',
      fontSize: metrics.badgeFontSize,
      fontWeight: '700',
    },
    /** Floating action button — lifts above the bar via negative top. */
    fab: {
      position: 'absolute',
      width: metrics.fabSize,
      height: metrics.fabSize,
      borderRadius: metrics.fabRadius,
      alignItems: 'center',
      justifyContent: 'center',
      top: metrics.fabTop,
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
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
export function HomeBottomNavigation({ state, navigation, insets }: BottomTabBarProps) {
  const { width, height } = useWindowDimensions();
  const tabBarOnHeightChange = useContext(BottomTabBarHeightCallbackContext);
  const { colors: themeColors } = useTheme();
  const colors = themeColors ?? lightColors;
  const metrics = useMemo(() => tabBarMetrics(width, height), [height, width]);
  const styles = useMemo(() => createStyles(colors, metrics), [colors, metrics]);
  const shouldHideForMapFlow = state.routes[state.index]?.name === 'Map';
  const logicalTabBarHeight = metrics.barHeight + insets.bottom;
  const contentWidth = Math.max(1, width - insets.left - insets.right);
  const fabLeft = insets.left + contentWidth / 2 - metrics.fabRadius;
  const visibility = useSharedValue(shouldHideForMapFlow ? 0 : 1);

  useEffect(() => {
    visibility.value = withTiming(shouldHideForMapFlow ? 0 : 1, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
  }, [shouldHideForMapFlow, visibility]);

  useEffect(() => {
    tabBarOnHeightChange?.(shouldHideForMapFlow ? 0 : logicalTabBarHeight);
  }, [logicalTabBarHeight, shouldHideForMapFlow, tabBarOnHeightChange]);

  const animatedWrapStyle = useAnimatedStyle(() => ({
    height: visibility.value * logicalTabBarHeight,
    opacity: visibility.value,
    transform: [{ translateY: (1 - visibility.value) * (logicalTabBarHeight + 18) }],
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
      pointerEvents={shouldHideForMapFlow ? 'none' : 'box-none'}
      style={[styles.wrap, animatedWrapStyle]}
    >
      {/* ── Main bar ────────────────────────────────────────────────────── */}
      <View style={styles.bar}>
        {/* White notch-shaped background */}
        <LiquidTabBarLayer
          width={width}
          height={metrics.barHeight}
          cornerRadius={metrics.cornerRadius}
          notchRadius={metrics.notchRadius}
          notchControlLength={metrics.notchControlLength}
        />

        {/* Left (Home, Schedule) + spacer + Right (Notifications, Profile) */}
        <View
          style={[
            styles.tabRow,
            {
              paddingLeft: insets.left,
              paddingRight: insets.right,
            },
          ]}
          pointerEvents="box-none"
        >
          {([0, 1] as const).map((i) => {
            const route = state.routes[i];
            const meta = TAB_META[i];
            const active = state.index === i;
            return (
              <Pressable
                key={route.key}
                style={styles.tabCell}
                onPress={() => handleTabPress(route.key, route.name)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={meta.label}
              >
                <View style={styles.iconWrap}>
                  <Ionicons
                    name={active ? meta.iconActive : meta.iconInactive}
                    size={metrics.iconSize}
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
          <View style={styles.centerSpacer} pointerEvents="none" />

          {([3, 4] as const).map((i) => {
            const route = state.routes[i];
            const meta = TAB_META[i];
            const active = state.index === i;
            return (
              <Pressable
                key={route.key}
                style={styles.tabCell}
                onPress={() => handleTabPress(route.key, route.name)}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={meta.label}
              >
                <View style={styles.iconWrap}>
                  <Ionicons
                    name={active ? meta.iconActive : meta.iconInactive}
                    size={metrics.iconSize}
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
              left: fabLeft,
              backgroundColor: isCenterActive
                ? colors.primaryPressed
                : colors.primary,
            },
          ]}
          onPress={() => handleTabPress(centerRoute.key, centerRoute.name)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityState={{ selected: isCenterActive }}
          accessibilityLabel={TAB_META[CENTER_IDX].label}
        >
          <Ionicons
            name={isCenterActive ? 'location' : 'location-outline'}
            size={metrics.fabIconSize}
            color="#ffffff"
          />
        </Pressable>
      </View>

      {/* ── Safe-area fill; iOS draws the real home indicator itself. ── */}
      {insets.bottom > 0 && (
        <View pointerEvents="none" style={[styles.safeAreaFill, { height: insets.bottom }]} />
      )}
    </Animated.View>
  );
}
