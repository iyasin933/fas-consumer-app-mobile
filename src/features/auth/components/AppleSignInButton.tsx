import { Ionicons } from '@expo/vector-icons';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useState } from 'react';
import { Alert, Platform, Pressable, StyleSheet, Text } from 'react-native';

import { useAuth } from '@/hooks/useAuth';

function appleFullName(fullName: AppleAuthentication.AppleAuthenticationFullName | null) {
  if (!fullName) return undefined;

  return {
    givenName: fullName.givenName ?? undefined,
    familyName: fullName.familyName ?? undefined,
    middleName: fullName.middleName ?? undefined,
    nickname: fullName.nickname ?? undefined,
    namePrefix: fullName.namePrefix ?? undefined,
    nameSuffix: fullName.nameSuffix ?? undefined,
  };
}

export function AppleSignInButton() {
  const { signInWithAppleToken } = useAuth();
  const [loading, setLoading] = useState(false);

  if (Platform.OS !== 'ios') return null;

  const onPress = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const available = await AppleAuthentication.isAvailableAsync();
      if (!available) {
        throw new Error(
          'Sign in with Apple is not available in this build. Rebuild the iOS app after installing expo-apple-authentication.',
        );
      }

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error('Apple did not return an identity token.');
      }

      await signInWithAppleToken({
        identityToken: credential.identityToken,
        authorizationCode: credential.authorizationCode ?? undefined,
        fullName: appleFullName(credential.fullName),
        platform: 'ios',
      });
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'ERR_REQUEST_CANCELED'
      ) {
        return;
      }

      Alert.alert(
        'Sign in with Apple',
        error instanceof Error ? error.message : 'Apple sign-in failed.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Sign in with Apple"
      disabled={loading}
      onPress={() => void onPress()}
      style={({ pressed }) => [
        styles.button,
        pressed && !loading && styles.pressed,
        loading && styles.disabled,
      ]}
      testID="apple-sign-in-button"
    >
      <Ionicons name="logo-apple" size={24} color="#FFFFFF" />
      <Text style={styles.label}>{loading ? 'Signing in...' : 'Sign in with Apple'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    width: '100%',
    borderRadius: 12,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
  },
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.65,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '600',
  },
});
