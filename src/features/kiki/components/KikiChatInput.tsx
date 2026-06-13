import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  onSend: (text: string) => void;
  /** Static placeholder — when provided, the typewriter animation is disabled. */
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
      overflow: 'hidden',
    },
    input: {
      flex: 1,
      fontSize: narrow ? typography.fontSize.sm : typography.fontSize.md,
      color: colors.textPrimary,
      paddingVertical: narrow ? spacing.xs : spacing.sm,
      zIndex: 2,
    },
    placeholderOverlay: {
      position: 'absolute',
      left: narrow ? spacing.sm : spacing.md,
      top: 0,
      bottom: 0,
      justifyContent: 'center',
      zIndex: 1,
    },
    placeholderText: {
      fontSize: narrow ? typography.fontSize.sm : typography.fontSize.md,
      color: colors.muted,
    },
    cursor: {
      fontSize: narrow ? typography.fontSize.sm : typography.fontSize.md,
      color: colors.primary,
      fontWeight: '700',
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

const PLACEHOLDERS = [
  'Ask Kiki to book a delivery...',
  'Track your parcel with Kiki...',
  'How can I help you today?',
  'Need delivery tips? Ask Kiki...',
  'Find the nearest drop point...',
];

/** Pause after full text is typed before erasing (ms). */
const POST_TYPING_PAUSE_MS = 2000;
/** Speed of typing each character (ms). */
const TYPING_SPEED_MS = 60;
/** Speed of erasing each character (ms). */
const ERASING_SPEED_MS = 30;

type TypePhase = 'typing' | 'pausing' | 'erasing';

export function KikiChatInput({
  onSend,
  placeholder: staticPlaceholder,
  disabled,
}: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const narrow = width < 380;
  const styles = useMemo(() => createStyles(colors, narrow), [colors, narrow]);
  const [text, setText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const phaseRef = useRef<TypePhase>('typing');
  const charIndexRef = useRef(0);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const advance = useCallback(() => {
    const fullText = PLACEHOLDERS[placeholderIndex] ?? '';
    const phase = phaseRef.current;

    if (phase === 'typing') {
      if (charIndexRef.current < fullText.length) {
        charIndexRef.current += 1;
        setDisplayedText(fullText.slice(0, charIndexRef.current));
        return TYPING_SPEED_MS;
      }
      // Finished typing — pause
      phaseRef.current = 'pausing';
      return POST_TYPING_PAUSE_MS;
    }

    if (phase === 'pausing') {
      phaseRef.current = 'erasing';
      return ERASING_SPEED_MS;
    }

    if (phase === 'erasing') {
      if (charIndexRef.current > 0) {
        charIndexRef.current -= 1;
        setDisplayedText(fullText.slice(0, charIndexRef.current));
        return ERASING_SPEED_MS;
      }
      // Move to next placeholder
      phaseRef.current = 'typing';
      charIndexRef.current = 0;
      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
      return TYPING_SPEED_MS;
    }

    return TYPING_SPEED_MS;
  }, [placeholderIndex]);

  useEffect(() => {
    // Skip typewriter entirely when a static placeholder is provided
    if (staticPlaceholder) return;

    // Reset when the placeholder index changes
    charIndexRef.current = 0;
    phaseRef.current = 'typing';
    setDisplayedText('');

    let timeoutId: ReturnType<typeof setTimeout>;

    const tick = () => {
      const delay = advance();
      timeoutId = setTimeout(tick, delay);
    };

    // Small initial delay before starting to type
    const startDelay = setTimeout(() => {
      tick();
    }, 300);

    return () => {
      clearTimeout(startDelay);
      clearTimeout(timeoutId!);
      if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeholderIndex, staticPlaceholder, advance]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  };

  const canSend = text.trim().length > 0 && !disabled;

  // When static placeholder is provided, show it; otherwise use typewriter text
  const showPlaceholder = text.trim().length === 0;
  const currentPlaceholder = staticPlaceholder ?? displayedText;

  return (
    <View style={styles.row}>
      <View style={styles.inputWrap}>
        {showPlaceholder && (
          <Animated.View
            style={styles.placeholderOverlay}
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            pointerEvents="none"
          >
            <Text style={styles.placeholderText} numberOfLines={1}>
              {currentPlaceholder}
              {!staticPlaceholder && <Text style={styles.cursor}>|</Text>}
            </Text>
          </Animated.View>
        )}
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder=""
          placeholderTextColor={colors.muted}
          multiline
          maxLength={500}
          editable={!disabled}
          returnKeyType="send"
          onSubmitEditing={handleSend}
          accessibilityLabel="Chat input"
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