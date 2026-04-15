import type { AuthUserProfile } from '@/types/auth.types';

/** Normalize string/number ids from API shapes. */
export function coerceNumericId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return null;
}

/**
 * Read `userId` / `id` from JWT payload (no verification — transport already authenticated).
 * DropYou access tokens use `userId` in the claim set.
 */
export function userIdFromJwt(accessToken: string | null | undefined): number | null {
  if (!accessToken || typeof accessToken !== 'string') return null;
  const parts = accessToken.split('.');
  if (parts.length < 2) return null;
  try {
    const segment = parts[1];
    const padded = segment + '='.repeat((4 - (segment.length % 4)) % 4);
    const b64 = padded.replace(/-/g, '+').replace(/_/g, '/');
    const payloadJson = globalThis.atob(b64);
    const payload = JSON.parse(payloadJson) as Record<string, unknown>;
    return (
      coerceNumericId(payload.userId) ??
      coerceNumericId(payload.user_id) ??
      coerceNumericId(payload.id) ??
      coerceNumericId(payload.sub)
    );
  } catch {
    return null;
  }
}

/** Walk `/auth/me` user blob + common envelope leftovers (e.g. full `data` cached as profile). */
export function pickUserIdFromProfile(user: AuthUserProfile | null): number | null {
  if (!user || typeof user !== 'object') return null;
  const r = user as Record<string, unknown>;
  const direct =
    coerceNumericId(r.id) ?? coerceNumericId(r.userId) ?? coerceNumericId(r.user_id);
  if (direct != null) return direct;

  const nestedUser = r.user;
  if (nestedUser && typeof nestedUser === 'object') {
    const u = nestedUser as Record<string, unknown>;
    const n =
      coerceNumericId(u.id) ?? coerceNumericId(u.userId) ?? coerceNumericId(u.user_id);
    if (n != null) return n;
  }

  const res = r.result;
  if (res && typeof res === 'object' && !Array.isArray(res)) {
    const ru = (res as Record<string, unknown>).user;
    if (ru && typeof ru === 'object') {
      const u = ru as Record<string, unknown>;
      return (
        coerceNumericId(u.id) ?? coerceNumericId(u.userId) ?? coerceNumericId(u.user_id) ?? null
      );
    }
  }

  return null;
}
