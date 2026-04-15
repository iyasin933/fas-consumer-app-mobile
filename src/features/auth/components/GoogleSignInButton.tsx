import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef } from 'react';
import { Alert, View } from 'react-native';

import { GoogleLogoSvg } from '@/features/auth/components/GoogleLogoSvg';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/shared/components/Button';
import { env } from '@/shared/config/env';

WebBrowser.maybeCompleteAuthSession();

export function GoogleSignInButton() {
  const { signInWithGoogleToken } = useAuth();
  const handled = useRef(false);

  const redirectUri = makeRedirectUri({
    scheme: 'dropyou',
    path: 'oauth',
  });

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: env.googleIosClientId || undefined,
    webClientId: env.googleWebClientId || undefined,
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
  });

  useEffect(() => {
    if (response?.type !== 'success' || handled.current) return;
    const params = response.params as Record<string, string | undefined>;
    const code = params.code;
    if (!code) {
      Alert.alert('Google', 'No authorization code returned.');
      return;
    }
    handled.current = true;

    const codeVerifier = request?.codeVerifier;

    void (async () => {
      try {
        await signInWithGoogleToken({
          code,
          codeVerifier,
          redirectUri,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Google sign-in failed';
        Alert.alert('Google', msg);
        handled.current = false;
      }
    })();
  }, [redirectUri, request?.codeVerifier, response, signInWithGoogleToken]);

  const onPress = useCallback(() => {
    if (!env.googleIosClientId && !env.googleWebClientId) {
      Alert.alert(
        'Google sign-in',
        'Add EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID and EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to your `.env` file (Google Cloud Console OAuth clients).',
      );
      return;
    }
    handled.current = false;
    void promptAsync();
  }, [promptAsync]);

  const busy = !request;

  return (
    <Button
      title="Continue with Google"
      variant="outline"
      onPress={onPress}
      loading={busy}
      disabled={busy}
      leftAccessory={
        <View style={{ marginRight: 4 }}>
          <GoogleLogoSvg size={22} />
        </View>
      }
    />
  );
}
