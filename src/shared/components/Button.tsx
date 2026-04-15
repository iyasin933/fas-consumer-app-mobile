import { ReactNode, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';

type ButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'outline';
  style?: ViewStyle;
  leftAccessory?: ReactNode;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    base: {
      minHeight: 52,
      borderRadius: 12,
      paddingHorizontal: 20,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 10,
    },
    primary: {
      backgroundColor: colors.primary,
    },
    outline: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border,
    },
    pressed: {
      opacity: 0.92,
    },
    disabled: {
      opacity: 0.55,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
    },
    labelPrimary: {
      color: colors.onPrimary,
    },
    labelOutline: {
      color: colors.textPrimary,
    },
  });
}

export function Button({
  title,
  onPress,
  disabled,
  loading,
  variant = 'primary',
  style,
  leftAccessory,
}: ButtonProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isPrimary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.outline,
        pressed && !disabled && styles.pressed,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isPrimary ? colors.onPrimary : colors.primary} />
      ) : (
        <>
          {leftAccessory}
          <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelOutline]}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}
