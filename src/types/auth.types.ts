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
  status?: string;
};

export type VerifyOtpDto = {
  otp: string;
  phone: string;
};

export type VerifyEmailOtpDto = {
  otp: string;
  email: string;
};

export type ForgotPasswordInitiateDto = {
  phone: string;
};

export type ForgotPasswordCompleteDto = {
  password: string;
  confirmPassword: string;
  otp: string;
};

export type SendOtpDto = {
  phone: string;
  purpose?: 'SIGNUP' | 'LOGIN' | string;
};

export type SendEmailOtpDto = {
  email: string;
  purpose?: 'SIGNUP' | 'LOGIN' | string;
};

export type GoogleLoginDto = {
  code: string;
  source?: string;
  platform?: 'ios' | 'android';
  codeVerifier?: string;
  redirectUri?: string;
};

/** Same fields sent from mobile into `authSession.signInWithGoogleToken` (service adds `source`). */
export type GoogleSignInMobileParams = {
  code: string;
  platform?: 'ios' | 'android';
  codeVerifier?: string;
  redirectUri?: string;
};

export type AppleLoginDto = {
  identityToken: string;
  authorizationCode?: string;
  source?: string;
  platform?: 'ios';
  firstName?: string;
  lastName?: string;
};

export type AppleSignInMobileParams = {
  identityToken: string;
  authorizationCode?: string;
  fullName?: {
    givenName?: string;
    familyName?: string;
  };
  platform?: 'ios';
};

export type MeResponse = Record<string, unknown>;

/** `/auth/me` profile held in Zustand (tokens stay in SecureStore only). */
export type AuthUserProfile = MeResponse;

/** Discriminates bootstrapped session state (Zustand). */
export type AuthSession = 'loading' | 'guest' | 'authed';
