import { useMemo } from 'react';
import { create } from 'zustand';

import type { LoadQuoteRow, LoadQuoteSocketSource } from '@/features/delivery/socket/loadQuotesSocket.types';
import { normalizeQuoteSocketPayload } from '@/features/delivery/socket/loadQuotesSocket.types';

type State = {
  /** Append-only list of quotes received over the socket (deduped by loadId + quoteId). */
  quotes: LoadQuoteRow[];
};

type Actions = {
  /**
   * Ingest one socket payload. Idempotent per `(loadId, quoteId)`.
   * Returns true if a new row was added.
   */
  ingestQuote: (data: unknown, source: LoadQuoteSocketSource) => boolean;
  /** Clear all quotes (e.g. on logout). */
  reset: () => void;
};

const quoteKey = (q: Pick<LoadQuoteRow, 'loadId' | 'quoteId'>) => `${q.loadId}:${q.quoteId}`;

export const useLoadQuotesStore = create<State & Actions>((set, get) => ({
  quotes: [],

  ingestQuote: (data, source) => {
    const base = normalizeQuoteSocketPayload(data);
    if (!base) return false;
    const row: LoadQuoteRow = {
      ...base,
      receivedAt: new Date().toISOString(),
      source,
    };
    const key = quoteKey(row);
    const exists = get().quotes.some((q) => quoteKey(q) === key);
    if (exists) return false;
    set((s) => ({ quotes: [...s.quotes, row] }));
    return true;
  },

  reset: () => set({ quotes: [] }),
}));

export function selectQuotesForLoad(loadId: string) {
  return (s: State) => s.quotes.filter((q) => String(q.loadId) === String(loadId));
}

/**
 * Subscribe in UI components to quotes for a single load (by TEG / `createdLoadId`).
 *
 * Selects `quotes` from the store, then filters in `useMemo`. A selector that returns
 * `s.quotes.filter(...)` creates a new array every snapshot and triggers React 19
 * “getSnapshot should be cached” / maximum update depth.
 */
export function useLoadQuotesForLoad(loadId: string): LoadQuoteRow[] {
  const id = String(loadId).trim();
  const allQuotes = useLoadQuotesStore((s) => s.quotes);
  return useMemo(() => {
    if (id === '') return [];
    return allQuotes.filter((q) => String(q.loadId) === id);
  }, [id, allQuotes]);
}
