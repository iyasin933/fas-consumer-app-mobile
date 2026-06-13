import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createSession,
  deleteSessionApi,
  fetchMessages,
  fetchSession,
  fetchSessions,
  updateSession,
} from '@/features/kiki/api/kikiSessionsApi';
import type {
  CreateSessionPayload,
  KikiSession,
  UpdateSessionPayload,
} from '@/features/kiki/types';
import { useAuthStore } from '@/store/authStore';

const SESSIONS_KEY = ['kiki', 'sessions'] as const;
const sessionKey = (id: string) => [...SESSIONS_KEY, id] as const;
const messagesKey = (sessionId: string) =>
  [...SESSIONS_KEY, 'messages', sessionId] as const;

/** List all non‑archived chat sessions. */
export function useKikiSessions(page = 1, limit = 50) {
  return useQuery({
    queryKey: [...SESSIONS_KEY, { page, limit }],
    queryFn: () => fetchSessions({ page, limit, isArchived: false }),
    retry: 2,
  });
}

/** Fetch a single session by id. */
export function useKikiSession(id: string | null) {
  return useQuery({
    queryKey: sessionKey(id!),
    queryFn: () => fetchSession(id!),
    enabled: !!id,
    retry: 2,
  });
}

/** Fetch messages for a session. */
export function useKikiMessages(
  sessionId: string | null,
  page = 1,
  limit = 50,
) {
  return useQuery({
    queryKey: [...messagesKey(sessionId!), { page, limit }],
    queryFn: () => fetchMessages(sessionId!, { page, limit }),
    enabled: !!sessionId,
    retry: 2,
  });
}

/** Create a new session on the backend. */
export function useCreateKikiSession() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: (payload: Omit<CreateSessionPayload, 'userId'>) =>
      createSession({
        ...payload,
        userId: user?.id ? Number(user.id) : undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
    },
  });
}

/** Update a session (title, archive). */
export function useUpdateKikiSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateSessionPayload;
    }) => updateSession(id, payload),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: sessionKey(id) });
      void queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
    },
  });
}

/** Delete (archive) a session. */
export function useDeleteKikiSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSessionApi(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: sessionKey(id) });
      void queryClient.invalidateQueries({ queryKey: SESSIONS_KEY });
    },
  });
}