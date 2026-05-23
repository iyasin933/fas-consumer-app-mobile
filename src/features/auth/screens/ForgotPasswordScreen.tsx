import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { forgotPasswordInitiate } from '@/api/modules/auth.api';
import { AuthFormScaffold } from '@/features/auth/components/AuthFormScaffold';
import {
  AuthPhoneNumberField,
  normalizePhoneNumber,
} from '@/features/auth/components/AuthPhoneNumberField';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/shared/components/Button';
import type { ThemeColors } from '@/shared/theme/colors';
import { toApiClientError } from '@/types/api.types';
import type { AuthStackParamList } from '@/types/navigation.types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    error: {
      color: colors.danger,
      fontSize: 14,
      lineHeight: 20,
    },
  });
}

export function ForgotPasswordScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [countryCode, setCountryCode] = useState('GB');
  const [dialCode, setDialCode] = useState('+44');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const normalized = useMemo(
    () => normalizePhoneNumber(countryCode, dialCode, phoneLocal),
    [countryCode, dialCode, phoneLocal],
  );
  const phoneError = submitted || phoneTouched ? normalized.error : undefined;

  const onSubmit = async () => {
    setSubmitted(true);
    setApiError(null);
    if (!normalized.phone) {
      return;
    }
    setLoading(true);
    try {
      await forgotPasswordInitiate({ phone: normalized.phone });
      navigation.navigate('ResetPassword', { phone: normalized.phone });
    } catch (e: unknown) {
      setApiError(toApiClientError(e).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormScaffold
      title="Forgot password"
      subtitle="Enter the phone number linked to your DropYou account. We will send a one-time code."
    >
      <AuthPhoneNumberField
        countryCode={countryCode}
        dialCode={dialCode}
        localNumber={phoneLocal}
        onBlur={() => setPhoneTouched(true)}
        onChangeCountryCode={(value) => {
          setApiError(null);
          setCountryCode(value);
          setPhoneTouched(true);
        }}
        onChangeDialCode={setDialCode}
        onChangeLocalNumber={(value) => {
          setApiError(null);
          setPhoneLocal(value);
        }}
        error={phoneError ?? undefined}
        returnKeyType="done"
        onSubmitEditing={() => void onSubmit()}
      />

      {apiError ? (
        <Text selectable style={styles.error}>
          {apiError}
        </Text>
      ) : null}

      <Button
        title="Send OTP"
        onPress={() => void onSubmit()}
        loading={loading}
        disabled={submitted && !normalized.phone}
      />
    </AuthFormScaffold>
  );
}
