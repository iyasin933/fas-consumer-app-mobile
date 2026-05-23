import { createRef, useMemo, useRef } from 'react';
import {
  NativeSyntheticEvent,
  StyleSheet,
  TextInput,
  TextInputKeyPressEventData,
  View,
  useWindowDimensions,
} from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';

type OtpCodeInputProps = {
  value: string;
  onChangeText: (value: string) => void;
  length?: number;
  disabled?: boolean;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      alignSelf: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing.xs,
    },
    box: {
      height: 56,
      borderRadius: 14,
      borderCurve: 'continuous',
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      color: colors.textPrimary,
      fontSize: 22,
      fontWeight: '700',
      textAlign: 'center',
      fontVariant: ['tabular-nums'],
    },
    boxFilled: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}14`,
    },
    boxFocused: {
      borderColor: colors.primary,
    },
  });
}

export function OtpCodeInput({
  value,
  onChangeText,
  length = 6,
  disabled,
}: OtpCodeInputProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const refs = useRef(Array.from({ length }, () => createRef<TextInput>())).current;
  const digits = value.padEnd(length).slice(0, length).split('');
  const boxSize = Math.min(
    58,
    Math.max(44, (Math.min(width, 430) - spacing.lg * 4) / length),
  );

  const setDigit = (index: number, text: string) => {
    const numeric = text.replace(/\D/g, '');
    const nextDigits = digits.map((digit) => digit.trim());

    if (numeric.length > 1) {
      onChangeText(numeric.slice(0, length));
      refs[Math.min(numeric.length, length) - 1]?.current?.focus();
      return;
    }

    nextDigits[index] = numeric;
    onChangeText(nextDigits.join('').slice(0, length));
    if (numeric && index < length - 1) refs[index + 1]?.current?.focus();
  };

  const onKeyPress = (
    index: number,
    event: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) => {
    if (event.nativeEvent.key !== 'Backspace' || digits[index].trim()) return;
    if (index > 0) refs[index - 1]?.current?.focus();
  };

  return (
    <View style={styles.row}>
      {digits.map((digit, index) => (
        <TextInput
          key={index}
          ref={refs[index]}
          accessibilityLabel={`OTP digit ${index + 1}`}
          autoComplete="sms-otp"
          editable={!disabled}
          inputMode="numeric"
          keyboardType="number-pad"
          maxLength={index === 0 ? length : 1}
          onChangeText={(text) => setDigit(index, text)}
          onKeyPress={(event) => onKeyPress(index, event)}
          selectTextOnFocus
          style={[styles.box, { width: boxSize }, digit.trim() ? styles.boxFilled : null]}
          value={digit.trim()}
        />
      ))}
    </View>
  );
}
