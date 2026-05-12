import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '@/hooks/useAuth';
import { useTheme, type AppearancePreference } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

const APPEARANCE_OPTIONS: { value: AppearancePreference; label: string; hint: string }[] = [
  { value: 'system', label: 'System', hint: 'Match device light or dark mode' },
  { value: 'light', label: 'Light', hint: 'Always use light appearance' },
  { value: 'dark', label: 'Dark', hint: 'Always use dark appearance' },
];

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    scrollContent: {
      padding: spacing.lg,
      gap: spacing.lg,
    },
    title: {
      fontSize: typography.fontSize.xl,
      fontWeight: typography.fontWeight.bold,
      color: colors.textPrimary,
    },
    sub: { fontSize: typography.fontSize.md, color: colors.textSecondary, lineHeight: 22 },
    sectionLabel: {
      fontSize: typography.fontSize.sm,
      fontWeight: '600',
      color: colors.textSecondary,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginBottom: spacing.xs,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: 12,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      marginBottom: spacing.sm,
    },
    optionSelected: {
      borderColor: colors.primary,
    },
    optionTexts: { flex: 1, marginRight: spacing.md },
    optionLabel: {
      fontSize: typography.fontSize.md,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    optionHint: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      marginTop: 4,
      lineHeight: 18,
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
    link: { alignSelf: 'flex-start' },
    linkTxt: { color: colors.primary, fontWeight: '600', fontSize: typography.fontSize.md },
    out: {
      alignSelf: 'flex-start',
      marginTop: spacing.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
    },
    outTxt: { color: colors.danger, fontWeight: '600', fontSize: typography.fontSize.md },
  });
}

export function SettingsScreen() {
  const { signOut } = useAuth();
  const { colors, appearancePreference, setAppearancePreference } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const tabBarHeight = useBottomTabBarHeight();
  const navigation = useNavigation();
  const goUsers = () => {
    const parent = navigation.getParent();
    if (parent) parent.navigate('Users');
    else navigation.navigate('Users' as never);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.sub}>Account and app preferences.</Text>

        <View>
          <Text style={styles.sectionLabel}>Appearance</Text>
          {APPEARANCE_OPTIONS.map(({ value, label, hint }) => {
            const selected = appearancePreference === value;
            return (
              <Pressable
                key={value}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => setAppearancePreference(value)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <View style={styles.optionTexts}>
                  <Text style={styles.optionLabel}>{label}</Text>
                  <Text style={styles.optionHint}>{hint}</Text>
                </View>
                <View style={styles.radio}>
                  {selected ? <View style={styles.radioInner} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable style={styles.link} onPress={goUsers} accessibilityRole="button">
          <Text style={styles.linkTxt}>Users (sample API)</Text>
        </Pressable>

        <Pressable style={styles.out} onPress={() => void signOut()} accessibilityRole="button">
          <Text style={styles.outTxt}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
