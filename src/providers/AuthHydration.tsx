import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';

import { hydrateAuthSession } from '@/services/authSession.service';

/**
 * Runs once on app start: SecureStore migration + token read + optional /auth/me.
 * Keeps session state out of individual screens.
 */
export function AuthHydration({ children }: PropsWithChildren) {
  useEffect(() => {
    void hydrateAuthSession();
  }, []);
  return <>{children}</>;
}
