import { useMemo } from 'react';
import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  text: string;
  sender: 'user' | 'bot';
};

function createStyles(colors: ThemeColors, narrow: boolean) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: narrow ? spacing.xs : spacing.sm,
      marginBottom: narrow ? spacing.sm : spacing.md,
    },
    userRow: {
      justifyContent: 'flex-end',
    },
    botRow: {
      justifyContent: 'flex-start',
    },
    bubble: {
      maxWidth: '70%',
      paddingHorizontal: narrow ? spacing.sm : spacing.md,
      paddingVertical: narrow ? spacing.xs + 2 : spacing.sm,
      borderRadius: narrow ? 12 : 16,
    },
    userBubble: {
      backgroundColor: '#6E5AE6',
      borderBottomRightRadius: 0,
    },
    botBubble: {
      backgroundColor: colors.surface,
      borderBottomLeftRadius: 0,
      borderWidth: 1,
      borderColor: colors.border,
    },
    userText: {
      color: '#FFFFFF',
      fontSize: narrow ? typography.fontSize.sm : typography.fontSize.md,
      lineHeight: narrow ? 20 : 22,
    },
    botText: {
      color: colors.textPrimary,
      fontSize: narrow ? typography.fontSize.sm : typography.fontSize.md,
      lineHeight: narrow ? 20 : 22,
    },
    avatar: {
      width: narrow ? 30 : 36,
      height: narrow ? 30 : 36,
      borderRadius: narrow ? 8 : 10,
      overflow: 'hidden',
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: colors.onPrimary,
      fontWeight: '700',
      fontSize: narrow ? 12 : 14,
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
  });
}

function coerceStr(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function KikiChatMessage({ text, sender }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const narrow = width < 380;
  const user = useAuthStore((s) => s.user);
  const styles = useMemo(() => createStyles(colors, narrow), [colors, narrow]);
  const isUser = sender === 'user';

  const userRecord = user as Record<string, unknown> | null;
  const firstName = coerceStr(userRecord?.firstName);
  const avatarUrl = coerceStr(userRecord?.avatar);
  const initials = firstName.slice(0, 2).toUpperCase() || 'U';

  return (
    <View style={[styles.row, isUser ? styles.userRow : styles.botRow]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>🐣</Text>
        </View>
      )}

      <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
        <Text style={isUser ? styles.userText : styles.botText}>{text}</Text>
      </View>

      {isUser && (
        <View style={styles.avatar}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
          ) : (
            <Text style={styles.avatarText}>{initials}</Text>
          )}
        </View>
      )}
    </View>
  );
}