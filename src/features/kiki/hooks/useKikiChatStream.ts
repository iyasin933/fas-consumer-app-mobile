import { useCallback, useEffect, useRef } from 'react';

import { streamKikiChat } from '@/features/kiki/api/kikiChatApi';
import { createMessage } from '@/features/kiki/api/kikiSessionsApi';
import { kikiMessagesKey } from '@/features/kiki/hooks/useKikiSessions';
import { useKikiChatStore } from '@/features/kiki/store/kikiChatStore';
import { queryClient } from '@/lib/queryClient';
import type { KikiMessage } from '@/features/kiki/types';
import { debugLog } from '@/utils/debugLog';

/**
 * Parse an SSE stream value that may be a raw object OR a JSON string
 * (AI SDK v5 streams tool outputs as stringified JSON over SSE).
 */
function parseValue(value: unknown): Record<string, unknown> | null {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return parseValue(value);
}

function readCreateLoadResult(output: unknown): {
  success: boolean;
  loadId: number | null;
  error?: string;
} {
  const result = asRecord(output);
  const data = asRecord(result?.data);
  const rawLoadId = result?.loadId ?? data?.id;
  const loadId = Number(rawLoadId);
  return {
    success: result?.success === true && Number.isFinite(loadId) && loadId > 0,
    loadId: Number.isFinite(loadId) && loadId > 0 ? loadId : null,
    error:
      typeof result?.error === 'string'
        ? result.error
        : typeof result?.message === 'string' && result?.success === false
          ? result.message
          : undefined,
  };
}


/**
 * Persist the last user+assistant exchange to the backend session.
 * This is called after each successful AI response so chat history
 * survives app restarts and session switches.
 */
async function persistExchangeToBackend(
  userText: string,
  sessionId: string,
  conversationKey: string,
): Promise<void> {
  try {
    // Persist user message
    await createMessage({
      sessionId,
      role: 'user',
      content: userText,
    });

    // Persist assistant message (last assistant in store)
    const currentMessages =
      useKikiChatStore.getState().conversations[conversationKey]?.messages ?? [];
    const lastAssistant = [...currentMessages]
      .reverse()
      .find((m) => m.role === 'assistant');

    if (lastAssistant && lastAssistant.content) {
      await createMessage({
        sessionId,
        role: 'assistant',
        content: lastAssistant.content,
      });
    }
    await queryClient.invalidateQueries({
      queryKey: kikiMessagesKey(sessionId),
      exact: true,
    });
  } catch (err: unknown) {
    debugLog('KikiChat', 'Failed to persist exchange to backend', {
      error: err instanceof Error ? err.message : String(err),
    });
    // Non-critical — don't break the UI for persistence failures
  }
}

/**
 * Hook that wires up the streaming chat transport to the Zustand chat store.
 *
 * Usage:
 *   const { send, abort } = useKikiChatStream(activeConversationKey);
 *   void send('Hello Kiki!');
 */
