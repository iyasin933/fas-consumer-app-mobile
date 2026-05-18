import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type TabOption<T extends string> = {
  value: T;
  label: string;
  badge?: string | number;
};

type Props<T extends string> = {
  value: T;
  options: TabOption<T>[];
  onChange: (value: T) => void;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      gap: spacing.xs,
      padding: 4,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    tab: {
      flex: 1,
      minHeight: 42,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: spacing.sm,
    },
    tabActive: {
      backgroundColor: colors.primary,
    },
    text: {
      fontSize: typography.fontSize.sm,
      fontWeight: '700',
      color: colors.textSecondary,
    },
    textActive: {
      color: colors.onPrimary,
    },
    badge: {
      minWidth: 20,
      height: 20,
      borderRadius: 10,
      paddingHorizontal: 6,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.background,
    },
    badgeActive: {
      backgroundColor: 'rgba(255,255,255,0.22)',
    },
    badgeText: {
      fontSize: typography.fontSize.xs,
      fontWeight: '800',
      color: colors.textSecondary,
    },
    badgeTextActive: {
      color: colors.onPrimary,
    },
  });
}

export function SegmentedTabs<T extends string>({ value, options, onChange }: Props<T>) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.wrap}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.tab, active && styles.tabActive]}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.text, active && styles.textActive]} numberOfLines={1}>
              {option.label}
            </Text>
            {option.badge != null ? (
              <View style={[styles.badge, active && styles.badgeActive]}>
                <Text style={[styles.badgeText, active && styles.badgeTextActive]} numberOfLines={1}>
                  {option.badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
