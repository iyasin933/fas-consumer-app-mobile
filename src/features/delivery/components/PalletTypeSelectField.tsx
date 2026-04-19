import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { PALLET_TYPE_OPTIONS, palletTypeLabel } from '@/features/delivery/constants/palletTypes';
import { PalletTypePickerModal } from '@/features/delivery/components/PalletTypePickerModal';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export const PalletTypeSelectField = memo(function PalletTypeSelectField({ value, onChange }: Props) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: spacing.sm,
          borderBottomWidth: 2,
          borderBottomColor: colors.primary,
        },
        txt: { fontSize: typography.fontSize.md, color: colors.textPrimary, flex: 1, paddingRight: spacing.sm },
        ph: { color: colors.muted },
      }),
    [colors.muted, colors.primary, colors.textPrimary],
  );

  const label = palletTypeLabel(value);

  return (
    <View>
      <Pressable style={styles.row} onPress={() => setOpen(true)}>
        <Text style={[styles.txt, !value && styles.ph]} numberOfLines={1}>
          {label}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.primary} />
      </Pressable>
      <PalletTypePickerModal
        visible={open}
        title="Pallet type"
        options={PALLET_TYPE_OPTIONS}
        selectedValue={value}
        onSelect={onChange}
        onClose={() => setOpen(false)}
      />
    </View>
  );
});
