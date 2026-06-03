import { api } from '@/api/client';
import { pickTokens } from '@/api/authTokens';
import { isAxiosError } from 'axios';
import type {
  AppleLoginDto,
  ForgotPasswordCompleteDto,
  ForgotPasswordInitiateDto,
  GoogleLoginDto,
  MeResponse,
  SendEmailOtpDto,
  SendOtpDto,
  UserLoginDto,
  UserSignupDto,
  VerifyEmailOtpDto,
  VerifyOtpDto,
} from '@/types/auth.types';

/** Swagger: https://api.dropyou.co.uk/docs#/Authentication */

type AuthTokensResult = { raw: unknown; accessToken?: string; refreshToken?: string };

export type UpdateProfileDto = {
  firstName?: string;
  lastName?: string;
  email?: string;
  avatar?: string | null;
  phone?: string;
  language?: string;
  address?: string | null;
  postalCode?: string | null;
  zipCode?: string | null;
  isDarkModeOn?: boolean;
};

export type ProfileImageUploadInput = {
  uri: string;
  contentType: string;
  fileSize?: number | null;
};

function withTokens(data: unknown): AuthTokensResult {
  const { accessToken, refreshToken } = pickTokens(data);
  return { raw: data, accessToken, refreshToken };
}

function logGoogleAuth(step: string, details?: Record<string, unknown>) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(`[google-auth][api] ${step}`, details ?? '');
  }
}

function logAppleAuth(step: string, details?: Record<string, unknown>) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(`[apple-auth][api] ${step}`, details ?? '');
  }
}

function objectKeys(value: unknown) {
  return value && typeof value === 'object' ? Object.keys(value) : [];
}

function readApiMessage(data: unknown): string | undefined {
  if (!data || typeof data !== 'object') return undefined;
  const message = (data as Record<string, unknown>).message;
  return typeof message === 'string' && message.trim() ? message : undefined;
}

export async function login(dto: UserLoginDto): Promise<AuthTokensResult> {
  const { data } = await api.post<unknown>('/auth/login', dto);
  return withTokens(data);
}

export async function signup(dto: UserSignupDto): Promise<unknown> {
  const { data } = await api.post<unknown>('/auth/signup', dto);
  return data;
}

export async function verifySignupOtp(dto: VerifyOtpDto): Promise<AuthTokensResult> {
  const { data } = await api.post<unknown>('/auth/signup/verify/otp', dto);
  return withTokens(data);
}

export async function verifySignupEmailOtp(
  dto: VerifyEmailOtpDto,
): Promise<AuthTokensResult> {
  const { data } = await api.post<unknown>('/auth/signup/verify/otp', dto);
  return withTokens(data);
}

export async function forgotPasswordInitiate(
  dto: ForgotPasswordInitiateDto,
): Promise<unknown> {
  const { data } = await api.post<unknown>('/auth/password/forgot/initiate', dto);
  return data;
}

export async function forgotPasswordComplete(
  dto: ForgotPasswordCompleteDto,
): Promise<AuthTokensResult> {
  const { data } = await api.post<unknown>('/auth/password/forgot/complete', dto);
  return withTokens(data);
}

export async function sendOtp(dto: SendOtpDto): Promise<unknown> {
  const { data } = await api.post<unknown>('/auth/send-otp', dto);
  return data;
}

export async function sendEmailOtp(dto: SendEmailOtpDto): Promise<unknown> {
  const { data } = await api.post<unknown>('/auth/send-otp-email', dto);
  return data;
}

export async function googleLogin(dto: GoogleLoginDto): Promise<AuthTokensResult> {
  const body = {
    ...dto,
    source: dto.source ?? 'mobile',
  };
  logGoogleAuth('request /auth/google/login', {
    source: body.source,
    platform: body.platform,
    hasCode: Boolean(body.code),
    codeLength: body.code?.length ?? 0,
    hasCodeVerifier: Boolean(body.codeVerifier),
    redirectUri: body.redirectUri,
  });
  try {
    const { data, status } = await api.post<unknown>('/auth/google/login', body);
    const tokens = withTokens(data);
    logGoogleAuth('response /auth/google/login', {
      status,
      rootKeys: objectKeys(data),
      dataKeys:
        data && typeof data === 'object'
          ? objectKeys((data as Record<string, unknown>).data)
          : [],
      resultKeys:
        data && typeof data === 'object'
          ? objectKeys((data as Record<string, unknown>).result)
          : [],
      hasAccessToken: Boolean(tokens.accessToken),
      hasRefreshToken: Boolean(tokens.refreshToken),
    });
    return tokens;
  } catch (error: unknown) {
    if (isAxiosError(error)) {
      const message = readApiMessage(error.response?.data) ?? error.message;
      logGoogleAuth('error /auth/google/login', {
        status: error.response?.status,
        message,
        responseKeys: objectKeys(error.response?.data),
      });
      throw new Error(message);
    } else {
      logGoogleAuth('error /auth/google/login', {
        message: error instanceof Error ? error.message : String(error),
      });
    }
    throw error;
  }
}

