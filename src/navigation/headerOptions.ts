import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

import type { ThemeColors } from '@/shared/theme/colors';

const HEADER_TITLE_STYLE = {
  fontWeight: '600',
} as const;

function commonHeaderOptions(colors: ThemeColors) {
  return {
    headerShadowVisible: true,
    headerStyle: { backgroundColor: colors.surface },
    headerTitleStyle: { ...HEADER_TITLE_STYLE, color: colors.textPrimary },
    headerTintColor: colors.textPrimary,
    contentStyle: { backgroundColor: colors.background },
    sceneStyle: { backgroundColor: colors.background },
  };
}

export function createDefaultStackHeaderOptions(colors: ThemeColors): NativeStackNavigationOptions {
  return commonHeaderOptions(colors);
}

export function createDefaultTabHeaderOptions(colors: ThemeColors): BottomTabNavigationOptions {
  return commonHeaderOptions(colors);
}