export function useKikiChatStream(activeConversationKey: string | null) {
  const abortRef = useRef<AbortController | null>(null);
  const streamConversationKeyRef = useRef<string | null>(null);
  const previousConversationKeyRef = useRef<string | null>(
    activeConversationKey,
  );

  useEffect(() => {
    if (
      previousConversationKeyRef.current &&
      previousConversationKeyRef.current !== activeConversationKey
    ) {
      const previousKey = previousConversationKeyRef.current;
      if (
        streamConversationKeyRef.current &&
        streamConversationKeyRef.current !== activeConversationKey
      ) {
        abortRef.current?.abort();
      }
      if (useKikiChatStore.getState().conversations[previousKey]) {
        useKikiChatStore.getState().setStatus(previousKey, 'idle');
      }
    }
    previousConversationKeyRef.current = activeConversationKey;
  }, [activeConversationKey]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const buildMessagePayload = useCallback(
    (conversationKey: string, text: string) => {
      const messages =
        useKikiChatStore.getState().conversations[conversationKey]?.messages ?? [];
      const uiMessages = [
        ...messages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          parts: [{ type: 'text', text: m.content }],
        })),
        { role: 'user', parts: [{ type: 'text', text }] },
      ];

      return uiMessages as {
        role: string;
        parts: { type: string; text: string }[];
      }[];
    },
    [],
  );

  const send = useCallback(
    async (text: string, conversationKey: string, sessionId: string | null) => {
      if (!text.trim() || !conversationKey) return;

      // Abort any in-flight stream
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      streamConversationKeyRef.current = conversationKey;

      const payload = buildMessagePayload(conversationKey, text);

      // Add user message to store
      const userMsg: KikiMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
      };
      const store = useKikiChatStore.getState();
      store.addMessage(conversationKey, userMsg);
      store.setStatus(conversationKey, 'streaming');

      debugLog('KikiChat', 'sending message', {
        messageCount: payload.length,
        text,
      });

      try {
        const stream = streamKikiChat(payload, abortRef.current.signal);
        let gotContent = false;
        let createLoadSucceeded = false;
        let createLoadWasCalled = false;
        let createLoadFailed = false;

        for await (const chunk of stream) {
          switch (chunk.type) {
            case 'text-delta':
              gotContent = true;
              useKikiChatStore
                .getState()
                .appendToLastAssistantMessage(conversationKey, chunk.textDelta);
              break;
            case 'tool-call':
              debugLog('KikiChat', `tool ${chunk.phase}`, {
                toolName: chunk.toolName,
                toolCallId: chunk.toolCallId,
                input: chunk.input,
                output: chunk.output,
              });
              if (chunk.toolName === 'createLoad') {
                createLoadWasCalled = true;
                if (chunk.phase === 'output') {
                  const result = readCreateLoadResult(chunk.output);
                  if (result.success && result.loadId) {
                    createLoadSucceeded = true;
                    debugLog('KikiChat', 'createLoad verified', {
                      loadId: result.loadId,
                    });
                    useKikiChatStore
                      .getState()
                      .startFindingQuotes(conversationKey, result.loadId);
                  } else {
                    createLoadFailed = true;
                    debugLog('KikiChat', 'createLoad failed verification', {
                      loadId: result.loadId,
                      error: result.error,
                      output: chunk.output,
                    });
                    useKikiChatStore.getState().setStatus(
                      conversationKey,
                      'error',
                      result.error ?? 'The booking was not created by the backend.',
                    );
                  }
                }
              }
              if (chunk.toolName === 'getAvailableVehicles' && chunk.phase === 'output') {
                debugLog('KikiChat', 'vehicle list received', {
                  output: chunk.output,
                });
              }
              break;
            case 'error':
              useKikiChatStore
                .getState()
                .setStatus(conversationKey, 'error', chunk.message);
              return;
            case 'done':
              // fall through to set idle below
              break;
          }
        }

        const conversation =
          useKikiChatStore.getState().conversations[conversationKey];
        const latestAssistant = [...(conversation?.messages ?? [])]
          .reverse()
          .find((message) => message.role === 'assistant');
        if (
          latestAssistant?.content.includes(
            'Your booking has been created successfully',
          ) &&
          !createLoadSucceeded
        ) {
          debugLog('KikiChat', 'unverified booking claim blocked', {
            createLoadWasCalled,
            assistantMessage: latestAssistant?.content,
          });
          const currentMessages =
            useKikiChatStore.getState().conversations[conversationKey]?.messages ?? [];
          let lastAssistantIndex = -1;
          for (let index = currentMessages.length - 1; index >= 0; index -= 1) {
            if (currentMessages[index]?.role === 'assistant') {
              lastAssistantIndex = index;
              break;
            }
          }
          if (lastAssistantIndex >= 0) {
            const nextMessages = [...currentMessages];
            nextMessages[lastAssistantIndex] = {
              ...nextMessages[lastAssistantIndex],
              content:
                'I could not verify that this booking was created. No load ID was returned by the create-load tool, so quote tracking was not started.',
            };
            useKikiChatStore
              .getState()
              .setMessages(conversationKey, nextMessages);
          }
          useKikiChatStore.getState().setStatus(
            conversationKey,
            'error',
            createLoadWasCalled
              ? 'The backend did not verify this booking.'
              : 'Kiki did not call the create-load tool. No quote subscription was started.',
          );
          return;
        }

        if (createLoadFailed) return;

        useKikiChatStore
          .getState()
          .setStatus(
            conversationKey,
            gotContent ? 'idle' : 'error',
            gotContent ? null : 'No response',
          );

        // Persist messages to backend for session history
        if (sessionId) {
          void persistExchangeToBackend(text, sessionId, conversationKey);
        }
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') {
          useKikiChatStore.getState().setStatus(conversationKey, 'idle');
          return;
        }
        const message = err instanceof Error ? err.message : 'Stream failed';
        useKikiChatStore
          .getState()
          .setStatus(conversationKey, 'error', message);
      }
    },
    [buildMessagePayload],
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
    const activeConversationKey =
      useKikiChatStore.getState().activeConversationKey;
    if (activeConversationKey) {
      useKikiChatStore
        .getState()
        .setStatus(activeConversationKey, 'idle');
    }
  }, []);

  return { send, abort };
}
