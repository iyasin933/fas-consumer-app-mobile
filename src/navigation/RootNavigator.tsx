import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { AppNavigator } from '@/navigation/AppNavigator';
import { AuthNavigator } from '@/navigation/AuthNavigator';

export function RootNavigator() {
  const { session, isReady } = useAuth();
  const isAuthed = session === 'authed';
  const { colors, isDark } = useTheme();

  const navTheme = useMemo(
    () => ({
      ...(isDark ? DarkTheme : DefaultTheme),
      colors: {
        ...(isDark ? DarkTheme.colors : DefaultTheme.colors),
        background: colors.background,
        primary: colors.primary,
        card: colors.surface,
        text: colors.textPrimary,
        border: colors.border,
      },
    }),
    [isDark, colors.background, colors.primary, colors.surface, colors.textPrimary, colors.border],
  );

  if (!isReady) {
    return (
      <View style={[styles.boot, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      {isAuthed ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
