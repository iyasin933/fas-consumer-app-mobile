import { api } from '@/api/client';
import { pickTokens } from '@/api/authTokens';
import type {
  ForgotPasswordCompleteDto,
  ForgotPasswordInitiateDto,
  GoogleLoginDto,
  MeResponse,
  UserLoginDto,
  UserSignupDto,
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

export async function forgotPasswordInitiate(
  dto: ForgotPasswordInitiateDto,
): Promise<unknown> {
  const { data } = await api.post<unknown>('/auth/password/forgot/initiate', dto);
  return data;
}

export async function forgotPasswordComplete(dto: ForgotPasswordCompleteDto): Promise<AuthTokensResult> {
  const { data } = await api.post<unknown>('/auth/password/forgot/complete', dto);
  return withTokens(data);
}

export async function googleLogin(dto: GoogleLoginDto): Promise<AuthTokensResult> {
  const { data } = await api.post<unknown>('/auth/google/login', {
    ...dto,
    source: dto.source ?? 'mobile',
  });
  return withTokens(data);
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
  const { data } = await api.get<unknown>('/auth/me');
  const user = unwrapResultUser(data);
  if (user) return user;
  return data as MeResponse;
}

/**
 * Web app parity:
 * `PUT /users/:id` with profile fields, followed by `GET /auth/me`.
 */
export async function updateProfile(userId: string | number, dto: UpdateProfileDto): Promise<unknown> {
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

export async function uploadProfileImage(input: ProfileImageUploadInput): Promise<string> {
  const fileType = input.contentType.split('/')[1] ?? 'jpg';
  const fileSizeMb =
    input.fileSize && Number.isFinite(input.fileSize)
      ? Math.round((input.fileSize / (1024 * 1024)) * 100) / 100
      : 1;

  const { data } = await api.post<unknown>('/docs/signed-url', {
    fileType,
    fileSize: fileSizeMb,
    contentType: input.contentType,
  });
  const signed = readSignedUpload(data);
  const fileResponse = await fetch(input.uri);
  const blob = await fileResponse.blob();
  const uploadResponse = await fetch(signed.url, {
    method: 'PUT',
    body: blob,
    headers: {
      'Content-Type': input.contentType,
    },
  });
  if (!uploadResponse.ok) {
    throw new Error('Image upload failed.');
  }
  const { data: publicData } = await api.get<unknown>(`/docs/signed-url/${signed.key}`);
  return readPublicUploadUrl(publicData);
}

/**
 * `GET /auth/logout` — `AuthController_logoutUser` (Bearer required).
 * @see https://api.dropyou.co.uk/docs#/Authentication/AuthController_logoutUser
 */
export async function logoutRequest(): Promise<void> {
  await api.get('/auth/logout');
}
