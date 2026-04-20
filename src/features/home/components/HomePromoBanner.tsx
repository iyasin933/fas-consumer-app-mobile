import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useCallback, useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { HOME_PROMO_ILLUSTRATION } from '@/features/home/utils/homeScreenArtAssets';
import { useHomePromo } from '@/features/home/hooks/useHomePromo';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import type { MainTabParamList } from '@/types/navigation.types';

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.lg,
    },
    card: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      overflow: 'visible',
    },
    copy: { flex: 1, gap: spacing.sm },
    title: {
      color: colors.onPrimary,
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      lineHeight: 26,
    },
    cta: {
      alignSelf: 'flex-start',
      backgroundColor: 'rgba(15,23,42,0.85)',
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: 10,
    },
    ctaText: {
      color: colors.onPrimary,
      fontWeight: typography.fontWeight.bold,
      fontSize: typography.fontSize.sm,
    },
    /** Fixed 88×88 layout column only; larger art draws below via `artBurst`. */
    art: {
      position: 'relative',
      width: 90,
      height: 90,
      overflow: 'visible',
    },
    artBurst: {
      position: 'absolute',
      /** Centers a wider bitmap on the 88px-wide slot: (88 − 112) / 2 */
      left: -12,
      bottom: -18,
      width: 112,
      height: 126,
    },
    artImage: { width: '100%', height: '100%' },
  });
}

export function HomePromoBanner() {
  const { title, cta } = useHomePromo();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();

  const onStartNow = useCallback(() => {
    navigation.navigate('Map', { initialSnapIndex: 1 });
  }, [navigation]);

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.copy}>
          <Text style={styles.title}>{title}</Text>
          <Pressable
            style={styles.cta}
            accessibilityRole="button"
            accessibilityLabel={cta}
            onPress={onStartNow}
          >
            <Text style={styles.ctaText}>{cta}</Text>
          </Pressable>
        </View>
        <View style={styles.art} accessibilityLabel="Delivery illustration">
          <View style={styles.artBurst}>
            <Image
              source={HOME_PROMO_ILLUSTRATION}
              style={styles.artImage}
              resizeMode="contain"
              accessibilityIgnoresInvertColors
            />
          </View>
        </View>
      </View>
    </View>
  );
}
