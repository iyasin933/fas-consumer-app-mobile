import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { forgotPasswordInitiate } from '@/api/modules/auth.api';
import { AuthFormScaffold } from '@/features/auth/components/AuthFormScaffold';
import { OtpCodeInput } from '@/features/auth/components/OtpCodeInput';
import {
  getPasswordRules,
  validateConfirmPassword,
  validatePassword,
} from '@/features/auth/utils/authValidation';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/shared/components/Button';
import { PasswordTextField } from '@/shared/components/PasswordTextField';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { toApiClientError } from '@/types/api.types';
import type { AuthStackParamList } from '@/types/navigation.types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;
type ResetPasswordField = 'otp' | 'password' | 'confirm';

const RESEND_SECONDS = 60;
const INITIAL_TOUCHED: Record<ResetPasswordField, boolean> = {
  otp: false,
  password: false,
  confirm: false,
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    phonePill: {
      alignSelf: 'center',
      borderRadius: 999,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    phone: {
      color: colors.textPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    muted: {
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center',
    },
    error: {
      color: colors.danger,
      fontSize: 14,
      lineHeight: 20,
    },
    fieldError: {
      color: colors.danger,
      fontSize: 13,
      lineHeight: 18,
    },
    success: {
      color: colors.primary,
      fontSize: 14,
      lineHeight: 20,
    },
    resendRow: {
      alignItems: 'center',
      gap: spacing.xs,
    },
    link: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: '700',
    },
    backWrap: {
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    passwordRules: {
      gap: 6,
      marginTop: -spacing.xs,
    },
    ruleText: {
      color: colors.textSecondary,
      fontSize: 13,
      lineHeight: 18,
    },
    ruleOk: {
      color: colors.primary,
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
  const [resending, setResending] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(RESEND_SECONDS);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState(INITIAL_TOUCHED);
  const [apiError, setApiError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const markTouched = (field: ResetPasswordField) => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  const passwordRules = useMemo(() => getPasswordRules(password), [password]);

  const errors = useMemo(
    () => ({
      otp: otp.trim().length === 6 ? null : 'Enter the 6-digit OTP code.',
      password: validatePassword(password),
      confirm: validateConfirmPassword(password, confirm),
    }),
    [confirm, otp, password],
  );

  const showError = (field: ResetPasswordField) =>
    submitted || touched[field] ? errors[field] : undefined;

  const isFormValid = Object.values(errors).every((fieldError) => !fieldError);

  useEffect(() => {
    if (secondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [secondsLeft]);

  const onResend = async () => {
    setApiError(null);
    setNotice(null);
    setResending(true);
    try {
      await forgotPasswordInitiate({ phone });
      setSecondsLeft(RESEND_SECONDS);
      setNotice('A new code has been sent.');
    } catch (e: unknown) {
      setApiError(toApiClientError(e).message);
    } finally {
      setResending(false);
    }
  };

  const onSubmit = async () => {
    setSubmitted(true);
    setApiError(null);
    setNotice(null);
    if (!isFormValid) return;
    setLoading(true);
    try {
      await completeForgotPassword({
        otp: otp.trim(),
        password,
        confirmPassword: confirm,
      });
      navigation.navigate('SignIn');
    } catch (e: unknown) {
      setApiError(toApiClientError(e).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormScaffold
      title="Set new password"
      subtitle="Enter the verification code and choose a new password for your account."
    >
      <View style={styles.phonePill}>
        <Text selectable style={styles.phone}>
          {phone}
        </Text>
      </View>

      <OtpCodeInput
        value={otp}
        onChangeText={(value) => {
          setApiError(null);
          setOtp(value);
          if (value.length > 0) markTouched('otp');
        }}
        disabled={loading}
      />
      {showError('otp') ? (
        <Text selectable style={styles.fieldError}>
          {showError('otp')}
        </Text>
      ) : null}

      <View style={styles.resendRow}>
        <Text style={styles.muted}>
          {secondsLeft > 0
            ? `You can resend in 00:${String(secondsLeft).padStart(2, '0')}`
            : 'Did not get the code?'}
        </Text>
        <Pressable
          accessibilityRole="button"
          disabled={secondsLeft > 0 || resending}
          hitSlop={10}
          onPress={() => void onResend()}
        >
          <Text
            style={[
              styles.link,
              (secondsLeft > 0 || resending) && { color: colors.muted },
            ]}
          >
            {resending ? 'Sending...' : 'Send again'}
          </Text>
        </Pressable>
      </View>

      <PasswordTextField
        label="New password"
        textContentType="newPassword"
        value={password}
        onBlur={() => markTouched('password')}
        onChangeText={(value) => {
          setApiError(null);
          setPassword(value);
          if (value.length > 0) markTouched('password');
        }}
        error={showError('password') ?? undefined}
      />
      {password ? (
        <View style={styles.passwordRules}>
          <Text style={[styles.ruleText, passwordRules.length && styles.ruleOk]}>
            At least 8 characters
          </Text>
          <Text style={[styles.ruleText, passwordRules.symbolOrNumber && styles.ruleOk]}>
            1 number or special character
          </Text>
        </View>
      ) : null}
      <PasswordTextField
        label="Confirm password"
        textContentType="newPassword"
        value={confirm}
        onBlur={() => markTouched('confirm')}
        onChangeText={(value) => {
          setApiError(null);
          setConfirm(value);
          if (value.length > 0) markTouched('confirm');
        }}
        error={showError('confirm') ?? undefined}
        returnKeyType="done"
        onSubmitEditing={() => void onSubmit()}
      />

      {notice ? (
        <Text selectable style={styles.success}>
          {notice}
        </Text>
      ) : null}
      {apiError ? (
        <Text selectable style={styles.error}>
          {apiError}
        </Text>
      ) : null}

      <Button
        title="Update password"
        onPress={() => void onSubmit()}
        loading={loading}
        disabled={submitted && !isFormValid}
      />

      <Pressable
        onPress={() => navigation.navigate('SignIn')}
        style={styles.backWrap}
        accessibilityRole="button"
        hitSlop={12}
      >
        <Text style={styles.link}>Back to sign in</Text>
      </Pressable>
    </AuthFormScaffold>
  );
}
