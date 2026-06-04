import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthFormScaffold } from '@/features/auth/components/AuthFormScaffold';
import { OtpCodeInput } from '@/features/auth/components/OtpCodeInput';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/shared/components/Button';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { toApiClientError } from '@/types/api.types';
import type { RootStackParamList } from '@/types/navigation.types';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUpVerify'>;

const RESEND_SECONDS = 60;
const OTP_LENGTH = 6;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    cardContent: {
      minHeight: 520,
      justifyContent: 'center',
      gap: spacing.lg,
    },
    centeredStack: {
      alignItems: 'center',
      gap: spacing.lg,
    },
    otpSection: {
      width: '100%',
      alignItems: 'center',
      gap: spacing.sm,
    },
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: 15,
      fontWeight: '700',
      textAlign: 'center',
    },
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
    success: {
      color: colors.primary,
      fontSize: 14,
      lineHeight: 20,
    },
    resendRow: {
      alignItems: 'center',
      gap: spacing.xs,
    },
    statusSlot: {
      minHeight: 20,
      justifyContent: 'center',
    },
    link: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: '700',
    },
  });
}

export function SignUpVerifyScreen({ navigation, route }: Props) {
  const {
    verifySignupOtp,
    verifySignupEmailOtp,
    resendSignupOtp,
    resendSignupEmailOtp,
    signInWithPassword,
  } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const phone = route.params.phone;
  const email = route.params.email;
  const password = route.params.password;
  const returnTo = route.params.returnTo;

  const [phoneOtp, setPhoneOtp] = useState('');
  const [emailOtp, setEmailOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendingPhone, setResendingPhone] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [phoneSecondsLeft, setPhoneSecondsLeft] = useState(RESEND_SECONDS);
  const [emailSecondsLeft, setEmailSecondsLeft] = useState(RESEND_SECONDS);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (phoneSecondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setPhoneSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [phoneSecondsLeft]);

  useEffect(() => {
    if (emailSecondsLeft <= 0) return undefined;
    const timer = setTimeout(() => setEmailSecondsLeft((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [emailSecondsLeft]);

  const isReadyToVerify =
    phoneOtp.trim().length === OTP_LENGTH && emailOtp.trim().length === OTP_LENGTH;

  const onResendPhone = async () => {
    setError(null);
    setNotice(null);
    setResendingPhone(true);
    try {
      await resendSignupOtp(phone);
      setPhoneSecondsLeft(RESEND_SECONDS);
      setNotice('A new phone code has been sent.');
    } catch (e: unknown) {
      setError(toApiClientError(e).message);
    } finally {
      setResendingPhone(false);
    }
  };

  const onResendEmail = async () => {
    setError(null);
    setNotice(null);
    setResendingEmail(true);
    try {
      await resendSignupEmailOtp(email);
      setEmailSecondsLeft(RESEND_SECONDS);
      setNotice('A new email code has been sent.');
    } catch (e: unknown) {
      setError(toApiClientError(e).message);
    } finally {
      setResendingEmail(false);
    }
  };

  const onSubmit = async () => {
    setError(null);
    setNotice(null);
    const phoneCode = phoneOtp.trim();
    const emailCode = emailOtp.trim();
    if (phoneCode.length !== OTP_LENGTH || emailCode.length !== OTP_LENGTH) {
      setError('Enter both 6-digit OTP codes.');
      return;
    }
    setLoading(true);
    try {
      await verifySignupOtp({ phone, otp: phoneCode });
      await verifySignupEmailOtp({ email, otp: emailCode });
      if (password) {
        await signInWithPassword({ email, password });
        if (returnTo === 'ChooseVehicle') {
          navigation.reset({
            index: 1,
            routes: [{ name: 'MainTabs' }, { name: 'ChooseVehicle' }],
          });
        }
      } else {
        setNotice('Account verified successfully.');
      }
    } catch (e: unknown) {
      setError(toApiClientError(e).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormScaffold
      title="Verify account"
      subtitle="Enter both one-time codes we sent to your phone number and email."
    >
      <View style={styles.cardContent}>
        <View style={styles.centeredStack}>
          <View style={styles.otpSection}>
            <Text style={styles.sectionTitle}>Phone OTP</Text>
            <View style={styles.phonePill}>
              <Text selectable style={styles.phone}>
                {phone}
              </Text>
            </View>

            <OtpCodeInput
              value={phoneOtp}
              onChangeText={setPhoneOtp}
              disabled={loading}
              length={OTP_LENGTH}
            />

            <View style={styles.resendRow}>
              <Text style={styles.muted}>
                {phoneSecondsLeft > 0
                  ? `You can resend in 00:${String(phoneSecondsLeft).padStart(2, '0')}`
                  : 'Did not get the phone code?'}
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={phoneSecondsLeft > 0 || resendingPhone}
                hitSlop={10}
                onPress={() => void onResendPhone()}
              >
                <Text
                  style={[
                    styles.link,
                    (phoneSecondsLeft > 0 || resendingPhone) && {
                      color: colors.muted,
                    },
                  ]}
                >
                  {resendingPhone ? 'Sending...' : 'Send again'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.otpSection}>
            <Text style={styles.sectionTitle}>Email OTP</Text>
            <View style={styles.phonePill}>
              <Text selectable style={styles.phone}>
                {email}
              </Text>
            </View>

            <OtpCodeInput
              value={emailOtp}
              onChangeText={setEmailOtp}
              disabled={loading}
              length={OTP_LENGTH}
            />

            <View style={styles.resendRow}>
              <Text style={styles.muted}>
                {emailSecondsLeft > 0
                  ? `You can resend in 00:${String(emailSecondsLeft).padStart(2, '0')}`
                  : 'Did not get the email code?'}
              </Text>
              <Pressable
                accessibilityRole="button"
                disabled={emailSecondsLeft > 0 || resendingEmail}
                hitSlop={10}
                onPress={() => void onResendEmail()}
              >
                <Text
                  style={[
                    styles.link,
                    (emailSecondsLeft > 0 || resendingEmail) && {
                      color: colors.muted,
                    },
                  ]}
                >
                  {resendingEmail ? 'Sending...' : 'Send again'}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.statusSlot}>
          {notice ? (
            <Text selectable style={styles.success}>
              {notice}
            </Text>
          ) : null}
          {error ? (
            <Text selectable style={styles.error}>
              {error}
            </Text>
          ) : null}
        </View>

        <Button
          title="Verify & continue"
          onPress={() => void onSubmit()}
          loading={loading}
          disabled={!isReadyToVerify}
        />
      </View>
    </AuthFormScaffold>
  );
}
