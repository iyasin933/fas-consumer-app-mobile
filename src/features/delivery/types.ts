export type PalletLineDraft = {
  id: string;
  /** Matches `PalletTypeOption.value` sent to pricing / booking APIs. */
  palletTypeValue: string;
  content: string;
  valueOfGoods: string;
  weightKg: string;
};

export type ContentDimensionsDraft = {
  height: string;
  length: string;
  width: string;
};
