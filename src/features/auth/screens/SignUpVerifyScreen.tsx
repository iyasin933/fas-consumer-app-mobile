import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';

import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import type { AuthStackParamList } from '@/types/navigation.types';
import { toApiClientError } from '@/types/api.types';
import { Button } from '@/shared/components/Button';
import { TextField } from '@/shared/components/TextField';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUpVerify'>;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    scroll: {
      padding: spacing.lg,
      gap: spacing.md,
    },
    copy: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    error: { color: colors.danger, fontSize: 14 },
  });
}

export function SignUpVerifyScreen({ route }: Props) {
  const { verifySignupOtp } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const phone = route.params.phone;

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    const code = otp.trim();
    if (!code) {
      setError('Enter the OTP sent to your phone.');
      return;
    }
    setLoading(true);
    try {
      await verifySignupOtp({ phone, otp: code });
    } catch (e: unknown) {
      setError(toApiClientError(e).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.copy}>
          Enter the verification code sent to your phone ({phone}).
        </Text>

        <TextField
          label="OTP"
          keyboardType="number-pad"
          value={otp}
          onChangeText={setOtp}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          title="Verify & continue"
          onPress={() => void onSubmit()}
          loading={loading}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
