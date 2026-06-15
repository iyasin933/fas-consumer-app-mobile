import { create } from 'zustand';

import type { KikiMessage, KikiQuote, PaginationMeta } from '@/features/kiki/types';

export type ChatStatus = 'idle' | 'streaming' | 'error';

export interface KikiConversationState {
  messages: KikiMessage[];
  quotes: KikiQuote[];
  attachments: unknown[];
  draft: string;
  status: ChatStatus;
  error: string | null;
  messagesLoading: boolean;
  quotesLoading: boolean;
  pagination: PaginationMeta | null;
  isFindingQuotes: boolean;
  currentLoadId: number | null;
  bookingId: string | null;
  acceptedQuoteId: string | number | null;
  vehiclePrices: Record<string, string>;
  hydrated: boolean;
}

export interface KikiChatState {
  conversations: Record<string, KikiConversationState>;
  activeConversationKey: string | null;
  currentSessionId: string | null;
  showChat: boolean;
  initialMessage: string | undefined;
  pendingGuestMessage: string | null;

  startChat: (message?: string) => string;
  clearInitialMessage: () => void;
  newChat: () => void;
  setSession: (sessionId: string) => void;
  migrateConversation: (fromKey: string, sessionId: string) => void;
  removeConversation: (conversationKey: string) => void;

  addMessage: (conversationKey: string, message: KikiMessage) => void;
  appendToLastAssistantMessage: (conversationKey: string, delta: string) => void;
  setStatus: (
    conversationKey: string,
    status: ChatStatus,
    error?: string | null,
  ) => void;
  setMessages: (
    conversationKey: string,
    messages: KikiMessage[],
    pagination?: PaginationMeta | null,
  ) => void;
  setMessagesLoading: (conversationKey: string, loading: boolean) => void;
  setDraft: (conversationKey: string, draft: string) => void;

  startFindingQuotes: (conversationKey: string, loadId: number) => void;
  setBookingIdentity: (
    conversationKey: string,
    identity: { loadId?: number | null; bookingId?: string | null },
  ) => void;
  upsertQuote: (conversationKey: string, quote: KikiQuote) => void;
  setQuotesLoading: (conversationKey: string, loading: boolean) => void;
  stopFindingQuotes: (conversationKey: string) => void;
  setAcceptedQuoteId: (
    conversationKey: string,
    quoteId: string | number | null,
  ) => void;
  clearQuotes: (conversationKey: string) => void;
  setVehiclePrices: (
    conversationKey: string,
    prices: Record<string, string>,
  ) => void;

  setPendingGuestMessage: (message: string | null) => void;
  reset: () => void;
}

export function createEmptyKikiConversation(): KikiConversationState {
  return {
    messages: [],
    quotes: [],
    attachments: [],
    draft: '',
    status: 'idle',
    error: null,
    messagesLoading: false,
    quotesLoading: false,
    pagination: null,
    isFindingQuotes: false,
    currentLoadId: null,
    bookingId: null,
    acceptedQuoteId: null,
    vehiclePrices: {},
    hydrated: false,
  };
}

