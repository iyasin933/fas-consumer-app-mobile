import AsyncStorage from '@react-native-async-storage/async-storage';

import * as authApi from '@/api/modules/auth.api';
import { queryClient } from '@/lib/queryClient';
import * as tokenStorage from '@/services/tokenStorage';
import { pickUserIdFromProfile, userIdFromJwt } from '@/utils/authIdentity';
import { env } from '@/shared/config/env';
import type {
  ForgotPasswordCompleteDto,
  GoogleSignInMobileParams,
  UserLoginDto,
  UserSignupDto,
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
  await tokenStorage.setAccessToken(accessToken);
  if (refresh) await tokenStorage.setRefreshToken(refresh);
}

async function loadMeIntoStore() {
  const me = await authApi.fetchMe();
  const token = await tokenStorage.getAccessToken();
  const mergedId = pickUserIdFromProfile(me) ?? userIdFromJwt(token);
  if (mergedId != null && me && typeof me === 'object') {
    useAuthStore.getState().setAuthedUser({ ...(me as object), id: mergedId });
  } else {
    useAuthStore.getState().setAuthedUser(me);
  }
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
  await authApi.signup({ ...params, roleId: env.consumerRoleId });
}

export async function verifySignupOtp(dto: VerifyOtpDto): Promise<void> {
  const { accessToken, refreshToken } = await authApi.verifySignupOtp(dto);
  if (!accessToken) throw new Error('Verified, but no access token was returned.');
  await persistAfterAuth(accessToken, refreshToken);
  await loadMeIntoStore();
  useAuthStore.getState().setSession({ session: 'authed' });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dropyou.activeTrips });
  void queryClient.invalidateQueries({ queryKey: ['dropyou', 'user-bookings'] });
  void queryClient.invalidateQueries({ queryKey: ['auth', 'resolved-user-id'] });
}

export async function completeForgotPassword(dto: ForgotPasswordCompleteDto): Promise<void> {
  const { accessToken, refreshToken } = await authApi.forgotPasswordComplete(dto);
  if (!accessToken) {
    throw new Error('Password updated, but no access token was returned. Try signing in.');
  }
  await persistAfterAuth(accessToken, refreshToken);
  await loadMeIntoStore();
  useAuthStore.getState().setSession({ session: 'authed' });
  void queryClient.invalidateQueries({ queryKey: queryKeys.dropyou.activeTrips });
  void queryClient.invalidateQueries({ queryKey: ['dropyou', 'user-bookings'] });
  void queryClient.invalidateQueries({ queryKey: ['auth', 'resolved-user-id'] });
}

export async function signInWithGoogleToken(params: GoogleSignInMobileParams): Promise<void> {
  const { accessToken, refreshToken } = await authApi.googleLogin({
    ...params,
    source: 'mobile',
  });
  if (!accessToken) throw new Error('Google login did not return an access token.');
  await persistAfterAuth(accessToken, refreshToken);
  await loadMeIntoStore();
  useAuthStore.getState().setSession({ session: 'authed' });
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
