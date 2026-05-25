import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type EmptyStateAction = {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
};

type Props = {
  eyebrow?: string;
  title: string;
  body: string;
  icon?: keyof typeof Ionicons.glyphMap;
  accent?: string;
  primaryAction?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  meta?: string;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

function createStyles(
  colors: ThemeColors,
  width: number,
  accent: string,
  compact?: boolean,
) {
  const narrow = width < 380;
  const isCompact = compact || narrow;

  return StyleSheet.create({
    wrap: {
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      width: '100%',
      maxWidth: 390,
      borderRadius: 20,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      padding: isCompact ? spacing.md : spacing.lg,
      alignItems: 'center',
      overflow: 'hidden',
      shadowColor: '#0f172a',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.08,
      shadowRadius: 28,
      elevation: 4,
    },
    art: {
      width: isCompact ? 124 : 142,
      height: isCompact ? 88 : 96,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    routeLine: {
      position: 'absolute',
      left: 16,
      right: 16,
      height: 5,
      borderRadius: 999,
      backgroundColor: accent + '22',
      transform: [{ rotate: '-10deg' }],
    },
    routeDash: {
      position: 'absolute',
      left: 44,
      right: 44,
      height: 2,
      borderRadius: 999,
      backgroundColor: accent + '66',
      transform: [{ rotate: '-10deg' }],
    },
    pin: {
      position: 'absolute',
      left: 16,
      top: 34,
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: ROUTE_PICKUP,
      borderWidth: 3,
      borderColor: colors.surface,
    },
    flag: {
      position: 'absolute',
      right: 16,
      bottom: 26,
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: ROUTE_DROPOFF,
      borderWidth: 3,
      borderColor: colors.surface,
    },
    iconBubble: {
      width: 62,
      height: 62,
      borderRadius: 22,
      backgroundColor: accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 5,
      borderColor: colors.surface,
      shadowColor: accent,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.24,
      shadowRadius: 16,
      elevation: 5,
    },
    eyebrow: {
      color: accent,
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '900',
      textTransform: 'uppercase',
      letterSpacing: 0.4,
      textAlign: 'center',
      marginBottom: 2,
    },
    title: {
      color: colors.textPrimary,
      fontSize: isCompact ? 20 : 22,
      lineHeight: isCompact ? 25 : 28,
      fontWeight: '900',
      textAlign: 'center',
      letterSpacing: 0,
    },
    body: {
      marginTop: spacing.xs,
      color: colors.textSecondary,
      fontSize: typography.fontSize.md,
      lineHeight: 22,
      textAlign: 'center',
      maxWidth: 300,
    },
    meta: {
      marginTop: spacing.sm,
      borderRadius: 999,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.textSecondary,
      fontSize: typography.fontSize.xs,
      fontWeight: '800',
      textAlign: 'center',
      overflow: 'hidden',
    },
    actions: {
      width: '100%',
      marginTop: spacing.md,
      gap: spacing.sm,
    },
    primaryButton: {
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: accent,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    primaryPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.985 }],
    },
    secondaryButton: {
      minHeight: 48,
      borderRadius: 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    secondaryPressed: {
      backgroundColor: colors.background,
      transform: [{ scale: 0.985 }],
    },
    primaryText: {
      color: colors.onPrimary,
      fontSize: typography.fontSize.md,
      fontWeight: '900',
    },
    secondaryText: {
      color: colors.textPrimary,
      fontSize: typography.fontSize.md,
      fontWeight: '800',
    },
  });
}

const ROUTE_PICKUP = '#16A34A';
const ROUTE_DROPOFF = '#2563EB';

export function InteractiveEmptyState({
  eyebrow,
  title,
  body,
  icon = 'cube-outline',
  accent: accentProp,
  primaryAction,
  secondaryAction,
  meta,
  compact,
  style,
}: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const accent = accentProp ?? colors.primary;
  const float = useRef(new Animated.Value(0)).current;
  const styles = useMemo(
    () => createStyles(colors, width, accent, compact),
    [accent, colors, compact, width],
  );

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(float, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(float, {
          toValue: 0,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [float]);

  const animatedStyle = {
    transform: [
      {
        translateY: float.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -8],
        }),
      },
    ],
  };

  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.card}>
        <View style={styles.art} pointerEvents="none">
          <View style={styles.routeLine} />
          <View style={styles.routeDash} />
          <View style={styles.pin}>
            <Ionicons name="location" size={16} color={colors.onPrimary} />
          </View>
          <View style={styles.flag}>
            <Ionicons name="flag" size={15} color={colors.onPrimary} />
          </View>
          <Animated.View style={[styles.iconBubble, animatedStyle]}>
            <Ionicons name={icon} size={34} color={colors.onPrimary} />
          </Animated.View>
        </View>

        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}

        {primaryAction || secondaryAction ? (
          <View style={styles.actions}>
            {primaryAction ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={primaryAction.label}
                disabled={primaryAction.disabled || primaryAction.loading}
                onPress={primaryAction.onPress}
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.primaryPressed,
                  (primaryAction.disabled || primaryAction.loading) && { opacity: 0.72 },
                ]}
              >
                {primaryAction.loading ? (
                  <ActivityIndicator size="small" color={colors.onPrimary} />
                ) : (
                  <Ionicons
                    name={primaryAction.icon ?? 'arrow-forward'}
                    size={18}
                    color={colors.onPrimary}
                  />
                )}
                <Text style={styles.primaryText}>{primaryAction.label}</Text>
              </Pressable>
            ) : null}

            {secondaryAction ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={secondaryAction.label}
                disabled={secondaryAction.disabled || secondaryAction.loading}
                onPress={secondaryAction.onPress}
                style={({ pressed }) => [
                  styles.secondaryButton,
                  pressed && styles.secondaryPressed,
                  (secondaryAction.disabled || secondaryAction.loading) && {
                    opacity: 0.72,
                  },
                ]}
              >
                {secondaryAction.loading ? (
                  <ActivityIndicator size="small" color={colors.textPrimary} />
                ) : (
                  <Ionicons
                    name={secondaryAction.icon ?? 'refresh'}
                    size={18}
                    color={colors.textPrimary}
                  />
                )}
                <Text style={styles.secondaryText}>{secondaryAction.label}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
