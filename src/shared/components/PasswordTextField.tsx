import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, type TextInputProps } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { TextField } from '@/shared/components/TextField';
import type { ThemeColors } from '@/shared/theme/colors';

type PasswordTextFieldProps = Omit<TextInputProps, 'secureTextEntry'> & {
  label: string;
  error?: string;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    toggle: {
      position: 'absolute',
      right: 14,
      height: 44,
      width: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    icon: {
      color: colors.textSecondary,
    },
  });
}

export function PasswordTextField({
  label,
  error,
  style,
  ...props
}: PasswordTextFieldProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [visible, setVisible] = useState(false);

  return (
    <TextField
      {...props}
      label={label}
      error={error}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      style={[{ paddingRight: 58 }, style]}
      rightAccessory={
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          hitSlop={8}
          onPress={() => setVisible((current) => !current)}
          style={styles.toggle}
        >
          <Ionicons
            name={visible ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            style={styles.icon}
          />
        </Pressable>
      }
    />
  );
}
