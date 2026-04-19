import { create } from 'zustand';

import type { DeliveryStop, DeliveryTab, PlaceValue } from '@/features/map/types';

import type { ContentDimensionsDraft, PalletLineDraft } from '@/features/delivery/types';
import { buildDeliveryScheduleSummary } from '@/features/delivery/utils/buildDeliveryScheduleSummary';

import { initialPalletLine } from './palletLine';

type State = {
  pickup: PlaceValue | null;
  dropoff: PlaceValue | null;
  scheduleSummary: string;
  /** Local-only placeholders representing user-added photos (wire `expo-image-picker` later). */
  contentImageKeys: string[];
  dimensions: ContentDimensionsDraft;
  pallets: PalletLineDraft[];
  selectedVehicleId: string | null;
};

type Actions = {
  /**
   * Call when leaving the map with Proceed — snapshots locations + schedule and
   * clears contents so each trip starts clean.
   */
  hydrateFromMapRows: (rows: DeliveryStop[], tab: DeliveryTab) => void;
  /** When returning from the map after "Change address", refresh addresses + schedule only. */
  syncLocationsFromRows: (rows: DeliveryStop[], tab: DeliveryTab) => void;
  setPickup: (p: PlaceValue | null) => void;
  setDropoff: (p: PlaceValue | null) => void;
  addContentImagePlaceholder: () => void;
  removeContentImageKey: (key: string) => void;
  setDimensions: (patch: Partial<ContentDimensionsDraft>) => void;
  setPalletField: (
    palletId: string,
    patch: Partial<Pick<PalletLineDraft, 'palletTypeValue' | 'content' | 'valueOfGoods' | 'weightKg'>>,
  ) => void;
  addPalletLine: () => { ok: boolean };
  removePalletLine: (palletId: string) => void;
  setSelectedVehicleId: (id: string | null) => void;
  resetDraft: () => void;
};

const MAX_IMAGES = 8;
const MAX_PALLETS = 5;

const emptyDimensions = (): ContentDimensionsDraft => ({
  height: '',
  length: '',
  width: '',
});

const initialState = (): State => ({
  pickup: null,
  dropoff: null,
  scheduleSummary: '',
  contentImageKeys: [],
  dimensions: emptyDimensions(),
  pallets: [initialPalletLine()],
  selectedVehicleId: null,
});

export const useDeliveryOrderDraftStore = create<State & Actions>((set, get) => ({
  ...initialState(),

  hydrateFromMapRows: (rows, tab) => {
    const pickup = rows.find((r) => r.kind === 'pickup')?.place ?? null;
    const dropoff = rows.find((r) => r.kind === 'dropoff')?.place ?? null;
    set({
      ...initialState(),
      pickup,
      dropoff,
      scheduleSummary: buildDeliveryScheduleSummary(tab, rows),
    });
  },

  syncLocationsFromRows: (rows, tab) => {
    const pickup = rows.find((r) => r.kind === 'pickup')?.place ?? null;
    const dropoff = rows.find((r) => r.kind === 'dropoff')?.place ?? null;
    set({
      pickup,
      dropoff,
      scheduleSummary: buildDeliveryScheduleSummary(tab, rows),
    });
  },

  setPickup: (pickup) => set({ pickup }),
  setDropoff: (dropoff) => set({ dropoff }),

  addContentImagePlaceholder: () =>
    set((s) => {
      if (s.contentImageKeys.length >= MAX_IMAGES) return s;
      const key = `local:${Date.now().toString(36)}:${Math.random().toString(36).slice(2, 8)}`;
      return { contentImageKeys: [...s.contentImageKeys, key] };
    }),

  removeContentImageKey: (key) =>
    set((s) => ({ contentImageKeys: s.contentImageKeys.filter((k) => k !== key) })),

  setDimensions: (patch) =>
    set((s) => ({ dimensions: { ...s.dimensions, ...patch } })),

  setPalletField: (palletId, patch) =>
    set((s) => ({
      pallets: s.pallets.map((p) => (p.id === palletId ? { ...p, ...patch } : p)),
    })),

  addPalletLine: () => {
    const n = get().pallets.length;
    if (n >= MAX_PALLETS) return { ok: false };
    set((s) => ({ pallets: [...s.pallets, initialPalletLine()] }));
    return { ok: true };
  },

  removePalletLine: (palletId) =>
    set((s) => {
      if (s.pallets.length <= 1) return s;
      return { pallets: s.pallets.filter((p) => p.id !== palletId) };
    }),

  setSelectedVehicleId: (selectedVehicleId) => set({ selectedVehicleId }),

  resetDraft: () => set(initialState()),
}));
