export type PalletTypeOption = { label: string; value: string };

/**
 * Pallet catalogue (labels + API `value` strings). First row is the empty placeholder.
 */
export const PALLET_TYPE_OPTIONS: PalletTypeOption[] = [
  { label: 'Choose Pallet Type', value: '' },
  {
    label: 'Standard Mini Quarter Pallet (150kg) - 120x100x60cm',
    value: 'Mini Quarter Pallet',
  },
  {
    label: 'Standard Quarter Pallet (250kg) - 120x100x80cm',
    value: 'Quarter Pallet',
  },
  {
    label: 'Standard Half Pallet (500kg) - 120x100x110cm',
    value: 'Half Pallet',
  },
  {
    label: 'Standard Light Pallet (750kg) - 120x100x220cm',
    value: 'Light Pallet',
  },
  {
    label: 'Standard Full Pallet (1000kg) - 120x100x220cm',
    value: 'Full Pallet',
  },
];

/**
 * When the user never picked a pallet type, `POST /dropyou/load` still expects a
 * catalogue `value` — use the first real option (Mini Quarter Pallet).
 */
export const DEFAULT_PALLET_TYPE_VALUE = PALLET_TYPE_OPTIONS[1]?.value ?? 'Quarter Pallet';

/** Display label for a stored API value (empty → first row label). */
export function palletTypeLabel(value: string): string {
  if (!value) return PALLET_TYPE_OPTIONS[0].label;
  return PALLET_TYPE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}
