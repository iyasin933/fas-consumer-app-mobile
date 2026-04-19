import type { PalletLineDraft } from '@/features/delivery/types';

const genId = () => Math.random().toString(36).slice(2, 10);

export function initialPalletLine(): PalletLineDraft {
  return {
    id: genId(),
    palletTypeValue: '',
    content: '',
    valueOfGoods: '',
    weightKg: '',
  };
}
