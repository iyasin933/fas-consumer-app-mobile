import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

export type FilterDropdownOption<T extends string> = {
  value: T;
  label: string;
  badge?: string | number;
};

type Props<T extends string> = {
  value: T;
  options: FilterDropdownOption<T>[];
  title?: string;
  placeholder?: string;
  onChange: (value: T) => void;
};

function createStyles(colors: ThemeColors, narrow: boolean) {
  return StyleSheet.create({
    trigger: {
      minHeight: narrow ? 36 : 44,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: narrow ? spacing.sm : spacing.md,
    },
    triggerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flexShrink: 1,
      minWidth: 0,
    },
    triggerLabel: {
      fontSize: narrow ? typography.fontSize.sm : typography.fontSize.md,
      fontWeight: typography.fontWeight.bold,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    triggerPlaceholder: {
      color: colors.muted,
      fontWeight: typography.fontWeight.medium,
    },
    badge: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    badgeText: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.bold,
      color: colors.onPrimary,
    },
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
      minHeight: 48,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flexShrink: 1,
      minWidth: 0,
    },
    rowLabel: {
      fontSize: typography.fontSize.md,
      color: colors.textPrimary,
      flexShrink: 1,
    },
    rowLabelSelected: {
      color: colors.primary,
      fontWeight: typography.fontWeight.bold,
    },
    rowBadge: {
      minWidth: 22,
      height: 22,
      borderRadius: 11,
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
    },
    rowBadgeText: {
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.bold,
      color: colors.textSecondary,
    },
    cancel: {
      marginTop: spacing.sm,
      alignItems: 'center',
      paddingVertical: spacing.md,
      minHeight: 44,
      justifyContent: 'center',
    },
    cancelTxt: {
      fontSize: typography.fontSize.md,
      color: colors.textSecondary,
      fontWeight: typography.fontWeight.medium,
    },
  });
}

function FilterDropdownInner<T extends string>({
  value,
  options,
  title = 'Filter',
  placeholder = 'Select',
  onChange,
}: Props<T>) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const narrow = width < 380;
  const styles = useMemo(() => createStyles(colors, narrow), [colors, narrow]);

  const selected = options.find((option) => option.value === value);

  return (
    <View>
      <Pressable
        style={styles.trigger}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`Filter bookings: ${selected?.label ?? placeholder}`}
        accessibilityState={{ expanded: open }}
        hitSlop={4}
      >
        <View style={styles.triggerLeft}>
          <Ionicons
            name="options-outline"
            size={narrow ? 18 : 20}
            color={colors.textSecondary}
          />
          <Text
            style={[styles.triggerLabel, !selected && styles.triggerPlaceholder]}
            numberOfLines={1}
          >
            {selected?.label ?? placeholder}
          </Text>
          {selected?.badge != null ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText} numberOfLines={1}>
                {selected.badge}
              </Text>
            </View>
          ) : null}
        </View>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={narrow ? 18 : 20}
          color={colors.primary}
        />
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        transparent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}
            onPress={() => {}}
          >
            <View style={styles.grab} />
            <Text style={styles.head}>{title}</Text>
            <FlatList
              data={options}
              keyExtractor={(option) => option.value}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <Pressable
                    style={styles.row}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: isSelected }}
                  >
                    <View style={styles.rowLeft}>
                      <Text
                        style={[styles.rowLabel, isSelected && styles.rowLabelSelected]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                      {item.badge != null ? (
                        <View style={styles.rowBadge}>
                          <Text style={styles.rowBadgeText} numberOfLines={1}>
                            {item.badge}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark" size={22} color={colors.primary} />
                    ) : null}
                  </Pressable>
                );
              }}
            />
            <Pressable style={styles.cancel} onPress={() => setOpen(false)}>
              <Text style={styles.cancelTxt}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

export const FilterDropdown = memo(FilterDropdownInner) as typeof FilterDropdownInner;
