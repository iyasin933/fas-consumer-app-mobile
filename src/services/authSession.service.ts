import AsyncStorage from '@react-native-async-storage/async-storage';

import * as authApi from '@/api/modules/auth.api';
import * as usersApi from '@/api/modules/users.api';
import { queryClient } from '@/lib/queryClient';
import * as tokenStorage from '@/services/tokenStorage';
import { pickUserIdFromProfile, userIdFromJwt } from '@/utils/authIdentity';
import { env } from '@/shared/config/env';
import type {
  AppleSignInMobileParams,
  ForgotPasswordCompleteDto,
  GoogleSignInMobileParams,
  MeResponse,
  UserLoginDto,
  UserSignupDto,
  VerifyEmailOtpDto,
  VerifyOtpDto,
} from '@/types/auth.types';
import { useAuthStore } from '@/store/authStore';
import { queryKeys } from '@/utils/queryKeys';

const LEGACY_ACCESS = 'dropyou_access_token';
const LEGACY_REFRESH = 'dropyou_refresh_token';

/** One-time migration from AsyncStorage → SecureStore after upgrading the app. */
async function migrateLegacyTokens(): Promise<void> {
  const hasNew = await tokenStorage.getAccessToken();
  if (hasNew) return;

  const a = await AsyncStorage.getItem(LEGACY_ACCESS);
  const r = await AsyncStorage.getItem(LEGACY_REFRESH);
  if (a) {
    await tokenStorage.setAccessToken(a);
    await AsyncStorage.removeItem(LEGACY_ACCESS);
  }
  if (r) {
    await tokenStorage.setRefreshToken(r);
    await AsyncStorage.removeItem(LEGACY_REFRESH);
  }
}

async function persistAfterAuth(accessToken: string, refresh?: string) {
  logGoogleAuth('persist tokens start', {
    hasAccessToken: Boolean(accessToken),
    hasRefreshToken: Boolean(refresh),
  });
  await tokenStorage.setAccessToken(accessToken);
  if (refresh) await tokenStorage.setRefreshToken(refresh);
  logGoogleAuth('persist tokens complete');
}

async function loadMeIntoStore() {
  logGoogleAuth('load me start');
  const me = await authApi.fetchMe();
  logGoogleAuth('load me response received', {
    keys: me && typeof me === 'object' ? Object.keys(me) : [],
  });
  await mergeMeIntoStore(me);
  logGoogleAuth('load me stored');
}

function logGoogleAuth(step: string, details?: Record<string, unknown>) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(`[google-auth][session] ${step}`, details ?? '');
  }
}

function logAppleAuth(step: string, details?: Record<string, unknown>) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(`[apple-auth][session] ${step}`, details ?? '');
  }
}

async function mergeMeIntoStore(me: MeResponse) {
  const token = await tokenStorage.getAccessToken();
  const mergedId = pickUserIdFromProfile(me) ?? userIdFromJwt(token);
  if (mergedId != null && me && typeof me === 'object') {
    useAuthStore.getState().setAuthedUser({ ...(me as object), id: mergedId });
  } else {
    useAuthStore.getState().setAuthedUser(me);
  }
}

export async function updateProfile(params: {
  userId: string | number;
  profile: authApi.UpdateProfileDto;
}): Promise<void> {
  await authApi.updateProfile(params.userId, params.profile);
  await loadMeIntoStore();
  void queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
}

export async function uploadProfileImage(
  input: authApi.ProfileImageUploadInput,
): Promise<string> {
  return authApi.uploadProfileImage(input);
}

export async function hydrateAuthSession(): Promise<void> {
  useAuthStore.getState().setSession({ session: 'loading', isReady: false });
  try {
    await migrateLegacyTokens();
    const token = await tokenStorage.getAccessToken();
    if (!token) {
      useAuthStore.getState().setSession({ session: 'guest', user: null, isReady: true });
      return;
    }
    try {
      await loadMeIntoStore();
      useAuthStore.getState().setSession({ session: 'authed', isReady: true });
    } catch {
      await tokenStorage.clearTokens();
      useAuthStore.getState().setSession({ session: 'guest', user: null, isReady: true });
    }
  } catch {
    useAuthStore.getState().setSession({ session: 'guest', user: null, isReady: true });
  }
}

export async function signInWithPassword(params: UserLoginDto): Promise<void> {
  const { accessToken, refreshToken } = await authApi.login({
    email: params.email?.trim() || undefined,
    phone: params.phone?.trim() || undefined,
    password: params.password,
  });
  if (!accessToken) throw new Error('Login succeeded but no access token was returned.');
  await persistAfterAuth(accessToken, refreshToken);
  await loadMeIntoStore();
  useAuthStore.getState().setSession({ session: 'authed' });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dropyou.activeTrips });
  void queryClient.invalidateQueries({ queryKey: ['dropyou', 'user-bookings'] });
  void queryClient.invalidateQueries({ queryKey: ['auth', 'resolved-user-id'] });
}

export async function signUp(params: Omit<UserSignupDto, 'roleId'>): Promise<void> {
  if (!env.consumerRoleId || Number.isNaN(env.consumerRoleId)) {
    throw new Error(
      'Set EXPO_PUBLIC_CONSUMER_ROLE_ID in `.env` (consumer role numeric id from your API).',
    );
  }
  await authApi.signup({
    ...params,
    roleId: env.consumerRoleId,
    status: params.status ?? 'ACTIVE',
  });
}

