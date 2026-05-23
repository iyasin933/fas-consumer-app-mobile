import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import parsePhoneNumberFromString, { type CountryCode } from 'libphonenumber-js';

import {
  countryCodeToFlag,
  DialCodePickerModal,
} from '@/features/delivery/components/DialCodePickerModal';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';

type AuthPhoneNumberFieldProps = {
  countryCode: string;
  dialCode: string;
  localNumber: string;
  onChangeCountryCode: (countryCode: string) => void;
  onChangeDialCode: (dialCode: string) => void;
  onChangeLocalNumber: (localNumber: string) => void;
  label?: string;
  placeholder?: string;
  error?: string;
  returnKeyType?: 'done' | 'next';
  onBlur?: TextInputProps['onBlur'];
  onSubmitEditing?: () => void;
};

export function normalizePhoneNumber(
  countryCode: string,
  dialCode: string,
  localNumber: string,
) {
  const dial = dialCode.trim() || '+44';
  const local = localNumber.trim();
  if (!local) {
    return { phone: '', error: 'Enter the phone number for your account.' };
  }

  const raw = local.startsWith('+') ? local : `${dial}${local.replace(/[^\d]/g, '')}`;
  const parsed = parsePhoneNumberFromString(raw, countryCode as CountryCode);
  if (!parsed?.isValid()) {
    return { phone: '', error: 'Enter a valid phone number for the selected country.' };
  }

  return { phone: parsed.number, error: null };
}

function sanitizePhoneLocalInput(value: string) {
  const startsWithPlus = value.trimStart().startsWith('+');
  const digits = value.replace(/[^\d]/g, '');
  return startsWithPlus ? `+${digits}` : digits;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      gap: 6,
      marginBottom: 4,
    },
    label: {
      color: colors.textSecondary,
      fontSize: 14,
      fontWeight: '500',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    dialButton: {
      minHeight: 52,
      minWidth: 118,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      borderCurve: 'continuous',
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.md,
    },
    fieldError: {
      borderColor: colors.danger,
    },
    dialLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    flag: {
      fontSize: 22,
    },
    dialText: {
      color: colors.textPrimary,
      fontSize: 16,
      fontWeight: '700',
      fontVariant: ['tabular-nums'],
    },
    chevron: {
      color: colors.muted,
      fontSize: 14,
      fontWeight: '700',
    },
    input: {
      flex: 1,
      minHeight: 52,
      minWidth: 0,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      borderCurve: 'continuous',
      paddingHorizontal: 16,
      fontSize: 16,
      color: colors.textPrimary,
      backgroundColor: colors.surface,
    },
    error: {
      color: colors.danger,
      fontSize: 13,
      lineHeight: 18,
    },
  });
}

export function AuthPhoneNumberField({
  countryCode,
  dialCode,
  localNumber,
  onChangeCountryCode,
  onChangeDialCode,
  onChangeLocalNumber,
  label = 'Phone number',
  placeholder = 'Phone number',
  error,
  returnKeyType,
  onBlur,
  onSubmitEditing,
}: AuthPhoneNumberFieldProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [pickerVisible, setPickerVisible] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose country code"
          hitSlop={8}
          onPress={() => setPickerVisible(true)}
          style={[styles.dialButton, error ? styles.fieldError : null]}
        >
          <View style={styles.dialLeft}>
            <Text style={styles.flag}>{countryCodeToFlag(countryCode)}</Text>
            <Text style={styles.dialText}>{dialCode}</Text>
          </View>
          <Text style={styles.chevron}>▾</Text>
        </Pressable>
        <TextInput
          autoComplete="tel"
          keyboardType="phone-pad"
          onBlur={onBlur}
          onChangeText={(value) => onChangeLocalNumber(sanitizePhoneLocalInput(value))}
          onSubmitEditing={onSubmitEditing}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          returnKeyType={returnKeyType}
          style={[styles.input, error ? styles.fieldError : null]}
          textContentType="telephoneNumber"
          value={localNumber}
        />
      </View>
      {error ? (
        <Text selectable style={styles.error}>
          {error}
        </Text>
      ) : null}
      <DialCodePickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        selectedCode={countryCode}
        onPickDial={(nextDialCode, nextCountryCode) => {
          onChangeDialCode(nextDialCode);
          if (nextCountryCode) onChangeCountryCode(nextCountryCode);
        }}
      />
    </View>
  );
}
