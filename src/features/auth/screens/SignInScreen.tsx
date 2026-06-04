import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { AppleSignInButton } from '@/features/auth/components/AppleSignInButton';
import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import type { RootStackParamList } from '@/types/navigation.types';
import { toApiClientError } from '@/types/api.types';
import { BrandLogo } from '@/shared/components/BrandLogo';
import { Button } from '@/shared/components/Button';
import { PasswordTextField } from '@/shared/components/PasswordTextField';
import { TextField } from '@/shared/components/TextField';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xl,
      gap: spacing.lg,
    },
    content: {
      width: '100%',
      alignSelf: 'center',
      gap: spacing.lg,
    },
    header: {
      alignItems: 'center',
      gap: spacing.sm,
    },
    title: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.bold,
      color: colors.textPrimary,
    },
    subtitle: {
      fontSize: typography.fontSize.md,
      color: colors.textSecondary,
    },
    form: {
      gap: spacing.md,
    },
    errorBanner: {
      color: colors.danger,
      fontSize: 14,
    },
    linkRow: {
      alignSelf: 'center',
      paddingVertical: 4,
    },
    link: {
      color: colors.primary,
      fontWeight: '600',
      fontSize: 15,
    },
    guestLink: {
      color: colors.textSecondary,
      fontWeight: '600',
      fontSize: 15,
    },
    signUpRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      flexWrap: 'wrap',
      marginTop: spacing.sm,
    },
    muted: {
      color: colors.textSecondary,
      fontSize: 15,
    },
  });
}

export function SignInScreen({ navigation, route }: Props) {
  const returnTo = route.params?.returnTo;
  const { session, signInWithPassword } = useAuth();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const maxWidth = width >= 768 ? 520 : 430;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session !== 'authed') return;
    if (returnTo === 'ChooseVehicle') {
      navigation.reset({
        index: 1,
        routes: [{ name: 'MainTabs' }, { name: 'ChooseVehicle' }],
      });
      return;
    }
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  }, [navigation, returnTo, session]);

  const onSubmit = async () => {
    setError(null);
    const trimmed = email.trim();
    if (!trimmed || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signInWithPassword({ email: trimmed, password });
    } catch (e: unknown) {
      setError(toApiClientError(e).message);
    } finally {
      setLoading(false);
    }
  };

  const onContinueAsGuest = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.content, { maxWidth }]}>
            <View style={styles.header}>
              <BrandLogo variant="header" />
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Sign in to DropYou</Text>
            </View>

            <View style={styles.form}>
              <TextField
                label="Email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
              />
              <PasswordTextField
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
              />
              {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

              <Button title="Sign in" onPress={() => void onSubmit()} loading={loading} />

              <AppleSignInButton />
              <GoogleSignInButton />

              <Pressable
                onPress={() => navigation.navigate('ForgotPassword')}
                style={styles.linkRow}
              >
                <Text style={styles.link}>Forgot password?</Text>
              </Pressable>

              <Pressable
                onPress={onContinueAsGuest}
                style={styles.linkRow}
                accessibilityRole="button"
              >
                <Text style={styles.guestLink}>Continue as guest</Text>
              </Pressable>

              <View style={styles.signUpRow}>
                <Text style={styles.muted}>New to DropYou? </Text>
                <Pressable
                  onPress={() =>
                    navigation.navigate('SignUp', {
                      returnTo,
                    })
                  }
                >
                  <Text style={styles.link}>Create account</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
