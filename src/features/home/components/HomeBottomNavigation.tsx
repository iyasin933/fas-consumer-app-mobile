import {
  BottomTabBarHeightCallbackContext,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { LiquidTabBarLayer } from '@/features/home/components/LiquidTabBarLayer';
import type { MainTabParamList } from '@/types/navigation.types';
import { useTheme } from '@/hooks/useTheme';
import { lightColors, type ThemeColors } from '@/shared/theme/colors';
import { debugLog } from '@/utils/debugLog';

const BAR_H = 64;

const TAB_META: {
  name: keyof MainTabParamList;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: number;
}[] = [
  { name: 'HomeMain', icon: 'home-outline' },
  { name: 'Bookings', icon: 'calendar-outline' },
  { name: 'Map', icon: 'map-outline' },
  { name: 'Notifications', icon: 'notifications-outline', badge: 3 },
  { name: 'Settings', icon: 'person-outline' },
];

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      backgroundColor: colors.background,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      zIndex: 10,
      elevation: 10,
      overflow: 'visible',
    },
    bar: {
      position: 'relative',
      overflow: 'visible',
    },
    icons: {
      ...StyleSheet.absoluteFillObject,
      flexDirection: 'row',
      alignItems: 'center',
      zIndex: 2,
      elevation: 4,
    },
    cell: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      height: BAR_H,
    },
    iconSlot: {
      position: 'relative',
      height: 40,
      width: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badge: {
      position: 'absolute',
      right: -2,
      top: -4,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: colors.danger,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
      zIndex: 6,
      elevation: 0,
    },
    badgeTxt: { color: colors.onPrimary, fontSize: 9, fontWeight: '700' },
  });
}

export function HomeBottomNavigation({ state, navigation, insets }: BottomTabBarProps) {
  const { width } = useWindowDimensions();
  const tabBarOnHeightChange = useContext(BottomTabBarHeightCallbackContext);
  const { colors: themeColors } = useTheme();
  const colors = themeColors ?? lightColors;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const indexAnim = useRef(new Animated.Value(state.index)).current;

  const bottomInset = insets.bottom;

  const onTabBarLayout = useCallback(
    (e: LayoutChangeEvent) => {
      tabBarOnHeightChange?.(e.nativeEvent.layout.height);
    },
    [tabBarOnHeightChange],
  );

  useEffect(() => {
    Animated.spring(indexAnim, {
      toValue: state.index,
      useNativeDriver: false,
      friction: 14,
      tension: 38,
    }).start();
  }, [state.index, indexAnim]);

  return (
    <View
      style={[styles.wrap, { paddingBottom: bottomInset }]}
      onLayout={onTabBarLayout}
    >
      <View style={[styles.bar, { height: BAR_H }]}>
        <LiquidTabBarLayer
          width={width}
          height={BAR_H}
          indexAnim={indexAnim}
          initialTabIndex={state.index}
        />
        <View style={styles.icons}>
          {state.routes.map((route, i) => {
            const on = state.index === i;
            const meta = TAB_META[i];
            const badge = meta?.badge;
            const icon = meta?.icon ?? 'ellipse-outline';
            return (
              <Pressable
                key={route.key}
                style={styles.cell}
                onPress={() => {
                  debugLog('BottomNav', `tab: ${route.name}`);
                  const e = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!e.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
              >
                <View style={styles.iconSlot}>
                  <Ionicons
                    name={icon}
                    size={24}
                    color={on ? colors.onPrimary : colors.muted}
                  />
                  {badge != null && badge > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeTxt}>{badge > 9 ? '9+' : badge}</Text>
                    </View>
                  ) : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
