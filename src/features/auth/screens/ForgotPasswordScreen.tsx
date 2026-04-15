import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';

import { forgotPasswordInitiate } from '@/api/modules/auth.api';
import { useTheme } from '@/hooks/useTheme';
import type { AuthStackParamList } from '@/types/navigation.types';
import { toApiClientError } from '@/types/api.types';
import { Button } from '@/shared/components/Button';
import { TextField } from '@/shared/components/TextField';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

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
      marginBottom: spacing.sm,
    },
    error: { color: colors.danger, fontSize: 14 },
  });
}

export function ForgotPasswordScreen({ navigation }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onSubmit = async () => {
    setError(null);
    const p = phone.trim();
    if (!p) {
      setError('Enter the phone number for your account.');
      return;
    }
    setLoading(true);
    try {
      await forgotPasswordInitiate({ phone: p });
      navigation.navigate('ResetPassword', { phone: p });
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
          We&apos;ll send a one-time code to your phone number so you can set a new
          password.
        </Text>

        <TextField
          label="Phone"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          placeholder="+44 ..."
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button title="Send OTP" onPress={() => void onSubmit()} loading={loading} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
