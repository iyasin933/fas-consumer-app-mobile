import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AuthFormScaffold } from '@/features/auth/components/AuthFormScaffold';
import {
  AuthPhoneNumberField,
  normalizePhoneNumber,
} from '@/features/auth/components/AuthPhoneNumberField';
import { AppleSignInButton } from '@/features/auth/components/AppleSignInButton';
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton';
import {
  getPasswordRules,
  validateConfirmPassword,
  validateEmail,
  validatePassword,
  validateRequiredName,
} from '@/features/auth/utils/authValidation';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { Button } from '@/shared/components/Button';
import { PasswordTextField } from '@/shared/components/PasswordTextField';
import { TextField } from '@/shared/components/TextField';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { toApiClientError } from '@/types/api.types';
import type { UserSignupDto } from '@/types/auth.types';
import type { AuthStackParamList } from '@/types/navigation.types';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;
type SignUpField = 'firstName' | 'lastName' | 'phone' | 'email' | 'password' | 'confirm';

const INITIAL_TOUCHED: Record<SignUpField, boolean> = {
  firstName: false,
  lastName: false,
  phone: false,
  email: false,
  password: false,
  confirm: false,
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    nameRow: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    half: {
      flex: 1,
      minWidth: 0,
    },
    error: {
      color: colors.danger,
      fontSize: 14,
      lineHeight: 20,
    },
    footer: {
      alignItems: 'center',
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      gap: 4,
    },
    footerText: {
      color: colors.textSecondary,
      fontSize: 15,
      textAlign: 'center',
    },
    link: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: '700',
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
    dividerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    dividerLine: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
    },
    dividerText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },
  });
}

export function SignUpScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [countryCode, setCountryCode] = useState('GB');
  const [dialCode, setDialCode] = useState('+44');
  const [phoneLocal, setPhoneLocal] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState(INITIAL_TOUCHED);
  const [apiError, setApiError] = useState<string | null>(null);

  const markTouched = (field: SignUpField) => {
    setTouched((current) => ({ ...current, [field]: true }));
  };

  const normalizedPhone = useMemo(
    () => normalizePhoneNumber(countryCode, dialCode, phoneLocal),
    [countryCode, dialCode, phoneLocal],
  );

  const passwordRules = useMemo(() => getPasswordRules(password), [password]);

  const errors = useMemo(
    () => ({
      firstName: validateRequiredName(firstName, 'First name'),
      lastName: validateRequiredName(lastName, 'Last name'),
      phone: normalizedPhone.error,
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: validateConfirmPassword(password, confirm),
    }),
    [confirm, email, firstName, lastName, normalizedPhone.error, password],
  );

  const showError = (field: SignUpField) =>
    submitted || touched[field] ? errors[field] : undefined;

  const isFormValid = Object.values(errors).every((fieldError) => !fieldError);

  const onSubmit = async () => {
    setSubmitted(true);
    setApiError(null);
    const trimmed: Omit<UserSignupDto, 'roleId'> = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: normalizedPhone.phone,
      email: email.trim(),
      password,
      status: 'ACTIVE',
    };
    if (!isFormValid) return;
    setLoading(true);
    try {
      await signUp(trimmed);
      navigation.navigate('SignUpVerify', {
        phone: trimmed.phone,
        email: trimmed.email ?? '',
        password: trimmed.password,
      });
    } catch (e: unknown) {
      setApiError(toApiClientError(e).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormScaffold
      title="Create account"
      subtitle="Set up your DropYou account, then verify your phone number with a one-time code."
      footer={
        <View style={styles.footer}>
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Pressable
              accessibilityRole="button"
              hitSlop={10}
              onPress={() => navigation.navigate('SignIn')}
            >
              <Text style={styles.link}>Sign in</Text>
            </Pressable>
          </View>
        </View>
      }
    >
      <View style={styles.nameRow}>
        <View style={styles.half}>
          <TextField
            label="First name"
            value={firstName}
            onBlur={() => markTouched('firstName')}
            onChangeText={(value) => {
              setApiError(null);
              setFirstName(value);
            }}
            error={showError('firstName') ?? undefined}
            textContentType="givenName"
          />
        </View>
        <View style={styles.half}>
          <TextField
            label="Last name"
            value={lastName}
            onBlur={() => markTouched('lastName')}
            onChangeText={(value) => {
              setApiError(null);
              setLastName(value);
            }}
            error={showError('lastName') ?? undefined}
            textContentType="familyName"
          />
        </View>
      </View>

      <AuthPhoneNumberField
        countryCode={countryCode}
        dialCode={dialCode}
        localNumber={phoneLocal}
        onBlur={() => markTouched('phone')}
        onChangeCountryCode={(value) => {
          setApiError(null);
          setCountryCode(value);
          markTouched('phone');
        }}
        onChangeDialCode={setDialCode}
        onChangeLocalNumber={(value) => {
          setApiError(null);
          setPhoneLocal(value);
        }}
        error={showError('phone') ?? undefined}
      />
      <TextField
        label="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="emailAddress"
        value={email}
        onBlur={() => markTouched('email')}
        onChangeText={(value) => {
          setApiError(null);
          setEmail(value);
        }}
        error={showError('email') ?? undefined}
        placeholder="you@example.com"
      />
      <PasswordTextField
        label="Password"
        textContentType="newPassword"
        value={password}
        onBlur={() => markTouched('password')}
        onChangeText={(value) => {
          setApiError(null);
          setPassword(value);
          if (value.length > 0) markTouched('password');
        }}
        error={showError('password') ?? undefined}
        placeholder="At least 8 characters"
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

      {apiError ? (
        <Text selectable style={styles.error}>
          {apiError}
        </Text>
      ) : null}

      <Button
        title="Continue"
        onPress={() => void onSubmit()}
        loading={loading}
        disabled={submitted && !isFormValid}
      />

      <View style={styles.dividerRow}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or</Text>
        <View style={styles.dividerLine} />
      </View>

      <AppleSignInButton />
      <GoogleSignInButton buttonText="Continue with Google" />
    </AuthFormScaffold>
  );
}
