import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  imageKeys: string[];
  onAdd: () => void;
  onRemove: (key: string) => void;
};

export const ContentImageUploadZone = memo(function ContentImageUploadZone({
  imageKeys,
  onAdd,
  onRemove,
}: Props) {
  const { colors, isDark } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        zone: {
          minHeight: 120,
          borderRadius: 12,
          borderWidth: 1.5,
          borderStyle: 'dashed',
          borderColor: colors.primary,
          backgroundColor: isDark ? `${colors.primary}22` : '#ecfdf5',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.md,
          gap: spacing.sm,
        },
        zoneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        zoneTxt: {
          fontSize: typography.fontSize.md,
          fontWeight: typography.fontWeight.bold,
          color: colors.primary,
        },
        hint: { fontSize: typography.fontSize.sm, color: colors.textSecondary, textAlign: 'center' },
        thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
        thumbWrap: { position: 'relative' },
        thumb: {
          width: 56,
          height: 56,
          borderRadius: 8,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
        },
        thumbTxt: { fontSize: 11, fontWeight: '700', color: colors.muted },
        x: {
          position: 'absolute',
          top: -6,
          right: -6,
          backgroundColor: colors.surface,
          borderRadius: 10,
        },
      }),
    [colors.border, colors.muted, colors.primary, colors.surface, colors.textSecondary, isDark],
  );

  return (
    <View>
      <Pressable style={styles.zone} onPress={onAdd}>
        <View style={styles.zoneRow}>
          <Ionicons name="cloud-upload-outline" size={22} color={colors.primary} />
          <Text style={styles.zoneTxt}>Add photos</Text>
        </View>
        <Text style={styles.hint}>Tap to add placeholders — connect a library picker when ready.</Text>
      </Pressable>
      {imageKeys.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
          {imageKeys.map((k, i) => (
            <View key={k} style={styles.thumbWrap}>
              <Pressable style={styles.thumb} onPress={() => onRemove(k)} accessibilityLabel={`Remove photo ${i + 1}`}>
                <Text style={styles.thumbTxt}>{i + 1}</Text>
              </Pressable>
              <View style={styles.x} pointerEvents="none">
                <Ionicons name="close-circle" size={20} color={colors.danger} />
              </View>
            </View>
          ))}
        </ScrollView>
      ) : null}
    </View>
  );
});
