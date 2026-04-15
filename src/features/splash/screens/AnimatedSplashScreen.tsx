import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { BrandLogo } from '@/shared/components/BrandLogo';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { typography } from '@/shared/theme/typography';

type AnimatedSplashScreenProps = {
  onAnimationComplete: () => void;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    logoWrap: {
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: 10,
    },
    brandText: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      color: colors.textPrimary,
      letterSpacing: 0.4,
    },
  });
}

export function AnimatedSplashScreen({ onAnimationComplete }: AnimatedSplashScreenProps) {
  const { width: screenW, height } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const logoSide = Math.min(280, Math.max(160, screenW * 0.5));
  const translateY = useRef(new Animated.Value(height * 0.28)).current;
  const scale = useRef(new Animated.Value(0.86)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 950,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 950,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 720,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(800),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 300,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    animation.start(({ finished }) => {
      if (finished) {
        onAnimationComplete();
      }
    });

    return () => animation.stop();
  }, [onAnimationComplete, opacity, scale, translateY]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoWrap,
          {
            width: logoSide,
            alignSelf: 'center',
            opacity,
            transform: [{ translateY }, { scale }],
          },
        ]}
      >
        <BrandLogo variant="hero" size={logoSide} />
        <Text style={styles.brandText}>DropYou</Text>
      </Animated.View>
    </View>
  );
}
