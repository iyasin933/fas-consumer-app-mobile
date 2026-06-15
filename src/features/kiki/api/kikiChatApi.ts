import { fetch as expoFetch } from 'expo/fetch';

import { env } from '@/shared/config/env';
import { getAccessToken, getRefreshToken } from '@/services/tokenStorage';
import { useAuthStore } from '@/store/authStore';

/** Server‑Sent Event chunk yielded by the streaming reader. */
export type ChatStreamChunk =
  | { type: 'text-delta'; textDelta: string }
  | {
      type: 'tool-call';
      phase: 'input' | 'output';
      toolCallId?: string;
      toolName: string;
      input?: unknown;
      output?: unknown;
    }
  | { type: 'error'; message: string }
  | { type: 'done' };

/**
 * Call the Vercel AI SDK chat endpoint with Server‑Sent Events streaming.
 *
 * The backend expects the same shape as `useChat` from `@ai-sdk/react`:
 * `POST /api/chat` with `{ messages: [{ role, parts: [{ type:"text", text }] }] }`.
 *
 * Returns an async generator that yields `ChatStreamChunk` objects.
 */
export async function* streamKikiChat(
  messages: { role: string; parts: { type: string; text: string }[] }[],
  abortSignal?: AbortSignal,
): AsyncGenerator<ChatStreamChunk> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'text/event-stream',
  };

  const accessToken = await getAccessToken();
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    headers['x-refresh-token'] = `Bearer ${refreshToken}`;
  }

  const user = useAuthStore.getState().user;
  if (user?.id) {
    headers['x-user-id'] = String(user.id);
  }

  let response: Response;
  try {
    response = await expoFetch(env.kikiChatUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ messages }),
      signal: abortSignal,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to connect';
    yield { type: 'error', message };
    return;
  }

  if (!response.ok) {
    let detail = '';
    try {
      const body = (await response.json()) as { error?: string; details?: string };
      detail = body.error || body.details || '';
    } catch {
      // ignore parse errors
    }
    yield {
      type: 'error',
      message: detail || `Server responded with ${response.status}`,
    };
    return;
  }

  if (!response.body) {
    yield { type: 'error', message: 'No response body' };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const toolNames = new Map<string, string>();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE lines
      const lines = buffer.split('\n');
      // Keep the last (potentially incomplete) line in the buffer
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // SSE format: `data: {...}`
        if (trimmed.startsWith('data: ')) {
          const jsonStr = trimmed.slice(6);
          if (jsonStr === '[DONE]') {
            yield { type: 'done' };
            return;
          }
          try {
            const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
            const eventType =
              typeof parsed.type === 'string' ? parsed.type : 'unknown';
            if (__DEV__ && eventType.startsWith('tool-')) {
              console.warn('[KikiChatApi] stream event', eventType, parsed);
            }
            yield* parseSSEChunk(parsed, toolNames);
          } catch {
            // Skip malformed JSON
            if (__DEV__) {
              console.warn('[KikiChatApi] Skipped malformed SSE line:', jsonStr);
            }
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Process any remaining buffer
  if (buffer.trim().startsWith('data: ')) {
    const jsonStr = buffer.trim().slice(6);
    if (jsonStr !== '[DONE]') {
      try {
        const parsed = JSON.parse(jsonStr) as Record<string, unknown>;
        yield* parseSSEChunk(parsed, toolNames);
      } catch {
        // skip
      }
    }
  }

  yield { type: 'done' };
}

/**
 * Parse an individual SSE data chunk into one or more ChatStreamChunks.
 * Handles the Vercel AI SDK stream format.
 */
async function* parseSSEChunk(
  parsed: Record<string, unknown>,
  toolNames: Map<string, string>,
): AsyncGenerator<ChatStreamChunk> {
  // Direct text-delta
  if (typeof parsed.textDelta === 'string') {
    yield { type: 'text-delta', textDelta: parsed.textDelta };
    return;
  }

  // type-based dispatch
  const type = typeof parsed.type === 'string' ? parsed.type : '';

  switch (type) {
    case 'text-delta': {
      const textDelta =
        typeof parsed.delta === 'string'
          ? parsed.delta
          : typeof parsed.textDelta === 'string'
            ? parsed.textDelta
            : '';
      yield { type: 'text-delta', textDelta };
      break;
    }
    case 'tool-input-start':
    case 'tool-input-available':
    case 'tool-call': {
      const toolCallId =
        typeof parsed.toolCallId === 'string' ? parsed.toolCallId : undefined;
      const toolName =
        typeof parsed.toolName === 'string'
          ? parsed.toolName
          : toolCallId
            ? toolNames.get(toolCallId) ?? ''
            : '';
      if (toolCallId && toolName) toolNames.set(toolCallId, toolName);
      yield {
        type: 'tool-call',
        phase: 'input',
        toolCallId,
        toolName,
        input: parsed.input,
      };
      break;
    }
    case 'tool-output-available':
    case 'tool-result': {
      const toolCallId =
        typeof parsed.toolCallId === 'string' ? parsed.toolCallId : undefined;
      const toolName =
        typeof parsed.toolName === 'string'
          ? parsed.toolName
          : toolCallId
            ? toolNames.get(toolCallId) ?? ''
            : '';
      yield {
        type: 'tool-call',
        phase: 'output',
        toolCallId,
        toolName,
        output: parsed.output ?? parsed.result,
      };
      break;
    }
    case 'tool-output-error':
    case 'tool-error': {
      yield {
        type: 'error',
        message:
          typeof parsed.errorText === 'string'
            ? parsed.errorText
            : typeof parsed.error === 'string'
              ? parsed.error
              : 'Kiki tool execution failed',
      };
      break;
    }
    case 'finish':
    case 'done': {
      yield { type: 'done' };
      break;
    }
    case 'error': {
      yield {
        type: 'error',
        message:
          typeof parsed.message === 'string'
            ? parsed.message
            : typeof parsed.error === 'string'
              ? parsed.error
              : 'Unknown error',
      };
      break;
    }
    default: {
      // AI SDK may send chunks without a "type" field but with textDelta directly
      if (typeof parsed.textDelta === 'string') {
        yield { type: 'text-delta', textDelta: parsed.textDelta };
      }
      // Otherwise it might be a generic stream part; skip unhandled types
      break;
    }
  }
}

/**
 * Non-streaming fallback: POST /api/chat that returns the complete assistant
 * response in one JSON payload. Used when streaming is unavailable or errors.
 */
export async function sendKikiMessageSync(
  messages: { role: string; parts: { type: string; text: string }[] }[],
): Promise<{ content: string }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  const accessToken = await getAccessToken();
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const refreshToken = await getRefreshToken();
  if (refreshToken) {
    headers['x-refresh-token'] = `Bearer ${refreshToken}`;
  }

  const user = useAuthStore.getState().user;
  if (user?.id) {
    headers['x-user-id'] = String(user.id);
  }

  // Request non-streaming by omitting Accept: text/event-stream
  const response = await expoFetch(env.kikiChatUrl, {
    method: 'POST',
    headers,
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    let detail = '';
    try {
      const body = (await response.json()) as { error?: string };
      detail = body.error || '';
    } catch {
      // ignore
    }
    throw new Error(detail || `Server responded with ${response.status}`);
  }

  const data = (await response.json()) as { content?: string; text?: string };
  return { content: data.content ?? data.text ?? '' };
}
