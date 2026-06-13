import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { KikiChatInput } from '@/features/kiki/components/KikiChatInput';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

const QUICK_ACTIONS = [
  { emoji: '📦', label: 'Track Parcel' },
  { emoji: '🚚', label: 'Book Delivery' },
  { emoji: '💬', label: 'Chat Support' },
  { emoji: '💡', label: 'Delivery Tips' },
  { emoji: '📍', label: 'Nearest Drop Point' },
];

type Props = {
  onStartChat: (message: string) => void;
};

function createStyles(colors: ThemeColors, narrow: boolean) {
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: narrow ? spacing.md : spacing.lg,
      paddingVertical: narrow ? spacing.xl : spacing.xl * 2,
    },
    greeting: {
      fontSize: narrow ? 26 : typography.fontSize.xl,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    subtitle: {
      fontSize: narrow ? typography.fontSize.sm : typography.fontSize.md,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: narrow ? spacing.md : spacing.lg,
      lineHeight: narrow ? 20 : 22,
    },
    inputWrap: {
      width: '100%',
      maxWidth: narrow ? '100%' : 560,
      marginBottom: spacing.md,
    },
    actionsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: narrow ? spacing.xs : spacing.sm,
      marginTop: narrow ? spacing.xs : spacing.sm,
    },
    actionPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: narrow ? spacing.sm : spacing.md,
      paddingVertical: narrow ? spacing.sm : spacing.sm + 2,
      borderRadius: 999,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      minHeight: 44,
    },
    actionLabel: {
      fontSize: narrow ? typography.fontSize.xs : typography.fontSize.sm,
      fontWeight: '500',
      color: colors.textPrimary,
    },
  });
}

export function KikiWelcomeView({ onStartChat }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const narrow = width < 380;
  const styles = useMemo(() => createStyles(colors, narrow), [colors, narrow]);

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hey there! I'm Kiki 👋</Text>
      <Text style={styles.subtitle}>
        Your personal DropYou assistant — track parcels, book deliveries, or
        get instant support.
      </Text>

      <View style={styles.inputWrap}>
        <KikiChatInput onSend={onStartChat} placeholder="Ask Kiki anything..." />
      </View>

      <View style={styles.actionsWrap}>
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.label}
            style={styles.actionPill}
            accessibilityRole="button"
            accessibilityLabel={action.label}
            onPress={() => onStartChat(action.label)}
          >
            <Text style={styles.actionLabel}>
              {action.emoji} {action.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}