function createLocalConversationKey(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function updateConversation(
  state: KikiChatState,
  conversationKey: string,
  updater: (
    conversation: KikiConversationState,
  ) => Partial<KikiConversationState>,
): Pick<KikiChatState, 'conversations'> {
  const current =
    state.conversations[conversationKey] ?? createEmptyKikiConversation();
  return {
    conversations: {
      ...state.conversations,
      [conversationKey]: {
        ...current,
        ...updater(current),
      },
    },
  };
}

const INITIAL_STATE = {
  conversations: {} as Record<string, KikiConversationState>,
  activeConversationKey: null as string | null,
  currentSessionId: null as string | null,
  showChat: false,
  initialMessage: undefined as string | undefined,
  pendingGuestMessage: null as string | null,
};

export const useKikiChatStore = create<KikiChatState>((set) => ({
  ...INITIAL_STATE,

  startChat: (message) => {
    const conversationKey = createLocalConversationKey();
    set((state) => ({
      conversations: {
        ...state.conversations,
        [conversationKey]: createEmptyKikiConversation(),
      },
      activeConversationKey: conversationKey,
      currentSessionId: null,
      showChat: true,
      initialMessage: message,
    }));
    return conversationKey;
  },

  clearInitialMessage: () => set({ initialMessage: undefined }),

  newChat: () =>
    set({
      activeConversationKey: null,
      currentSessionId: null,
      showChat: false,
      initialMessage: undefined,
      pendingGuestMessage: null,
    }),

  setSession: (sessionId) =>
    set((state) => ({
      conversations: {
        ...state.conversations,
        [sessionId]:
          state.conversations[sessionId] ?? createEmptyKikiConversation(),
      },
      activeConversationKey: sessionId,
      currentSessionId: sessionId,
      showChat: true,
      initialMessage: undefined,
    })),

  migrateConversation: (fromKey, sessionId) =>
    set((state) => {
      const source =
        state.conversations[fromKey] ?? createEmptyKikiConversation();
      const target = state.conversations[sessionId];
      const conversations = { ...state.conversations };
      delete conversations[fromKey];
      conversations[sessionId] = target
        ? {
            ...target,
            ...source,
            messages:
              source.messages.length > 0 ? source.messages : target.messages,
          }
        : source;
      return {
        conversations,
        activeConversationKey:
          state.activeConversationKey === fromKey
            ? sessionId
            : state.activeConversationKey,
        currentSessionId:
          state.activeConversationKey === fromKey
            ? sessionId
            : state.currentSessionId,
      };
    }),

  removeConversation: (conversationKey) =>
    set((state) => {
      const conversations = { ...state.conversations };
      delete conversations[conversationKey];
      return { conversations };
    }),

  addMessage: (conversationKey, message) =>
    set((state) =>
      updateConversation(state, conversationKey, (conversation) => ({
        messages: [...conversation.messages, message],
      })),
    ),

  appendToLastAssistantMessage: (conversationKey, delta) =>
    set((state) =>
      updateConversation(state, conversationKey, (conversation) => {
        const messages = [...conversation.messages];
        const last = messages[messages.length - 1];
        if (last?.role === 'assistant') {
          messages[messages.length - 1] = {
            ...last,
            content: last.content + delta,
          };
        } else {
          messages.push({
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: delta,
          });
        }
        return { messages };
      }),
    ),

  setStatus: (conversationKey, status, error = null) =>
    set((state) =>
      updateConversation(state, conversationKey, () => ({ status, error })),
    ),

  setMessages: (conversationKey, messages, pagination = null) =>
    set((state) =>
      updateConversation(state, conversationKey, () => ({
        messages,
        pagination,
        hydrated: true,
        messagesLoading: false,
      })),
    ),

  setMessagesLoading: (conversationKey, messagesLoading) =>
    set((state) =>
      updateConversation(state, conversationKey, () => ({ messagesLoading })),
    ),

  setDraft: (conversationKey, draft) =>
    set((state) =>
      updateConversation(state, conversationKey, () => ({ draft })),
    ),

  startFindingQuotes: (conversationKey, currentLoadId) =>
    set((state) =>
      updateConversation(state, conversationKey, () => ({
        currentLoadId,
        isFindingQuotes: true,
        quotes: [],
        acceptedQuoteId: null,
      })),
    ),

  setBookingIdentity: (conversationKey, identity) =>
    set((state) =>
      updateConversation(state, conversationKey, (conversation) => ({
        currentLoadId:
          identity.loadId === undefined
            ? conversation.currentLoadId
            : identity.loadId,
        bookingId:
          identity.bookingId === undefined
            ? conversation.bookingId
            : identity.bookingId,
      })),
    ),

  upsertQuote: (conversationKey, quote) =>
    set((state) =>
      updateConversation(state, conversationKey, (conversation) => {
        const quoteId = quote.quoteId ?? quote.quote?.quoteId;
        const existingIndex = conversation.quotes.findIndex(
          (item) => (item.quoteId ?? item.quote?.quoteId) === quoteId,
        );
        const quotes = [...conversation.quotes];
        if (existingIndex >= 0) quotes[existingIndex] = quote;
        else quotes.push(quote);
        return { quotes, isFindingQuotes: false };
      }),
    ),

  setQuotesLoading: (conversationKey, quotesLoading) =>
    set((state) =>
      updateConversation(state, conversationKey, () => ({ quotesLoading })),
    ),

  stopFindingQuotes: (conversationKey) =>
    set((state) =>
      updateConversation(state, conversationKey, () => ({
        isFindingQuotes: false,
      })),
    ),

  setAcceptedQuoteId: (conversationKey, acceptedQuoteId) =>
    set((state) =>
      updateConversation(state, conversationKey, () => ({ acceptedQuoteId })),
    ),

  clearQuotes: (conversationKey) =>
    set((state) =>
      updateConversation(state, conversationKey, () => ({
        quotes: [],
        isFindingQuotes: false,
        quotesLoading: false,
        currentLoadId: null,
        bookingId: null,
        acceptedQuoteId: null,
      })),
    ),

  setVehiclePrices: (conversationKey, vehiclePrices) =>
    set((state) =>
      updateConversation(state, conversationKey, () => ({ vehiclePrices })),
    ),

  setPendingGuestMessage: (pendingGuestMessage) =>
    set({ pendingGuestMessage }),

  reset: () => set({ ...INITIAL_STATE }),
}));
