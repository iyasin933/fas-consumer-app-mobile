import { create } from 'zustand';

import type { AuthSession, AuthUserProfile } from '@/types/auth.types';

type AuthState = {
  session: AuthSession;
  /** Hydration finished (SecureStore read + optional /me attempt done) */
  isReady: boolean;
  /** Current user profile; token is never stored here */
  user: AuthUserProfile | null;
  setSession: (patch: Partial<Pick<AuthState, 'session' | 'user' | 'isReady'>>) => void;
  setAuthedUser: (user: AuthUserProfile) => void;
  clearSession: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
  session: 'loading',
  isReady: false,
  user: null,
  setSession: (patch) => set((s) => ({ ...s, ...patch })),
  setAuthedUser: (user) => set({ user, session: 'authed' }),
  clearSession: () => set({ user: null, session: 'guest' }),
}));
