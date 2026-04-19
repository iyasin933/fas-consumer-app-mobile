import { useMemo } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import type { PalletTypeOption } from '@/features/delivery/constants/palletTypes';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  visible: boolean;
  title: string;
  options: PalletTypeOption[];
  selectedValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
};

export function PalletTypePickerModal({
  visible,
  title,
  options,
  selectedValue,
  onSelect,
  onClose,
}: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          justifyContent: 'flex-end',
        },
        sheet: {
          backgroundColor: colors.surface,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          maxHeight: '72%',
        },
        grab: {
          alignSelf: 'center',
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.border,
          marginBottom: spacing.md,
        },
        head: {
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.bold,
          color: colors.textPrimary,
          marginBottom: spacing.md,
        },
        row: {
          paddingVertical: spacing.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        rowTxt: { fontSize: typography.fontSize.md, color: colors.textPrimary },
        rowSel: { color: colors.primary, fontWeight: typography.fontWeight.bold },
        cancel: {
          marginTop: spacing.sm,
          alignItems: 'center',
          paddingVertical: spacing.md,
        },
        cancelTxt: { fontSize: typography.fontSize.md, color: colors.textSecondary, fontWeight: '600' },
      }),
    [colors.border, colors.primary, colors.surface, colors.textPrimary, colors.textSecondary],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]} onPress={() => {}}>
          <View style={styles.grab} />
          <Text style={styles.head}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={(o, i) => (o.value ? o.value : `placeholder-${i}`)}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={styles.row}
                onPress={() => {
                  onSelect(item.value);
                  onClose();
                }}
              >
                <Text style={[styles.rowTxt, item.value === selectedValue && styles.rowSel]}>{item.label}</Text>
              </Pressable>
            )}
          />
          <Pressable style={styles.cancel} onPress={onClose}>
            <Text style={styles.cancelTxt}>Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
