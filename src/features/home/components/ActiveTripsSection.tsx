import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { ActiveTripCard } from '@/features/home/components/ActiveTripCard';
import { useActiveTrips } from '@/features/home/hooks/useActiveTrips';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

function createStyles(colors: ThemeColors, width: number) {
  const slideWidth = Math.max(260, Math.min(320, width - spacing.md * 2));
  return StyleSheet.create({
    section: { paddingBottom: spacing.xl, gap: spacing.sm },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.md,
    },
    h: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      color: colors.textPrimary,
    },
    hScroll: { paddingLeft: spacing.md, paddingRight: spacing.sm, gap: spacing.sm },
    slide: { width: slideWidth },
    empty: { paddingHorizontal: spacing.md, color: colors.textSecondary },
    errBox: { paddingHorizontal: spacing.md },
    err: { color: colors.danger, textDecorationLine: 'underline' },
  });
}

export function ActiveTripsSection() {
  const { trips, isLoading, isError, refetch } = useActiveTrips();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors, width), [colors, width]);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.h}>Active Trips</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
      ) : isError ? (
        <Pressable onPress={refetch} style={styles.errBox}>
          <Text style={styles.err}>Could not load trips. Tap to retry.</Text>
        </Pressable>
      ) : trips.length === 0 ? (
        <Text style={styles.empty}>No active trips right now.</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.hScroll}
        >
          {trips.map((t) => (
            <View key={t.id} style={styles.slide}>
              <ActiveTripCard trip={t} />
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
