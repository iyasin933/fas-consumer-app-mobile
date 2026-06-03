import { useCallback, useMemo } from 'react';

import type {
  ForgotPasswordCompleteDto,
  UserSignupDto,
  VerifyEmailOtpDto,
  VerifyOtpDto,
} from '@/types/auth.types';
import * as authSession from '@/services/authSession.service';
import { useAuthStore } from '@/store/authStore';

/**
 * Auth actions + derived session from Zustand. Tokens live only in SecureStore (never exposed here).
 */
export function useAuth() {
  const session = useAuthStore((s) => s.session);
  const user = useAuthStore((s) => s.user);
  const isReady = useAuthStore((s) => s.isReady);

  const signInWithPassword = useCallback(
    (params: Parameters<typeof authSession.signInWithPassword>[0]) =>
      authSession.signInWithPassword(params),
    [],
  );

  const signUp = useCallback(
    (params: Omit<UserSignupDto, 'roleId'>) => authSession.signUp(params),
    [],
  );

  const verifySignupOtp = useCallback(
    (dto: VerifyOtpDto) => authSession.verifySignupOtp(dto),
    [],
  );

  const verifySignupEmailOtp = useCallback(
    (dto: VerifyEmailOtpDto) => authSession.verifySignupEmailOtp(dto),
    [],
  );

  const completeForgotPassword = useCallback(
    (dto: ForgotPasswordCompleteDto) => authSession.completeForgotPassword(dto),
    [],
  );

  const resendSignupOtp = useCallback(
    (phone: string) => authSession.resendSignupOtp(phone),
    [],
  );

  const resendSignupEmailOtp = useCallback(
    (email: string) => authSession.resendSignupEmailOtp(email),
    [],
  );

  const signInWithGoogleToken = useCallback(
    (params: Parameters<typeof authSession.signInWithGoogleToken>[0]) =>
      authSession.signInWithGoogleToken(params),
    [],
  );

  const signInWithAppleToken = useCallback(
    (params: Parameters<typeof authSession.signInWithAppleToken>[0]) =>
      authSession.signInWithAppleToken(params),
    [],
  );

  const signOut = useCallback(() => authSession.signOut(), []);

  const hydrate = useCallback(() => authSession.hydrateAuthSession(), []);

  return useMemo(
    () => ({
      session,
      user,
      isReady,
      signInWithPassword,
      signUp,
      verifySignupOtp,
      verifySignupEmailOtp,
      completeForgotPassword,
      resendSignupOtp,
      resendSignupEmailOtp,
      signInWithGoogleToken,
      signInWithAppleToken,
      signOut,
      hydrate,
    }),
    [
      session,
      user,
      isReady,
      signInWithPassword,
      signUp,
      verifySignupOtp,
      verifySignupEmailOtp,
      completeForgotPassword,
      resendSignupOtp,
      resendSignupEmailOtp,
      signInWithGoogleToken,
      signInWithAppleToken,
      signOut,
      hydrate,
    ],
  );
}
