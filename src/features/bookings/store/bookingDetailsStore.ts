import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type BookingDetailsState = {
  selectedLoadId: string | null;
  detailsByLoadId: Record<string, unknown>;
  quotesByLoadId: Record<string, unknown[]>;
  quotesFetchedByLoadId: Record<string, boolean>;
  loadingByLoadId: Record<string, boolean>;
  quotesLoadingByLoadId: Record<string, boolean>;
  errorByLoadId: Record<string, string>;
  quotesErrorByLoadId: Record<string, string>;
};

type BookingDetailsActions = {
  setSelectedLoadId: (loadId: string | null) => void;
  setLoading: (loadId: string, loading: boolean) => void;
  setQuotesLoading: (loadId: string, loading: boolean) => void;
  setDetails: (loadId: string, details: unknown) => void;
  setQuotes: (loadId: string, quotes: unknown[]) => void;
  setError: (loadId: string, error: string) => void;
  setQuotesError: (loadId: string, error: string) => void;
  clearError: (loadId: string) => void;
  clearQuotesError: (loadId: string) => void;
  reset: () => void;
};

type BookingDetailsPersistedState = Pick<
  BookingDetailsState,
  | 'selectedLoadId'
  | 'detailsByLoadId'
  | 'quotesByLoadId'
  | 'quotesFetchedByLoadId'
  | 'errorByLoadId'
  | 'quotesErrorByLoadId'
>;

const initialState: BookingDetailsState = {
  selectedLoadId: null,
  detailsByLoadId: {},
  quotesByLoadId: {},
  quotesFetchedByLoadId: {},
  loadingByLoadId: {},
  quotesLoadingByLoadId: {},
  errorByLoadId: {},
  quotesErrorByLoadId: {},
};

export const useBookingDetailsStore = create<BookingDetailsState & BookingDetailsActions>()(
  persist<BookingDetailsState & BookingDetailsActions, [], [], BookingDetailsPersistedState>(
    (set) => ({
      ...initialState,

      setSelectedLoadId: (selectedLoadId) => set({ selectedLoadId }),

      setLoading: (loadId, loading) =>
        set((s) => ({
          loadingByLoadId: { ...s.loadingByLoadId, [loadId]: loading },
        })),

      setQuotesLoading: (loadId, loading) =>
        set((s) => ({
          quotesLoadingByLoadId: { ...s.quotesLoadingByLoadId, [loadId]: loading },
        })),

      setDetails: (loadId, details) =>
        set((s) => ({
          selectedLoadId: loadId,
          detailsByLoadId: { ...s.detailsByLoadId, [loadId]: details },
          errorByLoadId: { ...s.errorByLoadId, [loadId]: '' },
        })),

      setQuotes: (loadId, quotes) =>
        set((s) => ({
          selectedLoadId: loadId,
          quotesByLoadId: { ...s.quotesByLoadId, [loadId]: quotes },
          quotesFetchedByLoadId: { ...s.quotesFetchedByLoadId, [loadId]: true },
          quotesErrorByLoadId: { ...s.quotesErrorByLoadId, [loadId]: '' },
        })),

      setError: (loadId, error) =>
        set((s) => ({
          errorByLoadId: { ...s.errorByLoadId, [loadId]: error },
        })),

      setQuotesError: (loadId, error) =>
        set((s) => ({
          quotesFetchedByLoadId: { ...s.quotesFetchedByLoadId, [loadId]: true },
          quotesErrorByLoadId: { ...s.quotesErrorByLoadId, [loadId]: error },
        })),

      clearError: (loadId) =>
        set((s) => ({
          errorByLoadId: { ...s.errorByLoadId, [loadId]: '' },
        })),

      clearQuotesError: (loadId) =>
        set((s) => ({
          quotesErrorByLoadId: { ...s.quotesErrorByLoadId, [loadId]: '' },
        })),

      reset: () => set(initialState),
    }),
    {
      name: 'booking-details-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state): BookingDetailsPersistedState => ({
        selectedLoadId: state.selectedLoadId,
        detailsByLoadId: state.detailsByLoadId,
        quotesByLoadId: state.quotesByLoadId,
        quotesFetchedByLoadId: state.quotesFetchedByLoadId,
        errorByLoadId: state.errorByLoadId,
        quotesErrorByLoadId: state.quotesErrorByLoadId,
      }),
    },
  ),
);