export async function verifySignupOtp(dto: VerifyOtpDto): Promise<void> {
  const { accessToken, refreshToken } = await authApi.verifySignupOtp(dto);
  if (!accessToken) return;
  await persistAfterAuth(accessToken, refreshToken);
  await loadMeIntoStore();
  useAuthStore.getState().setSession({ session: 'authed' });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dropyou.activeTrips });
  void queryClient.invalidateQueries({ queryKey: ['dropyou', 'user-bookings'] });
  void queryClient.invalidateQueries({ queryKey: ['auth', 'resolved-user-id'] });
}

export async function verifySignupEmailOtp(dto: VerifyEmailOtpDto): Promise<void> {
  const { accessToken, refreshToken } = await authApi.verifySignupEmailOtp(dto);
  if (!accessToken) return;
  await persistAfterAuth(accessToken, refreshToken);
  await loadMeIntoStore();
  useAuthStore.getState().setSession({ session: 'authed' });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dropyou.activeTrips });
  void queryClient.invalidateQueries({ queryKey: ['dropyou', 'user-bookings'] });
  void queryClient.invalidateQueries({ queryKey: ['auth', 'resolved-user-id'] });
}

export async function completeForgotPassword(
  dto: ForgotPasswordCompleteDto,
): Promise<void> {
  const { accessToken, refreshToken } = await authApi.forgotPasswordComplete(dto);
  if (!accessToken) {
    useAuthStore.getState().setSession({ session: 'guest' });
    return;
  }
  await persistAfterAuth(accessToken, refreshToken);
  await loadMeIntoStore();
  useAuthStore.getState().setSession({ session: 'authed' });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dropyou.activeTrips });
  void queryClient.invalidateQueries({ queryKey: ['dropyou', 'user-bookings'] });
  void queryClient.invalidateQueries({ queryKey: ['auth', 'resolved-user-id'] });
}

export async function resendSignupOtp(phone: string): Promise<void> {
  await authApi.sendOtp({ phone: phone.trim(), purpose: 'SIGNUP' });
}

export async function resendSignupEmailOtp(email: string): Promise<void> {
  await authApi.sendEmailOtp({ email: email.trim(), purpose: 'SIGNUP' });
}

export async function signInWithGoogleToken(
  params: GoogleSignInMobileParams,
): Promise<void> {
  logGoogleAuth('start backend sign-in', {
    platform: params.platform,
    hasCode: Boolean(params.code),
    codeLength: params.code.length,
    hasCodeVerifier: Boolean(params.codeVerifier),
    redirectUri: params.redirectUri,
  });
  const { accessToken, refreshToken } = await authApi.googleLogin({
    ...params,
    source: 'mobile',
  });
  logGoogleAuth('backend exchange parsed', {
    hasAccessToken: Boolean(accessToken),
    hasRefreshToken: Boolean(refreshToken),
  });
  if (!accessToken) throw new Error('Google login did not return an access token.');
  await persistAfterAuth(accessToken, refreshToken);
  await loadMeIntoStore();
  useAuthStore.getState().setSession({ session: 'authed' });
  logGoogleAuth('session authed');
  void queryClient.invalidateQueries({ queryKey: queryKeys.dropyou.activeTrips });
  void queryClient.invalidateQueries({ queryKey: ['dropyou', 'user-bookings'] });
  void queryClient.invalidateQueries({ queryKey: ['auth', 'resolved-user-id'] });
}

export async function signInWithAppleToken(
  params: AppleSignInMobileParams,
): Promise<void> {
  logAppleAuth('start backend sign-in', {
    platform: params.platform,
    hasIdentityToken: Boolean(params.identityToken),
    identityTokenLength: params.identityToken.length,
    hasAuthorizationCode: Boolean(params.authorizationCode),
    authorizationCodeLength: params.authorizationCode?.length ?? 0,
    hasFirstName: Boolean(params.fullName?.givenName),
    hasLastName: Boolean(params.fullName?.familyName),
  });
  const { accessToken, refreshToken } = await authApi.appleLogin({
    identityToken: params.identityToken,
    authorizationCode: params.authorizationCode,
    source: 'mobile',
    platform: 'ios',
    firstName: params.fullName?.givenName,
    lastName: params.fullName?.familyName,
  });
  logAppleAuth('backend exchange parsed', {
    hasAccessToken: Boolean(accessToken),
    hasRefreshToken: Boolean(refreshToken),
  });
  if (!accessToken) throw new Error('Apple login did not return an access token.');
  await persistAfterAuth(accessToken, refreshToken);
  await loadMeIntoStore();
  useAuthStore.getState().setSession({ session: 'authed' });
  logAppleAuth('session authed');
  void queryClient.invalidateQueries({ queryKey: queryKeys.dropyou.activeTrips });
  void queryClient.invalidateQueries({ queryKey: ['dropyou', 'user-bookings'] });
  void queryClient.invalidateQueries({ queryKey: ['auth', 'resolved-user-id'] });
}

/** Clears local session; calls `GET /auth/logout` with Bearer while token still exists (see API docs). */
export async function signOut(): Promise<void> {
  const token = await tokenStorage.getAccessToken();
  if (token) {
    try {
      await authApi.logoutRequest();
    } catch {
      // Unreachable server or stale session — still sign out locally.
    }
  }
  await tokenStorage.clearTokens();
  useAuthStore.getState().clearSession();
  await queryClient.cancelQueries();
  queryClient.clear();
}

export async function deleteAccount(userId: string | number): Promise<void> {
  await usersApi.deleteUserAccount(userId);
  await tokenStorage.clearTokens();
  useAuthStore.getState().clearSession();
  await queryClient.cancelQueries();
  queryClient.clear();
}
