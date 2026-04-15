import { useCallback, useMemo } from 'react';

import type {
  ForgotPasswordCompleteDto,
  UserSignupDto,
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

  const completeForgotPassword = useCallback(
    (dto: ForgotPasswordCompleteDto) => authSession.completeForgotPassword(dto),
    [],
  );

  const signInWithGoogleToken = useCallback(
    (params: Parameters<typeof authSession.signInWithGoogleToken>[0]) =>
      authSession.signInWithGoogleToken(params),
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
      completeForgotPassword,
      signInWithGoogleToken,
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
      completeForgotPassword,
      signInWithGoogleToken,
      signOut,
      hydrate,
    ],
  );
}
