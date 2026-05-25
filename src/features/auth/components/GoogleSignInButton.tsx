import { makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef } from 'react';
import { Alert, Platform, View } from 'react-native';

import { GoogleLogoSvg } from '@/features/auth/components/GoogleLogoSvg';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/shared/components/Button';
import { env } from '@/shared/config/env';

WebBrowser.maybeCompleteAuthSession();

type GoogleSignInButtonProps = {
  buttonText?: string;
};

const MISSING_GOOGLE_CLIENT_ID = 'missing-google-client-id.apps.googleusercontent.com';

function logGoogleAuth(step: string, details?: Record<string, unknown>) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(`[google-auth][button] ${step}`, details ?? '');
  }
}

function getPlatformGoogleClientId() {
  if (Platform.OS === 'ios') return env.googleIosClientId;
  if (Platform.OS === 'android') return env.googleAndroidClientId;
  return env.googleWebClientId;
}

function getGoogleAuthPlatform() {
  if (Platform.OS === 'ios' || Platform.OS === 'android') return Platform.OS;
  return undefined;
}

function googleIosUrlScheme(clientId: string) {
  if (!clientId.endsWith('.apps.googleusercontent.com')) return '';
  return `com.googleusercontent.apps.${clientId.replace('.apps.googleusercontent.com', '')}`;
}

function getRedirectUri() {
  if (Platform.OS === 'ios') {
    const scheme = googleIosUrlScheme(env.googleIosClientId);
    if (scheme) return `${scheme}:/oauthredirect`;
  }

  return makeRedirectUri({
    scheme: 'dropyou',
    path: 'oauth',
  });
}

export function GoogleSignInButton({
  buttonText = 'Continue with Google',
}: GoogleSignInButtonProps) {
  const { signInWithGoogleToken } = useAuth();
  const handled = useRef(false);
  const platformClientId = getPlatformGoogleClientId();
  const hasPlatformClientId = Boolean(platformClientId);
  const googleAuthPlatform = getGoogleAuthPlatform();

  const redirectUri = getRedirectUri();

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: env.googleIosClientId || MISSING_GOOGLE_CLIENT_ID,
    androidClientId: env.googleAndroidClientId || MISSING_GOOGLE_CLIENT_ID,
    webClientId: env.googleWebClientId || MISSING_GOOGLE_CLIENT_ID,
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
    selectAccount: true,
    shouldAutoExchangeCode: false,
  });

  useEffect(() => {
    logGoogleAuth('request configured', {
      platform: Platform.OS,
      hasPlatformClientId,
      redirectUri,
      hasRequest: Boolean(request),
      hasCodeVerifier: Boolean(request?.codeVerifier),
    });
  }, [hasPlatformClientId, redirectUri, request]);

  useEffect(() => {
    if (response?.type !== 'success' || handled.current) return;
    const params = response.params as Record<string, string | undefined>;
    const code = params.code;
    logGoogleAuth('google response received', {
      type: response.type,
      hasCode: Boolean(code),
      codeLength: code?.length ?? 0,
      hasCodeVerifier: Boolean(request?.codeVerifier),
      redirectUri,
      paramsKeys: Object.keys(params),
    });
    if (!code) {
      Alert.alert('Google', 'No authorization code returned.');
      return;
    }
    handled.current = true;

    const codeVerifier = request?.codeVerifier;

    void (async () => {
      try {
        logGoogleAuth('sending code to backend', {
          platform: googleAuthPlatform,
          hasCode: Boolean(code),
          codeLength: code.length,
          hasCodeVerifier: Boolean(codeVerifier),
          redirectUri,
        });
        await signInWithGoogleToken({
          code,
          platform: googleAuthPlatform,
          codeVerifier,
          redirectUri,
        });
        logGoogleAuth('backend sign-in completed');
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Google sign-in failed';
        logGoogleAuth('backend sign-in failed', {
          message: msg,
        });
        Alert.alert('Google', msg);
        handled.current = false;
      }
    })();
  }, [googleAuthPlatform, redirectUri, request?.codeVerifier, response, signInWithGoogleToken]);

  const onPress = useCallback(() => {
    if (!hasPlatformClientId) {
      Alert.alert(
        'Google sign-in',
        Platform.select({
          ios: 'Add EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID to your `.env` file.',
          android: 'Add EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID to your `.env` file.',
          default: 'Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to your `.env` file.',
        }) ?? 'Add the Google OAuth client ID to your `.env` file.',
      );
      return;
    }
    handled.current = false;
    logGoogleAuth('prompt opened', {
      platform: Platform.OS,
      redirectUri,
    });
    void promptAsync();
  }, [hasPlatformClientId, promptAsync, redirectUri]);

  const busy = hasPlatformClientId && !request;

  return (
    <Button
      title={buttonText}
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
