import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import {
  Image,
  type ImageSourcePropType,
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

type Props = {
  eyebrow?: string;
  title: string;
  body?: string;
  code?: string;
  accent?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  imageSource?: ImageSourcePropType;
  artLabel?: string;
  actionLabel?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  footer?: ReactNode;
  selected?: boolean;
  disabled?: boolean;
  transparentArt?: boolean;
  imageBubbleBackgroundColor?: string;
  hideGlow?: boolean;
  hideArtPin?: boolean;
  hideArtArrow?: boolean;
  hideArt?: boolean;
  onPress?: () => void;
  onActionPress?: () => void;
  containerStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

function createStyles(
  colors: ThemeColors,
  width: number,
  accent: string,
  selected: boolean,
  transparentArt: boolean,
  hideGlow: boolean,
  imageBubbleBackgroundColor?: string,
) {
  const compact = width < 370;

  return StyleSheet.create({
    card: {
      minHeight: compact ? 216 : 168,
      borderRadius: 18,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: selected ? 2 : 1,
      borderColor: selected ? accent : colors.border,
      overflow: 'hidden',
      flexDirection: compact ? 'column' : 'row',
      alignItems: compact ? 'flex-start' : 'center',
      gap: spacing.md,
    },
    cardPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.99 }],
    },
    copy: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xs,
      zIndex: 2,
    },
    eyebrow: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      paddingHorizontal: spacing.sm,
      paddingVertical: 5,
      backgroundColor: accent + '14',
      color: accent,
      fontSize: 12,
      fontWeight: typography.fontWeight.bold,
      overflow: 'hidden',
    },
    title: {
      color: colors.textPrimary,
      fontSize: compact ? typography.fontSize.md : typography.fontSize.lg,
      lineHeight: compact ? 22 : 25,
      fontWeight: typography.fontWeight.bold,
      marginTop: spacing.xs,
    },
    body: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.sm,
      lineHeight: 19,
      maxWidth: 276,
    },
    code: {
      alignSelf: 'flex-start',
      marginTop: spacing.xs,
      borderRadius: 10,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.textPrimary,
      fontSize: typography.fontSize.sm,
      fontWeight: '800',
      overflow: 'hidden',
    },
    actionButton: {
      alignSelf: 'flex-start',
      marginTop: spacing.xs,
      minHeight: 44,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      backgroundColor: accent,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    actionButtonPressed: {
      backgroundColor: colors.primaryPressed,
      transform: [{ scale: 0.98 }],
    },
    actionText: {
      color: colors.onPrimary,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.bold,
    },
    art: {
      width: compact ? '100%' : 108,
      minHeight: compact ? 76 : 108,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: compact ? 'stretch' : 'center',
    },
    artPanel: {
      width: compact ? '100%' : 108,
      height: compact ? 76 : 108,
      borderRadius: transparentArt ? 0 : 22,
      backgroundColor: transparentArt ? 'transparent' : accent + '0F',
      borderWidth: 1,
      borderColor: transparentArt ? 'transparent' : accent + '22',
      overflow: transparentArt ? 'visible' : 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    artPanelWithLabel: {
      paddingBottom: 18,
    },
    routeLine: {
      position: 'absolute',
      left: -8,
      right: -8,
      top: compact ? 39 : 58,
      height: 4,
      borderRadius: 99,
      backgroundColor: transparentArt ? 'transparent' : accent + '33',
      transform: [{ rotate: compact ? '-4deg' : '-18deg' }],
    },
    pinBubble: {
      position: 'absolute',
      left: compact ? '20%' : 10,
      top: compact ? 20 : 26,
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.surface,
    },
    iconBubble: {
      width: compact ? 56 : 64,
      height: compact ? 56 : 64,
      borderRadius: compact ? 20 : 23,
      backgroundColor: imageBubbleBackgroundColor ?? accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 3,
    },
    artImage: {
      width: transparentArt ? (compact ? 82 : 96) : compact ? 42 : 48,
      height: transparentArt ? (compact ? 56 : 66) : compact ? 42 : 48,
    },
    arrowBubble: {
      position: 'absolute',
      right: compact ? '20%' : 10,
      bottom: compact ? 15 : 20,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.primaryPressed,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.surface,
    },
    glow: {
      position: 'absolute',
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: transparentArt || hideGlow ? 'transparent' : accent + '10',
      right: -58,
      bottom: -70,
    },
    artLabel: {
      position: 'absolute',
      left: 8,
      right: 8,
      bottom: 8,
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 14,
      fontWeight: typography.fontWeight.bold,
      textAlign: 'center',
    },
  });
}

export function IllustratedActionCard({
  eyebrow,
  title,
  body,
  code,
  accent: accentProp,
  iconName = 'cube',
  imageSource,
  artLabel,
  actionLabel,
  actionIcon = 'arrow-forward',
  footer,
  selected = false,
  disabled = false,
  transparentArt = false,
  imageBubbleBackgroundColor,
  hideGlow = false,
  hideArtPin = false,
  hideArtArrow = false,
  hideArt = false,
  onPress,
  onActionPress,
  containerStyle,
  accessibilityLabel,
}: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const accent = accentProp ?? colors.primary;
  const styles = useMemo(
    () =>
      createStyles(
        colors,
        width,
        accent,
        selected,
        transparentArt,
        hideGlow,
        imageBubbleBackgroundColor,
      ),
    [accent, colors, hideGlow, imageBubbleBackgroundColor, selected, transparentArt, width],
  );

  const content = (
    <>
      <View style={styles.glow} pointerEvents="none" />
      <View style={styles.copy}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        {body ? <Text style={styles.body}>{body}</Text> : null}
        {code ? <Text style={styles.code}>CODE: {code}</Text> : null}
        {actionLabel ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={actionLabel}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            onPress={onActionPress ?? onPress}
            disabled={disabled}
            style={({ pressed }) => [
              styles.actionButton,
              pressed && styles.actionButtonPressed,
            ]}
          >
            <Ionicons name={actionIcon} size={18} color={colors.onPrimary} />
            <Text style={styles.actionText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
        {footer}
      </View>
      {hideArt ? null : (
        <View style={styles.art} pointerEvents="none">
          {transparentArt ? (
            imageSource ? (
              <Image
                source={imageSource}
                style={styles.artImage}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
              />
            ) : (
              <Ionicons name={iconName} size={38} color={accent} />
            )
          ) : (
            <View style={[styles.artPanel, artLabel && styles.artPanelWithLabel]}>
              <View style={styles.routeLine} />
              {hideArtPin ? null : (
                <View style={styles.pinBubble}>
                  <Ionicons name="location" size={18} color={colors.onPrimary} />
                </View>
              )}
              <View style={styles.iconBubble}>
                {imageSource ? (
                  <Image
                    source={imageSource}
                    style={styles.artImage}
                    resizeMode="contain"
                    accessibilityIgnoresInvertColors
                  />
                ) : (
                  <Ionicons name={iconName} size={31} color="#ffffff" />
                )}
              </View>
              {hideArtArrow ? null : (
                <View style={styles.arrowBubble}>
                  <Ionicons name="arrow-forward" size={17} color="#ffffff" />
                </View>
              )}
              {artLabel ? (
                <Text style={styles.artLabel} numberOfLines={1}>
                  {artLabel}
                </Text>
              ) : null}
            </View>
          )}
        </View>
      )}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? title}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.card,
          containerStyle,
          pressed && styles.cardPressed,
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return (
    <View
      style={[styles.card, containerStyle]}
      accessibilityLabel={accessibilityLabel ?? title}
    >
      {content}
    </View>
  );
}
