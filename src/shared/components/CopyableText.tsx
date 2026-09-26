import { Ionicons } from '@expo/vector-icons';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Clipboard,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type TextStyle,
} from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/shared/theme/spacing';

type Props = {
  /** Text to display and copy. */
  value: string;
  style?: StyleProp<TextStyle>;
  iconSize?: number;
  numberOfLines?: number;
  accessibilityLabel?: string;
};

/**
 * Inline value with a tap-to-copy affordance. Used anywhere a load id or
 * reference number is shown so users can copy it without selecting text.
 */
export const CopyableText = memo(function CopyableText({
  value,
  style,
  iconSize = 15,
  numberOfLines,
  accessibilityLabel,
}: Props) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trimmed = value.trim();

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const handleCopy = useCallback(() => {
    if (!trimmed) return;
    Clipboard.setString(trimmed);
    setCopied(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 1500);
  }, [trimmed]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.xs,
          flexShrink: 1,
          minWidth: 0,
        },
      }),
    [],
  );

  if (!trimmed) {
    return <Text style={style}>{value}</Text>;
  }

  return (
    <Pressable
      style={styles.wrap}
      onPress={handleCopy}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ??
        (copied ? `Copied ${trimmed}` : `Copy ${trimmed}`)
      }
    >
      <Text style={style} numberOfLines={numberOfLines}>
        {value}
      </Text>
      <Ionicons
        name={copied ? 'checkmark' : 'copy-outline'}
        size={iconSize}
        color={copied ? colors.primary : colors.muted}
      />
    </Pressable>
  );
});