export async function appleLogin(dto: AppleLoginDto): Promise<AuthTokensResult> {
  const body = {
    ...dto,
    source: dto.source ?? 'mobile',
    platform: dto.platform ?? 'ios',
  };
  logAppleAuth('request /auth/apple/login', {
    source: body.source,
    platform: body.platform,
    hasIdentityToken: Boolean(body.identityToken),
    identityTokenLength: body.identityToken?.length ?? 0,
    hasAuthorizationCode: Boolean(body.authorizationCode),
    authorizationCodeLength: body.authorizationCode?.length ?? 0,
    hasFirstName: Boolean(body.firstName),
    hasLastName: Boolean(body.lastName),
  });
  try {
    const { data, status } = await api.post<unknown>('/auth/apple/login', body);
    const tokens = withTokens(data);
    logAppleAuth('response /auth/apple/login', {
      status,
      rootKeys: objectKeys(data),
      dataKeys:
        data && typeof data === 'object'
          ? objectKeys((data as Record<string, unknown>).data)
          : [],
      resultKeys:
        data && typeof data === 'object'
          ? objectKeys((data as Record<string, unknown>).result)
          : [],
      hasAccessToken: Boolean(tokens.accessToken),
      hasRefreshToken: Boolean(tokens.refreshToken),
    });
    return tokens;
  } catch (error: unknown) {
    if (isAxiosError(error)) {
      const message = readApiMessage(error.response?.data) ?? error.message;
      logAppleAuth('error /auth/apple/login', {
        status: error.response?.status,
        message,
        responseKeys: objectKeys(error.response?.data),
      });
      throw new Error(message);
    } else {
      logAppleAuth('error /auth/apple/login', {
        message: error instanceof Error ? error.message : String(error),
      });
    }
    throw error;
  }
}

/** Backend profile can arrive as `{ result: user }` or `{ result: { user } }`. */
function unwrapResultUser(data: unknown): MeResponse | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const result = d.result;
  if (result && typeof result === 'object') {
    const u = (result as Record<string, unknown>).user;
    if (u && typeof u === 'object') return u as MeResponse;
    return result as MeResponse;
  }
  return null;
}

export async function fetchMe(): Promise<MeResponse> {
  try {
    logGoogleAuth('request /auth/me');
    const { data, status } = await api.get<unknown>('/auth/me');
    logGoogleAuth('response /auth/me', {
      status,
      rootKeys: objectKeys(data),
      resultKeys:
        data && typeof data === 'object'
          ? objectKeys((data as Record<string, unknown>).result)
          : [],
    });
    const user = unwrapResultUser(data);
    if (user) return user;
    return data as MeResponse;
  } catch (error: unknown) {
    if (isAxiosError(error)) {
      logGoogleAuth('error /auth/me', {
        status: error.response?.status,
        message: error.response?.data?.message ?? error.message,
        responseKeys: objectKeys(error.response?.data),
      });
    }
    throw error;
  }
}

/**
 * Web app parity:
 * `PUT /users/:id` with profile fields, followed by `GET /auth/me`.
 */
export async function updateProfile(
  userId: string | number,
  dto: UpdateProfileDto,
): Promise<unknown> {
  const { data } = await api.put<unknown>(`/users/${userId}`, dto);
  return data;
}

function readSignedUpload(data: unknown): { key: string; url: string } {
  const root = data as Record<string, unknown>;
  const result = root?.result as Record<string, unknown> | undefined;
  const nested = result?.data as Record<string, unknown> | undefined;
  const key = nested?.key;
  const url = nested?.url;
  if (typeof key !== 'string' || typeof url !== 'string') {
    throw new Error('Missing upload credentials.');
  }
  return { key, url };
}

function readPublicUploadUrl(data: unknown): string {
  const root = data as Record<string, unknown>;
  const result = root?.result as Record<string, unknown> | undefined;
  const signedUrl = result?.signedUrl;
  if (typeof signedUrl !== 'string' || !signedUrl) {
    throw new Error('Could not retrieve uploaded image URL.');
  }
  return signedUrl;
}

function logProfileImageUpload(message: string, details?: Record<string, unknown>) {
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    console.log(`[profile-image-upload] ${message}`, details ?? '');
  }
}

export async function uploadProfileImage(
  input: ProfileImageUploadInput,
): Promise<string> {
  const fileType = input.contentType.split('/')[1] ?? 'jpg';
  const fileSizeMb =
    input.fileSize && Number.isFinite(input.fileSize)
      ? Math.round((input.fileSize / (1024 * 1024)) * 100) / 100
      : 1;

  logProfileImageUpload('requesting signed upload URL', {
    contentType: input.contentType,
    fileType,
    fileSizeMb,
  });
  const { data } = await api.post<unknown>('/docs/signed-url', {
    fileType,
    fileSize: fileSizeMb,
    contentType: input.contentType,
  });
  const signed = readSignedUpload(data);
  logProfileImageUpload('signed upload URL received', { key: signed.key });

  logProfileImageUpload('reading local image file', { uri: input.uri });
  const fileResponse = await fetch(input.uri);
  logProfileImageUpload('local image file read', {
    ok: fileResponse.ok,
    status: fileResponse.status,
  });
  const blob = await fileResponse.blob();
  logProfileImageUpload('uploading image bytes', {
    key: signed.key,
    blobSize: blob.size,
    contentType: input.contentType,
  });
  const uploadResponse = await fetch(signed.url, {
    method: 'PUT',
    body: blob,
    headers: {
      'Content-Type': input.contentType,
    },
  });
  logProfileImageUpload('upload response received', {
    key: signed.key,
    ok: uploadResponse.ok,
    status: uploadResponse.status,
  });
  if (!uploadResponse.ok) {
    throw new Error('Image upload failed.');
  }
  logProfileImageUpload('requesting public read URL', { key: signed.key });
  const { data: publicData } = await api.get<unknown>(`/docs/signed-url/${signed.key}`);
  const publicUrl = readPublicUploadUrl(publicData);
  logProfileImageUpload('public read URL received', { key: signed.key });
  return publicUrl;
}

/**
 * `GET /auth/logout` — `AuthController_logoutUser` (Bearer required).
 * @see https://api.dropyou.co.uk/docs#/Authentication/AuthController_logoutUser
 */
export async function logoutRequest(): Promise<void> {
  await api.get('/auth/logout');
}
