/**
 * DropYou auth responses vary by endpoint/version. Keep token extraction in
 * one place so login, OTP, password reset, Google auth, and refresh all agree.
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

export function pickTokens(payload: unknown): { accessToken?: string; refreshToken?: string } {
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
