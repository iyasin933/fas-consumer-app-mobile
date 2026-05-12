import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useCallback, useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { HOME_PROMO_ILLUSTRATION } from '@/features/home/utils/homeScreenArtAssets';
import { useHomePromo } from '@/features/home/hooks/useHomePromo';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import type { MainTabParamList } from '@/types/navigation.types';

function createStyles(colors: ThemeColors, width: number) {
  const isNarrow = width < 370;
  const artSlot = isNarrow ? 70 : 90;
  const artWidth = isNarrow ? 88 : 112;
  const artHeight = isNarrow ? 100 : 126;
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
      gap: isNarrow ? spacing.sm : spacing.md,
      overflow: 'visible',
    },
    copy: { flex: 1, gap: spacing.sm },
    title: {
      color: colors.onPrimary,
      fontSize: isNarrow ? typography.fontSize.md : typography.fontSize.lg,
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
      width: artSlot,
      height: artSlot,
      overflow: 'visible',
    },
    artBurst: {
      position: 'absolute',
      /** Centers a wider bitmap on the 88px-wide slot: (88 − 112) / 2 */
      left: (artSlot - artWidth) / 2,
      bottom: isNarrow ? -12 : -18,
      width: artWidth,
      height: artHeight,
    },
    artImage: { width: '100%', height: '100%' },
  });
}

export function HomePromoBanner() {
  const { title, cta } = useHomePromo();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors, width), [colors, width]);
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
