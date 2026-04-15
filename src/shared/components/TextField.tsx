import { ReactNode, useMemo } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  rightAccessory?: ReactNode;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      gap: 6,
      marginBottom: 4,
    },
    label: {
      fontSize: 14,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    input: {
      flex: 1,
      minHeight: 52,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      fontSize: 16,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
    },
    inputError: {
      borderColor: colors.danger,
    },
    error: {
      fontSize: 13,
      color: colors.danger,
    },
  });
}

export function TextField({
  label,
  error,
  rightAccessory,
  style,
  ...rest
}: TextFieldProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TextInput
          placeholderTextColor={colors.muted}
          style={[styles.input, error ? styles.inputError : null, style]}
          {...rest}
        />
        {rightAccessory}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}
