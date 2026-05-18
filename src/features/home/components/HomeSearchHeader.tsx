import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useHomeProfile } from '@/features/home/hooks/useHomeProfile';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import type { MainTabParamList } from '@/types/navigation.types';

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
    searchText: {
      flex: 1,
      fontSize: typography.fontSize.md,
      color: colors.muted,
    },
    avatar: { marginLeft: 2 },
    avatarInner: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarText: {
      color: colors.onPrimary,
      fontWeight: typography.fontWeight.bold,
      fontSize: 16,
    },
  });
}

type Props = {
  onOpenWhereTo: () => void;
  resolving: boolean;
};

/**
 * Home “Where to?” bar. Parent screen owns the full-screen Places overlay so
 * it can render **last** above ScrollView / tab chrome (z-index + order).
 */
export function HomeSearchHeader({ onOpenWhereTo, resolving }: Props) {
  const { avatarUrl, initials, signOut } = useHomeProfile();
  const { colors } = useTheme();
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.row}>
      <Pressable
        style={styles.search}
        onPress={onOpenWhereTo}
        accessibilityRole="button"
        accessibilityLabel="Where to?"
        disabled={resolving}
      >
        <Ionicons name={resolving ? 'navigate-circle-outline' : 'search'} size={20} color={colors.muted} />
        <Text style={styles.searchText} numberOfLines={1}>
          {resolving ? 'Pinning address…' : 'Where to?'}
        </Text>
      </Pressable>
      <Pressable
        accessibilityLabel="Open profile"
        accessibilityRole="button"
        onPress={() => navigation.navigate('Settings')}
        onLongPress={() => void signOut()}
        style={styles.avatar}
        hitSlop={8}
      >
        <View style={styles.avatarInner}>
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={styles.avatarImage}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
          ) : (
            <Text style={styles.avatarText} numberOfLines={1}>
              {initials}
            </Text>
          )}
        </View>
      </Pressable>
    </View>
  );
}
