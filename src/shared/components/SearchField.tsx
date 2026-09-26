import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  accessibilityLabel?: string;
  autoFocus?: boolean;
};

function createStyles(colors: ThemeColors, narrow: boolean) {
  return StyleSheet.create({
    row: {
      minHeight: narrow ? 36 : 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
      paddingHorizontal: narrow ? spacing.sm : spacing.md,
    },
    input: {
      flex: 1,
      minWidth: 0,
      paddingVertical: narrow ? spacing.xs : spacing.sm,
      fontSize: narrow ? typography.fontSize.sm : typography.fontSize.md,
      color: colors.textPrimary,
    },
    clear: {
      minWidth: 36,
      minHeight: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}

/** Shared search input with icon + clear button. Reuse instead of duplicating. */
export const SearchField = memo(function SearchField({
  value,
  onChangeText,
  placeholder = 'Search',
  accessibilityLabel = 'Search',
  autoFocus,
}: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const narrow = width < 380;
  const styles = useMemo(() => createStyles(colors, narrow), [colors, narrow]);

  return (
    <View style={styles.row}>
      <Ionicons name="search" size={narrow ? 18 : 20} color={colors.muted} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        autoCapitalize="none"
        autoCorrect={false}
        autoFocus={autoFocus}
        returnKeyType="search"
        accessibilityLabel={accessibilityLabel}
      />
      {value.length > 0 ? (
        <Pressable
          style={styles.clear}
          onPress={() => onChangeText('')}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
        >
          <Ionicons
            name="close-circle"
            size={narrow ? 18 : 20}
            color={colors.muted}
          />
        </Pressable>
      ) : null}
    </View>
  );
});
