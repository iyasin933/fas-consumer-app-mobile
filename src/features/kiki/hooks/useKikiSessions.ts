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
  UpdateSessionPayload,
} from '@/features/kiki/types';
import { useAuthStore } from '@/store/authStore';

export const KIKI_SESSIONS_KEY = ['kiki', 'sessions'] as const;
export const kikiSessionKey = (id: string) =>
  ['kiki', 'session', id] as const;
export const kikiMessagesKey = (
  sessionId: string,
  page = 1,
  limit = 50,
) => ['kiki', 'conversation', sessionId, 'messages', { page, limit }] as const;

/** List all non‑archived chat sessions. */
export function useKikiSessions(page = 1, limit = 50) {
  return useQuery({
    queryKey: [...KIKI_SESSIONS_KEY, { page, limit }],
    queryFn: () => fetchSessions({ page, limit, isArchived: false }),
    retry: 2,
  });
}

/** Fetch a single session by id. */
export function useKikiSession(id: string | null) {
  return useQuery({
    queryKey: kikiSessionKey(id!),
    queryFn: ({ signal }) => fetchSession(id!, signal),
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
    queryKey: kikiMessagesKey(sessionId!, page, limit),
    queryFn: ({ signal }) =>
      fetchMessages(sessionId!, { page, limit }, signal),
    enabled: !!sessionId,
    retry: 2,
    placeholderData: undefined,
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
      void queryClient.invalidateQueries({ queryKey: KIKI_SESSIONS_KEY });
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
      void queryClient.invalidateQueries({ queryKey: kikiSessionKey(id) });
      void queryClient.invalidateQueries({ queryKey: KIKI_SESSIONS_KEY });
    },
  });
}

/** Delete (archive) a session. */
export function useDeleteKikiSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteSessionApi(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: kikiSessionKey(id) });
      queryClient.removeQueries({
        queryKey: ['kiki', 'conversation', id],
      });
      void queryClient.invalidateQueries({ queryKey: KIKI_SESSIONS_KEY });
    },
  });
}
