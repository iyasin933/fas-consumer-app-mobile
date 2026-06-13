import { api } from '@/api/client';
import { env } from '@/shared/config/env';
import type {
  ApiResponse,
  BackendApiResponse,
  CreateMessagePayload,
  CreateSessionPayload,
  KikiMessage,
  KikiSession,
  MessagesQueryParams,
  PaginatedResponse,
  PaginationMeta,
  SessionsQueryParams,
  UpdateSessionPayload,
} from '@/features/kiki/types';

const AI_CHAT_BASE = `${env.apiUrl}/ai-chat`;

function extractPaginationMeta(source: unknown): PaginationMeta {
  const fallback: PaginationMeta = {
    page: 1,
    take: 10,
    itemCount: 0,
    pageCount: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  };
  if (!source || typeof source !== 'object') return fallback;
  const m = source as Record<string, unknown>;
  return {
    page: (typeof m.page === 'number' ? m.page : null) ?? fallback.page,
    take: (typeof m.take === 'number' ? m.take : null) ?? fallback.take,
    itemCount:
      (typeof m.itemCount === 'number' ? m.itemCount : null) ??
      fallback.itemCount,
    pageCount:
      (typeof m.pageCount === 'number' ? m.pageCount : null) ??
      fallback.pageCount,
    hasPreviousPage:
      (typeof m.hasPreviousPage === 'boolean'
        ? m.hasPreviousPage
        : null) ?? fallback.hasPreviousPage,
    hasNextPage:
      (typeof m.hasNextPage === 'boolean' ? m.hasNextPage : null) ??
      fallback.hasNextPage,
  };
}

function unwrapResult<T>(data: unknown): T | null {
  if (!data || typeof data !== 'object') return null;
  const body = data as BackendApiResponse<T>;
  if (body.result !== undefined) return body.result ?? null;
  return null;
}

function unwrapPaginatedResult<T>(
  data: unknown,
  params?: { page?: number; limit?: number },
): { items: T[]; meta: PaginationMeta } {
  const fallbackMeta: PaginationMeta = {
    page: params?.page ?? 1,
    take: params?.limit ?? 10,
    itemCount: 0,
    pageCount: 0,
    hasPreviousPage: false,
    hasNextPage: false,
  };

  if (!data || typeof data !== 'object') return { items: [], meta: fallbackMeta };

  const body = data as BackendApiResponse<T[] | { data: T[]; meta: unknown }> & {
    result?: T[] | { data: T[]; meta: unknown };
  };

  const result = body.result;

  // Direct array
  if (Array.isArray(result)) {
    return {
      items: result,
      meta: (result as unknown as Record<string, unknown>)?.meta
        ? extractPaginationMeta((result as unknown as Record<string, unknown>).meta)
        : fallbackMeta,
    };
  }

  // Object with data array
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    const obj = result as { data?: T[]; meta?: unknown };
    if (Array.isArray(obj.data)) {
      return {
        items: obj.data,
        meta: obj.meta ? extractPaginationMeta(obj.meta) : fallbackMeta,
      };
    }
  }

  // Fallback: check if result is a direct array-like on body
  if (Array.isArray(body.result)) {
    return { items: body.result as T[], meta: fallbackMeta };
  }

  return { items: [], meta: fallbackMeta };
}

/** GET /ai-chat/sessions */
export async function fetchSessions(
  params?: SessionsQueryParams,
): Promise<PaginatedResponse<KikiSession>> {
  const res = await api.get<unknown>(`${AI_CHAT_BASE}/sessions`, { params });
  const { items, meta } = unwrapPaginatedResult<KikiSession>(res.data, {
    page: params?.page,
    limit: params?.limit,
  });
  return {
    data: items,
    meta,
    message: 'Sessions retrieved',
  };
}

/** POST /ai-chat/sessions */
export async function createSession(
  payload: CreateSessionPayload,
): Promise<ApiResponse<KikiSession>> {
  const res = await api.post<BackendApiResponse<KikiSession>>(
    `${AI_CHAT_BASE}/sessions`,
    payload,
  );
  return { data: unwrapResult<KikiSession>(res.data), message: '' };
}

/** GET /ai-chat/sessions/:id (includes messages) */
export async function fetchSession(
  id: string,
): Promise<ApiResponse<KikiSession & { messages?: KikiMessage[] }>> {
  const res = await api.get<BackendApiResponse<KikiSession & { messages?: KikiMessage[] }>>(
    `${AI_CHAT_BASE}/sessions/${id}`,
  );
  return { data: unwrapResult(res.data), message: '' };
}

/** PATCH /ai-chat/sessions/:id */
export async function updateSession(
  id: string,
  payload: UpdateSessionPayload,
): Promise<ApiResponse<KikiSession>> {
  const res = await api.patch<BackendApiResponse<KikiSession>>(
    `${AI_CHAT_BASE}/sessions/${id}`,
    payload,
  );
  return { data: unwrapResult<KikiSession>(res.data), message: '' };
}

/** DELETE /ai-chat/sessions/:id */
export async function deleteSessionApi(
  id: string,
): Promise<void> {
  await api.delete(`${AI_CHAT_BASE}/sessions/${id}`);
}

/** POST /ai-chat/messages */
export async function createMessage(
  payload: CreateMessagePayload,
): Promise<ApiResponse<KikiMessage>> {
  const res = await api.post<BackendApiResponse<KikiMessage>>(
    `${AI_CHAT_BASE}/messages`,
    payload,
  );
  return { data: unwrapResult<KikiMessage>(res.data), message: '' };
}

/** GET /ai-chat/messages/session/:sessionId */
export async function fetchMessages(
  sessionId: string,
  params?: MessagesQueryParams,
): Promise<PaginatedResponse<KikiMessage>> {
  const res = await api.get<unknown>(
    `${AI_CHAT_BASE}/messages/session/${sessionId}`,
    { params },
  );
  const { items, meta } = unwrapPaginatedResult<KikiMessage>(res.data, {
    page: params?.page,
    limit: params?.limit,
  });
  return {
    data: items,
    meta,
    message: 'Messages retrieved',
  };
}