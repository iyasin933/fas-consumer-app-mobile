import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Clipboard,
  Image,
  type ImageSourcePropType,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

const KIKI_AVATAR = require('../../../../assets/images/kiki.png');

const VEHICLE_ICONS: Record<string, ImageSourcePropType> = {
  bike: require('../../../../assets/images/rider-bike.png'),
  car: require('../../../../assets/images/rider-car.png'),
  'small van': require('../../../../assets/images/rider-sm-van.png'),
  'midi van': require('../../../../assets/images/rider-midi-van.png'),
  swb: require('../../../../assets/images/rider-mwb.png'),
  mwb: require('../../../../assets/images/rider-mwb.png'),
  lwb: require('../../../../assets/images/rider-lwb.png'),
  xlwb: require('../../../../assets/images/rider-xlwb.png'),
  luton: require('../../../../assets/images/rider-luton.png'),
  'luton van': require('../../../../assets/images/rider-luton.png'),
  '7.5t': require('../../../../assets/images/rider-7.5t.png'),
  '7.5 t': require('../../../../assets/images/rider-7.5t.png'),
};

type Props = {
  text: string;
  sender: 'user' | 'bot';
  userAvatarUrl?: string;
  userInitials?: string;
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
    botContent: {
      gap: spacing.sm,
    },
    messageContent: {
      maxWidth: '70%',
      gap: spacing.xs,
    },
    userMessageContent: {
      alignItems: 'flex-end',
    },
    botMessageContent: {
      alignItems: 'flex-start',
    },
    copyButton: {
      minHeight: 28,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: spacing.xs,
      borderRadius: 8,
    },
    copyButtonPressed: {
      opacity: 0.6,
    },
    copyLabel: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.xs,
      fontWeight: '600',
    },
    vehicleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingVertical: spacing.xs,
    },
    vehicleIconWrap: {
      width: narrow ? 44 : 52,
      height: narrow ? 36 : 42,
      borderRadius: 10,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    vehicleIcon: {
      width: '88%',
      height: '88%',
    },
    vehicleCopy: {
      flex: 1,
    },
    vehicleName: {
      color: colors.textPrimary,
      fontSize: narrow ? typography.fontSize.sm : typography.fontSize.md,
      fontWeight: '700',
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
    kikiAvatarImage: {
      width: '78%',
      height: '78%',
    },
  });
}

type MessagePart =
  | { type: 'text'; text: string }
  | {
      type: 'vehicle';
      name: string;
      icon: ImageSourcePropType;
    };

function cleanMarkdownText(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseAssistantMessage(value: string): MessagePart[] {
  const parts: MessagePart[] = [];
  const vehiclePattern =
    /^[ \t]*[-*][ \t]+!\[([^\]]+)\]\([^)]+\)[ \t]*(?:\*\*([^*\r\n]+)\*\*)?(?:[ \t]*[-–—][ \t]*(.*))?[ \t]*\r?$/gm;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = vehiclePattern.exec(value)) !== null) {
    const precedingText = cleanMarkdownText(value.slice(cursor, match.index));
    if (precedingText) parts.push({ type: 'text', text: precedingText });

    const imageLabel = match[1]?.trim() ?? '';
    const name = match[2]?.trim() || imageLabel;
    const icon =
      VEHICLE_ICONS[name.toLowerCase()] ?? VEHICLE_ICONS[imageLabel.toLowerCase()];

    if (icon) {
      parts.push({
        type: 'vehicle',
        name,
        icon,
      });
    } else {
      parts.push({
        type: 'text',
        text: cleanMarkdownText(match[0]),
      });
    }

    cursor = vehiclePattern.lastIndex;
  }

  const remainingText = cleanMarkdownText(value.slice(cursor));
  if (remainingText) parts.push({ type: 'text', text: remainingText });

  return parts.length > 0 ? parts : [{ type: 'text', text: cleanMarkdownText(value) }];
}

export function KikiChatMessage({
  text,
  sender,
  userAvatarUrl,
  userInitials = '?',
}: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const narrow = width < 380;
  const styles = useMemo(() => createStyles(colors, narrow), [colors, narrow]);
  const isUser = sender === 'user';
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const assistantParts = useMemo(
    () => (isUser ? [] : parseAssistantMessage(text)),
    [isUser, text],
  );
  const handleCopy = useCallback(async () => {
    Clipboard.setString(text);
    setCopied(true);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 1500);
  }, [text]);

  useEffect(
    () => () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    },
    [],
  );

  return (
    <View style={[styles.row, isUser ? styles.userRow : styles.botRow]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Image
            source={KIKI_AVATAR}
            style={styles.kikiAvatarImage}
            resizeMode="contain"
            accessibilityLabel="Kiki"
          />
        </View>
      )}

      <View
        style={[
          styles.messageContent,
          isUser ? styles.userMessageContent : styles.botMessageContent,
        ]}
      >
        <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
          {isUser ? (
            <Text style={styles.userText}>{text}</Text>
          ) : (
            <View style={styles.botContent}>
              {assistantParts.map((part, index) =>
                part.type === 'text' ? (
                  <Text key={`text-${index}`} style={styles.botText}>
                    {part.text}
                  </Text>
                ) : (
                  (() => {
                    return (
                      <View
                        key={`vehicle-${part.name}-${index}`}
                        style={styles.vehicleRow}
                      >
                        <View style={styles.vehicleIconWrap}>
                          <Image
                            source={part.icon}
                            style={styles.vehicleIcon}
                            resizeMode="contain"
                            accessibilityLabel={part.name}
                          />
                        </View>
                        <View style={styles.vehicleCopy}>
                          <Text style={styles.vehicleName}>{part.name}</Text>
                        </View>
                      </View>
                    );
                  })()
                ),
              )}
            </View>
          )}
        </View>
        <Pressable
          onPress={() => void handleCopy()}
          accessibilityRole="button"
          accessibilityLabel={copied ? 'Message copied' : 'Copy message'}
          style={({ pressed }) => [
            styles.copyButton,
            pressed && styles.copyButtonPressed,
          ]}
        >
          <Ionicons
            name={copied ? 'checkmark' : 'copy-outline'}
            size={14}
            color={copied ? colors.primary : colors.textSecondary}
          />
          <Text style={styles.copyLabel}>{copied ? 'Copied' : 'Copy'}</Text>
        </Pressable>
      </View>

      {isUser && (
        <View style={styles.avatar}>
          {userAvatarUrl ? (
            <Image
              source={{ uri: userAvatarUrl }}
              style={styles.avatarImage}
              resizeMode="cover"
              accessibilityLabel="Your profile photo"
            />
          ) : (
            <Text style={styles.avatarText}>{userInitials}</Text>
          )}
        </View>
      )}
    </View>
  );
}
