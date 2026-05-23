import { ReactNode, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/shared/components/BrandLogo';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import { useTheme } from '@/hooks/useTheme';

type AuthFormScaffoldProps = {
  title?: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
};

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    flex: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scroll: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.xl,
      gap: spacing.lg,
    },
    content: {
      alignSelf: 'center',
      width: '100%',
      gap: spacing.lg,
    },
    header: {
      alignItems: 'center',
      gap: spacing.sm,
    },
    title: {
      color: colors.textPrimary,
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.bold,
      textAlign: 'center',
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.md,
      lineHeight: 22,
      textAlign: 'center',
    },
    panel: {
      gap: spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: 24,
      borderCurve: 'continuous',
      backgroundColor: colors.surface,
      padding: spacing.lg,
      boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
    },
  });
}

export function AuthFormScaffold({
  title,
  subtitle,
  children,
  footer,
}: AuthFormScaffoldProps) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const maxWidth = width >= 768 ? 520 : 430;

  return (
    <SafeAreaView style={styles.flex} edges={['bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.content, { maxWidth }]}>
            <View style={styles.header}>
              <BrandLogo variant="header" />
              {title ? <Text style={styles.title}>{title}</Text> : null}
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>

            <View style={styles.panel}>{children}</View>
            {footer}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
