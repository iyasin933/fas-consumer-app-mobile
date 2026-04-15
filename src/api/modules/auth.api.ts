import { api } from '@/api/client';
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

/**
 * DropYou API envelope: `{ status, result: { user, token: { access: { token }, refresh: { token } } } }`.
 */
function pickTokensFromResultEnvelope(o: Record<string, unknown>): {
  accessToken?: string;
  refreshToken?: string;
} {
  const result = o.result;
  if (!result || typeof result !== 'object') return {};
  const r = result as Record<string, unknown>;
  const token = r.token;
  if (!token || typeof token !== 'object') return {};
  const t = token as Record<string, unknown>;
  let accessToken: string | undefined;
  let refreshToken: string | undefined;
  const access = t.access;
  const refresh = t.refresh;
  if (access && typeof access === 'object') {
    const tok = (access as Record<string, unknown>).token;
    if (typeof tok === 'string' && tok) accessToken = tok;
  }
  if (refresh && typeof refresh === 'object') {
    const tok = (refresh as Record<string, unknown>).token;
    if (typeof tok === 'string' && tok) refreshToken = tok;
  }
  return { accessToken, refreshToken };
}

function pickTokens(payload: unknown): { accessToken?: string; refreshToken?: string } {
  const fromFlat = (o: Record<string, unknown>) => {
    const accessToken =
      (typeof o.access_token === 'string' && o.access_token) ||
      (typeof o.accessToken === 'string' && o.accessToken) ||
      undefined;
    const refreshToken =
      (typeof o.refresh_token === 'string' && o.refresh_token) ||
      (typeof o.refreshToken === 'string' && o.refreshToken) ||
      undefined;
    return { accessToken, refreshToken };
  };

  if (!payload || typeof payload !== 'object') return {};
  const p = payload as Record<string, unknown>;

  const fromDropYou = pickTokensFromResultEnvelope(p);
  if (fromDropYou.accessToken) return fromDropYou;

  if (p.data && typeof p.data === 'object') {
    const inner = pickTokensFromResultEnvelope(p.data as Record<string, unknown>);
    if (inner.accessToken) return inner;
  }

  const direct = fromFlat(p);
  if (direct.accessToken) return direct;
  if (p.data && typeof p.data === 'object') {
    const nested = fromFlat(p.data as Record<string, unknown>);
    if (nested.accessToken) return nested;
  }
  return direct;
}

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
