import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { ActiveTripCard } from '@/features/home/components/ActiveTripCard';
import { useActiveTrips } from '@/features/home/hooks/useActiveTrips';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import type { MainTabParamList } from '@/types/navigation.types';

function createStyles(colors: ThemeColors, width: number) {
  const slideWidth = Math.max(260, Math.min(320, width - spacing.md * 2));
  const isNarrow = width < 370;
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
    emptyWrap: {
      paddingHorizontal: spacing.md,
    },
    emptyCard: {
      minHeight: isNarrow ? 252 : 196,
      borderRadius: 20,
      padding: spacing.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      flexDirection: isNarrow ? 'column' : 'row',
      alignItems: isNarrow ? 'flex-start' : 'center',
      gap: spacing.lg,
    },
    emptyCopy: {
      flex: 1,
      minWidth: 0,
      gap: spacing.xs,
      zIndex: 2,
    },
    emptyEyebrow: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      paddingHorizontal: spacing.sm,
      paddingVertical: 5,
      backgroundColor: colors.primary + '14',
      color: colors.primary,
      fontSize: 12,
      fontWeight: typography.fontWeight.bold,
      overflow: 'hidden',
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: isNarrow ? typography.fontSize.md : typography.fontSize.lg,
      lineHeight: isNarrow ? 22 : 25,
      fontWeight: typography.fontWeight.bold,
      marginTop: spacing.xs,
    },
    emptyBody: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.sm,
      lineHeight: 20,
      maxWidth: 286,
    },
    bookButton: {
      alignSelf: 'flex-start',
      marginTop: spacing.sm,
      minHeight: 44,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    bookButtonPressed: {
      backgroundColor: colors.primaryPressed,
      transform: [{ scale: 0.98 }],
    },
    bookButtonText: {
      color: colors.onPrimary,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.bold,
    },
    emptyArt: {
      width: isNarrow ? '100%' : 126,
      minHeight: isNarrow ? 82 : 126,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: isNarrow ? 'stretch' : 'center',
    },
    artPanel: {
      width: isNarrow ? '100%' : 126,
      height: isNarrow ? 82 : 126,
      borderRadius: 24,
      backgroundColor: colors.primary + '0F',
      borderWidth: 1,
      borderColor: colors.primary + '22',
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    routeLine: {
      position: 'absolute',
      left: -8,
      right: -8,
      top: isNarrow ? 42 : 68,
      height: 4,
      borderRadius: 99,
      backgroundColor: colors.primary + '33',
      transform: [{ rotate: isNarrow ? '-4deg' : '-18deg' }],
    },
    pinBubble: {
      position: 'absolute',
      left: isNarrow ? '20%' : 12,
      top: isNarrow ? 23 : 30,
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.surface,
    },
    parcelBubble: {
      width: 64,
      height: 64,
      borderRadius: 22,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.primary + '24',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 3,
    },
    arrowBubble: {
      position: 'absolute',
      right: isNarrow ? '20%' : 10,
      bottom: isNarrow ? 18 : 24,
      width: 34,
      height: 34,
      borderRadius: 17,
      backgroundColor: '#EF4444',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.surface,
    },
    glow: {
      position: 'absolute',
      width: 170,
      height: 170,
      borderRadius: 85,
      backgroundColor: colors.primary + '10',
      right: -72,
      bottom: -82,
    },
    errBox: { paddingHorizontal: spacing.md },
    err: { color: colors.danger, textDecorationLine: 'underline' },
  });
}

export function ActiveTripsSection() {
  const { trips, isLoading, isError, refetch } = useActiveTrips();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors, width), [colors, width]);
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const isEmpty = !isLoading && !isError && trips.length === 0;

  const onBookNow = () => {
    navigation.navigate('Map', { initialSnapIndex: 1 });
  };

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.h}>{isEmpty ? 'Next Booking' : 'Active Trips'}</Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.md }} />
      ) : isError ? (
        <Pressable onPress={refetch} style={styles.errBox}>
          <Text style={styles.err}>Could not load trips. Tap to retry.</Text>
        </Pressable>
      ) : trips.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyCard}>
            <View style={styles.glow} />
            <View style={styles.emptyCopy}>
              <Text style={styles.emptyEyebrow}>No active trips</Text>
              <Text style={styles.emptyTitle}>Book your next delivery</Text>
              <Text style={styles.emptyBody}>
                Compare live driver quotes and track your parcel from pickup to drop-off.
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Book now"
                onPress={onBookNow}
                style={({ pressed }) => [styles.bookButton, pressed && styles.bookButtonPressed]}
              >
                <Ionicons name="add-circle-outline" size={18} color={colors.onPrimary} />
                <Text style={styles.bookButtonText}>Book Now</Text>
              </Pressable>
            </View>
            <View style={styles.emptyArt} pointerEvents="none">
              <View style={styles.artPanel}>
                <View style={styles.routeLine} />
                <View style={styles.pinBubble}>
                  <Ionicons name="location" size={18} color={colors.onPrimary} />
                </View>
                <View style={styles.parcelBubble}>
                  <Ionicons name="cube" size={31} color={colors.primary} />
                </View>
                <View style={styles.arrowBubble}>
                  <Ionicons name="arrow-forward" size={17} color="#ffffff" />
                </View>
              </View>
            </View>
          </View>
        </View>
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
