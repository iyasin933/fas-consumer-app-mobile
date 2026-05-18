import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { useEffect, useMemo, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { AppNavigator } from '@/navigation/AppNavigator';
import { AuthNavigator } from '@/navigation/AuthNavigator';
import { BrandLogo } from '@/shared/components/BrandLogo';
import type { ThemeColors } from '@/shared/theme/colors';
import { typography } from '@/shared/theme/typography';

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
    return <BootSplash colors={colors} />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      {isAuthed ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

function BootSplash({ colors }: { colors: ThemeColors }) {
  const breath = useRef(new Animated.Value(0)).current;
  const styles = useMemo(() => createStyles(colors), [colors]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(breath, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breath, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [breath]);

  const scale = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.96, 1.04],
  });
  const opacity = breath.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1],
  });

  return (
    <View style={styles.boot}>
      <Animated.View style={[styles.logoWrap, { opacity, transform: [{ scale }] }]}>
        <BrandLogo variant="hero" />
        <Text style={styles.brandText}>DropYou</Text>
      </Animated.View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    boot: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    logoWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    brandText: {
      color: colors.textPrimary,
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      letterSpacing: 0.4,
    },
  });
}
