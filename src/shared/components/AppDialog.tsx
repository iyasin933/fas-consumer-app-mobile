import { useMemo, type ReactNode } from 'react';
import {
  Image,
  type ImageSourcePropType,
  Modal,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  visible: boolean;
  title: string;
  children: ReactNode;
  actionLabel?: string;
  secondaryActionLabel?: string;
  illustration?: ImageSourcePropType;
  onClose: () => void;
  onActionPress?: () => void;
  onSecondaryActionPress?: () => void;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.lg,
      backgroundColor: 'rgba(15,23,42,0.42)',
    },
    card: {
      width: '100%',
      maxWidth: 360,
      borderRadius: 18,
      padding: spacing.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      gap: spacing.md,
    },
    title: {
      color: colors.textPrimary,
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      lineHeight: 26,
      textAlign: 'center',
    },
    body: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.md,
      lineHeight: 23,
      textAlign: 'center',
    },
    illustration: {
      width: '100%',
      height: 208,
      resizeMode: 'contain',
    },
    action: {
      alignSelf: 'stretch',
      minHeight: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: spacing.md,
    },
    actionPressed: {
      backgroundColor: colors.primaryPressed,
      transform: [{ scale: 0.99 }],
    },
    actionText: {
      color: colors.onPrimary,
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.bold,
    },
    secondaryAction: {
      alignSelf: 'stretch',
      minHeight: 48,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
    },
    secondaryActionPressed: {
      backgroundColor: colors.background,
      transform: [{ scale: 0.99 }],
    },
    secondaryActionText: {
      color: colors.textPrimary,
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.bold,
    },
  });
}

export function AppDialog({
  visible,
  title,
  children,
  actionLabel = 'OK',
  secondaryActionLabel,
  illustration,
  onClose,
  onActionPress,
  onSecondaryActionPress,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          accessibilityViewIsModal
          accessibilityRole="alert"
          style={styles.card}
          onPress={(event) => event.stopPropagation()}
        >
          {illustration ? (
            <Image
              source={illustration}
              style={styles.illustration}
              accessibilityIgnoresInvertColors
            />
          ) : null}
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{children}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={onActionPress ?? onClose}
            style={({ pressed }) => [styles.action, pressed && styles.actionPressed]}
          >
            <Text style={styles.actionText}>{actionLabel}</Text>
          </Pressable>
          {secondaryActionLabel ? (
            <Pressable
              accessibilityRole="button"
              onPress={onSecondaryActionPress ?? onClose}
              style={({ pressed }) => [
                styles.secondaryAction,
                pressed && styles.secondaryActionPressed,
              ]}
            >
              <Text style={styles.secondaryActionText}>{secondaryActionLabel}</Text>
            </Pressable>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
