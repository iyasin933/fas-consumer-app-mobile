import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useHomeProfile } from '@/features/home/hooks/useHomeProfile';
import { useHomeSearch } from '@/features/home/hooks/useHomeSearch';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    search: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      paddingVertical: 10,
    },
    searchFocused: {
      borderColor: colors.primary,
    },
    input: {
      flex: 1,
      fontSize: typography.fontSize.md,
      color: colors.textPrimary,
      paddingVertical: 0,
    },
    avatar: { marginLeft: 2 },
    avatarInner: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: colors.onPrimary,
      fontWeight: typography.fontWeight.bold,
      fontSize: 18,
    },
  });
}

export function HomeSearchHeader() {
  const { query, setQuery } = useHomeSearch();
  const { initial, signOut } = useHomeProfile();
  const [focused, setFocused] = useState(false);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <View style={[styles.search, focused && styles.searchFocused]}>
        <Ionicons name="search" size={20} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Where to?"
          placeholderTextColor={colors.muted}
          style={styles.input}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
      <Pressable
        accessibilityLabel="Profile, long press to sign out"
        onLongPress={() => void signOut()}
        style={styles.avatar}
      >
        <View style={styles.avatarInner}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
      </Pressable>
    </View>
  );
}
