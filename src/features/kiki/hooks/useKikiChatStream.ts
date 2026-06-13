import { useCallback, useRef } from 'react';

import { streamKikiChat, type ChatStreamChunk } from '@/features/kiki/api/kikiChatApi';
import { useKikiChatStore } from '@/features/kiki/store/kikiChatStore';
import type { KikiMessage } from '@/features/kiki/types';
import { useAuthStore } from '@/store/authStore';

/**
 * Hook that wires up the streaming chat transport to the Zustand chat store.
 *
 * Usage:
 *   const { send, abort } = useKikiChatStream();
 *   void send('Hello Kiki!');
 */
export function useKikiChatStream() {
  const abortRef = useRef<AbortController | null>(null);
  const savedMessageIdsRef = useRef<Set<string>>(new Set());

  const appendToLastAssistantMessage = useKikiChatStore(
    (s) => s.appendToLastAssistantMessage,
  );
  const addMessage = useKikiChatStore((s) => s.addMessage);
  const setStatus = useKikiChatStore((s) => s.setStatus);
  const messages = useKikiChatStore((s) => s.messages);

  const buildMessagePayload = useCallback(
    (text: string) => {
      const user = useAuthStore.getState().user;

      const uiMessages = [
        ...messages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          parts: [{ type: 'text', text: m.content }],
        })),
        { role: 'user', parts: [{ type: 'text', text }] },
      ];

      return uiMessages as Array<{
        role: string;
        parts: Array<{ type: string; text: string }>;
      }>;
    },
    [messages],
  );

  const send = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      // Abort any in-flight stream
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      // Add user message to store
      const userMsg: KikiMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: text,
      };
      addMessage(userMsg);
      setStatus('streaming');

      const payload = buildMessagePayload(text);

      try {
        const stream = streamKikiChat(payload, abortRef.current.signal);
        let gotContent = false;

        for await (const chunk of stream) {
          switch (chunk.type) {
            case 'text-delta':
              gotContent = true;
              appendToLastAssistantMessage(chunk.textDelta);
              break;
            case 'tool-call':
              // Tool calls are handled server-side; the AI will emit
              // text-delta with the response afterwards.
              break;
            case 'error':
              setStatus('error', chunk.message);
              return;
            case 'done':
              // fall through to set idle below
              break;
          }
        }

        setStatus(gotContent ? 'idle' : 'error', gotContent ? null : 'No response');
      } catch (err: unknown) {
        if ((err as Error)?.name === 'AbortError') {
          setStatus('idle');
          return;
        }
        const message = err instanceof Error ? err.message : 'Stream failed';
        setStatus('error', message);
      }
    },
    [
      addMessage,
      appendToLastAssistantMessage,
      buildMessagePayload,
      setStatus,
    ],
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setStatus('idle');
  }, [setStatus]);

  return { send, abort };
}