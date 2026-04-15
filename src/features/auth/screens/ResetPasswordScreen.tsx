import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
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

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    scroll: {
      padding: spacing.lg,
      gap: spacing.sm,
    },
    meta: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: spacing.sm,
    },
    error: { color: colors.danger, fontSize: 14, marginTop: spacing.xs },
    backWrap: {
      marginTop: spacing.lg,
      alignItems: 'center',
    },
    back: {
      color: colors.primary,
      fontWeight: '600',
      fontSize: 15,
    },
  });
}

export function ResetPasswordScreen({ route, navigation }: Props) {
  const { completeForgotPassword } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const phone = route.params.phone;

  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!otp.trim() || !password || !confirm) {
      setError('Fill in OTP and both password fields.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await completeForgotPassword({
        otp: otp.trim(),
        password,
        confirmPassword: confirm,
      });
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
        <Text style={styles.meta}>Phone: {phone}</Text>

        <TextField
          label="OTP code"
          keyboardType="number-pad"
          value={otp}
          onChangeText={setOtp}
        />
        <TextField
          label="New password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TextField
          label="Confirm password"
          secureTextEntry
          value={confirm}
          onChangeText={setConfirm}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          title="Update password"
          onPress={() => void onSubmit()}
          loading={loading}
        />

        <Pressable onPress={() => navigation.navigate('SignIn')} style={styles.backWrap}>
          <Text style={styles.back}>Back to sign in</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
