import { useMemo } from 'react';

import { useAuth } from '@/hooks/useAuth';

/** Avatar initial + sign-out for header (tokens stay in SecureStore). */
export function useHomeProfile() {
  const { user, signOut } = useAuth();

  const initial = useMemo(() => {
    const u = user as Record<string, unknown> | null;
    const first = typeof u?.firstName === 'string' ? u.firstName : '';
    const email = typeof u?.email === 'string' ? u.email : '';
    const letter = (first[0] ?? email[0] ?? 'D').toUpperCase();
    return letter;
  }, [user]);

  return { initial, signOut };
}
