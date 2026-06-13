import { create } from 'zustand';

import type { KikiMessage, KikiQuote } from '@/features/kiki/types';

export type ChatStatus = 'idle' | 'streaming' | 'error';

export interface KikiChatState {
  /** All messages in the current conversation. */
  messages: KikiMessage[];
  /** Current streaming/loading status. */
  status: ChatStatus;
  /** Last error message, if any. */
  error: string | null;

  /** Active session id (null = no session yet). */
  currentSessionId: string | null;

  /** Whether the welcome screen or the chat view is shown. */
  showChat: boolean;
  /** Pre‑filled initial message (from quick‑action button). */
  initialMessage: string | undefined;
  /** Message a guest typed before being asked to sign in. Fired automatically after login. */
  pendingGuestMessage: string | null;

  /** Real‑time quotes received via Socket.IO after a booking. */
  quotes: KikiQuote[];
  /** True while waiting for the first quote after a booking. */
  isFindingQuotes: boolean;
  /** The load/booking id that quotes belong to. */
  currentLoadId: number | null;
  /** The quote id that the user accepted (or null). */
  acceptedQuoteId: string | number | null;

  // ── Actions ──

  /** Set the initial message and transition to chat view. */
  startChat: (message?: string) => void;
  /** Go back to the welcome screen (new chat). */
  newChat: () => void;
  /** Load an existing session. */
  setSession: (sessionId: string) => void;

  /** Add a user or assistant message to the list. */
  addMessage: (message: KikiMessage) => void;
  /** Append delta text to the last assistant message (streaming). */
  appendToLastAssistantMessage: (delta: string) => void;
  /** Mark streaming as started / done / errored. */
  setStatus: (status: ChatStatus, error?: string | null) => void;
  /** Bulk‑replace messages (e.g. on session load). */
  setMessages: (messages: KikiMessage[]) => void;

  /** Set the active load id and begin waiting for quotes. */
  startFindingQuotes: (loadId: number) => void;
  /** Add or update a received quote. */
  upsertQuote: (quote: KikiQuote) => void;
  /** Mark quote‑finding as complete. */
  stopFindingQuotes: () => void;
  /** Mark a quote as accepted. */
  setAcceptedQuoteId: (quoteId: string | number | null) => void;
  /** Clear quotes for a new booking cycle. */
  clearQuotes: () => void;

  /** Save a message the guest tried to send before signing in. */
  setPendingGuestMessage: (message: string | null) => void;

  /** Full reset (navigate away, logout, etc.). */
  reset: () => void;
}

const INITIAL_STATE = {
  messages: [],
  status: 'idle' as ChatStatus,
  error: null,
  currentSessionId: null,
  showChat: false,
  initialMessage: undefined,
  pendingGuestMessage: null,
  quotes: [],
  isFindingQuotes: false,
  currentLoadId: null,
  acceptedQuoteId: null,
};

export const useKikiChatStore = create<KikiChatState>((set, get) => ({
  ...INITIAL_STATE,

  startChat: (message) =>
    set({
      showChat: true,
      initialMessage: message,
      currentSessionId: null,
      messages: [],
      status: 'idle',
      error: null,
    }),

  newChat: () =>
    set({
      ...INITIAL_STATE,
    }),

  setSession: (sessionId) =>
    set({
      currentSessionId: sessionId,
      showChat: true,
      initialMessage: undefined,
      quotes: [],
      isFindingQuotes: false,
      currentLoadId: null,
      acceptedQuoteId: null,
    }),

  addMessage: (message) =>
    set((s) => ({
      messages: [...s.messages, message],
    })),

  appendToLastAssistantMessage: (delta) =>
    set((s) => {
      const msgs = [...s.messages];
      const last = msgs[msgs.length - 1];
      if (last && last.role === 'assistant') {
        msgs[msgs.length - 1] = { ...last, content: last.content + delta };
      } else {
        // Create a new assistant message if none exists yet
        msgs.push({
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: delta,
        });
      }
      return { messages: msgs };
    }),

  setStatus: (status, error = null) =>
    set({ status, error }),

  setMessages: (messages) =>
    set({ messages }),

  startFindingQuotes: (loadId) =>
    set({
      currentLoadId: loadId,
      isFindingQuotes: true,
      quotes: [],
      acceptedQuoteId: null,
    }),

  upsertQuote: (quote) =>
    set((s) => {
      const existingIndex = s.quotes.findIndex(
        (q) =>
          (q.quoteId || q.quote?.quoteId) ===
          (quote.quoteId || quote.quote?.quoteId),
      );
      if (existingIndex >= 0) {
        const updated = [...s.quotes];
        updated[existingIndex] = quote;
        return { quotes: updated, isFindingQuotes: false };
      }
      return { quotes: [...s.quotes, quote], isFindingQuotes: false };
    }),

  stopFindingQuotes: () =>
    set({ isFindingQuotes: false }),

  setAcceptedQuoteId: (quoteId) =>
    set({ acceptedQuoteId: quoteId }),

  setPendingGuestMessage: (message) =>
    set({ pendingGuestMessage: message }),

  clearQuotes: () =>
    set({
      quotes: [],
      isFindingQuotes: false,
      currentLoadId: null,
      acceptedQuoteId: null,
    }),

  reset: () =>
    set({ ...INITIAL_STATE }),
}));