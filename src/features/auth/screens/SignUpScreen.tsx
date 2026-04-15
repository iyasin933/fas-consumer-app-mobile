import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { UserSignupDto } from '@/types/auth.types';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import type { AuthStackParamList } from '@/types/navigation.types';
import { toApiClientError } from '@/types/api.types';
import { Button } from '@/shared/components/Button';
import { TextField } from '@/shared/components/TextField';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: { flex: 1, backgroundColor: colors.background },
    scroll: {
      padding: spacing.lg,
      paddingBottom: spacing.xl * 2,
      gap: spacing.sm,
    },
    lead: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: spacing.md,
    },
    error: {
      color: colors.danger,
      fontSize: 14,
    },
    hint: {
      marginTop: spacing.sm,
    },
    hintText: {
      fontSize: 13,
      color: colors.textSecondary,
      lineHeight: 18,
    },
  });
}

export function SignUpScreen({ navigation }: Props) {
  const { signUp } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    const trimmed: Omit<UserSignupDto, 'roleId'> = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      email: email.trim(),
      password,
    };
    if (!trimmed.firstName || !trimmed.lastName || !trimmed.phone || !trimmed.email) {
      setError('Fill in all fields.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await signUp(trimmed);
      navigation.navigate('SignUpVerify', { phone: trimmed.phone });
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
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lead}>Create your account</Text>

        <TextField label="First name" value={firstName} onChangeText={setFirstName} />
        <TextField label="Last name" value={lastName} onChangeText={setLastName} />
        <TextField
          label="Phone"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
          placeholder="+44 ..."
        />
        <TextField
          label="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextField
          label="Password"
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

        <Button title="Continue" onPress={() => void onSubmit()} loading={loading} />

        <View style={styles.hint}>
          <Text style={styles.hintText}>
            Phone verification may be required after this step (per API).
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
