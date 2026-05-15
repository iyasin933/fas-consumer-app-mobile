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

/** Same envelope style as login when profile is under `result.user`. */
function unwrapResultUser(data: unknown): MeResponse | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const result = d.result;
  if (result && typeof result === 'object') {
    const u = (result as Record<string, unknown>).user;
    if (u && typeof u === 'object') return u as MeResponse;
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
 * `GET /auth/logout` — `AuthController_logoutUser` (Bearer required).
 * @see https://api.dropyou.co.uk/docs#/Authentication/AuthController_logoutUser
 */
export async function logoutRequest(): Promise<void> {
  await api.get('/auth/logout');
}
