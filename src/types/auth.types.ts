/** Auth API request/response shapes (aligned with backend Swagger). */

export type UserLoginDto = {
  email?: string;
  phone?: string;
  password: string;
};

export type UserSignupDto = {
  firstName: string;
  lastName: string;
  password: string;
  phone: string;
  email?: string;
  roleId: number;
};

export type VerifyOtpDto = {
  otp: string;
  phone: string;
};

export type ForgotPasswordInitiateDto = {
  phone: string;
};

export type ForgotPasswordCompleteDto = {
  password: string;
  confirmPassword: string;
  otp: string;
};

export type GoogleLoginDto = {
  code: string;
  source?: string;
  codeVerifier?: string;
  redirectUri?: string;
};

/** Same fields sent from mobile into `authSession.signInWithGoogleToken` (service adds `source`). */
export type GoogleSignInMobileParams = {
  code: string;
  codeVerifier?: string;
  redirectUri?: string;
};

export type MeResponse = Record<string, unknown>;

/** `/auth/me` profile held in Zustand (tokens stay in SecureStore only). */
export type AuthUserProfile = MeResponse;

/** Discriminates bootstrapped session state (Zustand). */
export type AuthSession = 'loading' | 'guest' | 'authed';
