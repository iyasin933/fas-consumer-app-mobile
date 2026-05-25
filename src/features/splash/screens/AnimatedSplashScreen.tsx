import { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { BrandLogo } from '@/shared/components/BrandLogo';
import type { ThemeColors } from '@/shared/theme/colors';

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
      justifyContent: 'center',
    },
  });
}

export function AnimatedSplashScreen({ onAnimationComplete }: AnimatedSplashScreenProps) {
  const { width: screenW, height } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const logoSize = Math.min(220, Math.max(148, screenW * 0.42));
  const translateY = useRef(new Animated.Value(height * 0.28)).current;
  const scale = useRef(new Animated.Value(0.86)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const intro = Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 850,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 850,
        easing: Easing.out(Easing.back(1.04)),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 620,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    const breath = Animated.sequence([
      Animated.timing(scale, {
        toValue: 1.035,
        duration: 900,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 1,
        duration: 900,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true,
      }),
    ]);

    const animation = Animated.sequence([
      intro,
      breath,
      Animated.delay(250),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 320,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.985,
          duration: 320,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start(({ finished }) => {
      if (finished) {
        onAnimationComplete();
      }
    });

    return () => {
      animation.stop();
    };
  }, [onAnimationComplete, opacity, scale, translateY]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoWrap,
          {
            width: logoSize,
            height: logoSize + 48,
            alignSelf: 'center',
            opacity,
            transform: [{ translateY }, { scale }],
          },
        ]}
      >
        <BrandLogo variant="hero" size={logoSize} />
      </Animated.View>
    </View>
  );
}
