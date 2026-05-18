import { useMemo } from 'react';

import { useAuth } from '@/hooks/useAuth';

function pickString(record: Record<string, unknown> | null, keys: string[]): string {
  if (!record) return '';
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function pickStringDeep(record: Record<string, unknown> | null, keys: string[]): string {
  if (!record) return '';
  const direct = pickString(record, keys);
  if (direct) return direct;

  const nestedKeys = ['user', 'profile', 'result'];
  for (const nestedKey of nestedKeys) {
    const nested = record[nestedKey];
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const value = pickStringDeep(nested as Record<string, unknown>, keys);
      if (value) return value;
    }
  }
  return '';
}

function pickNestedString(record: Record<string, unknown> | null, paths: string[][]): string {
  if (!record) return '';
  for (const path of paths) {
    let current: unknown = record;
    for (const key of path) {
      if (!current || typeof current !== 'object') {
        current = undefined;
        break;
      }
      current = (current as Record<string, unknown>)[key];
    }
    if (typeof current === 'string' && current.trim()) return current.trim();
  }
  return '';
}

/** Avatar image/initials + sign-out for header (tokens stay in SecureStore). */
export function useHomeProfile() {
  const { user, signOut } = useAuth();

  const profile = useMemo(() => {
    const u = user as Record<string, unknown> | null;
    const first = pickStringDeep(u, ['firstName', 'first_name', 'givenName', 'given_name']);
    const last = pickStringDeep(u, ['lastName', 'last_name', 'familyName', 'family_name']);
    const avatarUrl =
      pickString(u, ['avatarUrl', 'avatar_url', 'profileImage', 'profile_image', 'imageUrl', 'image_url', 'photoUrl', 'photo_url', 'picture']) ||
      pickNestedString(u, [
        ['avatar', 'url'],
        ['profile', 'imageUrl'],
        ['profile', 'image_url'],
        ['profile', 'photoUrl'],
        ['profile', 'photo_url'],
        ['user', 'avatarUrl'],
        ['user', 'imageUrl'],
      ]);

    const initials = `${first[0] ?? ''}${last[0] ?? ''}`.toUpperCase() || '?';

    return { avatarUrl, initials };
  }, [user]);

  return { ...profile, signOut };
}
