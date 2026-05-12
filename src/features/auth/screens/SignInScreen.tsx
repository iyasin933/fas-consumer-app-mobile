import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { GoogleSignInButton } from '@/features/auth/components/GoogleSignInButton';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import type { AuthStackParamList } from '@/types/navigation.types';
import { toApiClientError } from '@/types/api.types';
import { BrandLogo } from '@/shared/components/BrandLogo';
import { Button } from '@/shared/components/Button';
import { TextField } from '@/shared/components/TextField';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignIn'>;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xl,
      paddingBottom: spacing.xl * 2,
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

export function SignInScreen({ navigation }: Props) {
  const { signInWithPassword } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            <TextField
              label="Password"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
            />
            {error ? <Text style={styles.errorBanner}>{error}</Text> : null}

            <Button title="Sign in" onPress={() => void onSubmit()} loading={loading} />

            <GoogleSignInButton />

            <Pressable
              onPress={() => navigation.navigate('ForgotPassword')}
              style={styles.linkRow}
            >
              <Text style={styles.link}>Forgot password?</Text>
            </Pressable>

            <View style={styles.signUpRow}>
              <Text style={styles.muted}>New to DropYou? </Text>
              <Pressable onPress={() => navigation.navigate('SignUp')}>
                <Text style={styles.link}>Create account</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
