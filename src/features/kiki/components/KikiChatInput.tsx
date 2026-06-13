import { Ionicons } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  onSend: (text: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

function createStyles(colors: ThemeColors, narrow: boolean) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: narrow ? spacing.xs : spacing.sm,
    },
    inputWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: narrow ? 40 : 48,
      borderRadius: narrow ? 10 : 14,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: narrow ? spacing.sm : spacing.md,
    },
    input: {
      flex: 1,
      fontSize: narrow ? typography.fontSize.sm : typography.fontSize.md,
      color: colors.textPrimary,
      paddingVertical: narrow ? spacing.xs : spacing.sm,
    },
    sendButton: {
      width: narrow ? 44 : 48,
      height: narrow ? 44 : 48,
      borderRadius: narrow ? 22 : 24,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendDisabled: {
      opacity: 0.4,
    },
  });
}

export function KikiChatInput({
  onSend,
  placeholder = 'Ask Kiki...',
  disabled,
}: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const narrow = width < 380;
  const styles = useMemo(() => createStyles(colors, narrow), [colors, narrow]);
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <View style={styles.row}>
      <View style={styles.inputWrap}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          multiline
          maxLength={500}
          editable={!disabled}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          accessibilityLabel={placeholder}
        />
      </View>
      <Pressable
        onPress={handleSend}
        disabled={!canSend}
        accessibilityRole="button"
        accessibilityLabel="Send message"
        style={[styles.sendButton, !canSend && styles.sendDisabled]}
      >
        <Ionicons name="send" size={narrow ? 16 : 18} color={colors.onPrimary} />
      </Pressable>
    </View>
  );
}