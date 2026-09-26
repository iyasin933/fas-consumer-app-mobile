import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useMemo } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { useActiveJobs } from '@/features/bookings/hooks/useActiveJobs';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import type { AppStackParamList, MainTabParamList } from '@/types/navigation.types';

function createStyles(colors: ThemeColors, narrow: boolean) {
  return StyleSheet.create({
    wrap: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: narrow ? spacing.sm : spacing.md,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.primary + '14',
      padding: narrow ? spacing.sm : spacing.md,
    },
    iconBubble: {
      width: narrow ? 38 : 44,
      height: narrow ? 38 : 44,
      borderRadius: (narrow ? 38 : 44) / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    copy: { flex: 1, minWidth: 0, gap: 2 },
    title: {
      color: colors.textPrimary,
      fontSize: narrow ? typography.fontSize.sm : typography.fontSize.md,
      fontWeight: typography.fontWeight.bold,
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: narrow ? typography.fontSize.xs : typography.fontSize.sm,
    },
    cta: {
      minHeight: narrow ? 36 : 44,
      justifyContent: 'center',
      paddingHorizontal: narrow ? spacing.sm : spacing.md,
      borderRadius: 12,
      backgroundColor: colors.primary,
    },
    ctaText: {
      color: colors.onPrimary,
      fontSize: narrow ? typography.fontSize.xs : typography.fontSize.sm,
      fontWeight: typography.fontWeight.bold,
    },
  });
}

/** Home banner shown while the user has active (accepted, no POD) jobs. */
export function ActiveJobsBanner() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const narrow = width < 380;
  const styles = useMemo(() => createStyles(colors, narrow), [colors, narrow]);
  const tabNavigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { count, first } = useActiveJobs();

  const onTrack = useCallback(() => {
    if (first) {
      const loadId = (first.publicLoadId || first.loadId || first.id).trim();
      if (loadId) {
        navigation.navigate('DeliveryTracking', {
          backTitle: 'Home',
          loadId,
          ...(first.bookingId ? { bookingId: first.bookingId } : {}),
          vehicleName: first.vehicleName || undefined,
          pickupAddress: first.originAddress,
          dropoffAddress: first.destAddress,
          pickupTimeLabel: first.originTimeLabel,
          dropoffTimeLabel: first.destTimeLabel,
        });
        return;
      }
    }
    tabNavigation.navigate('Bookings');
  }, [first, navigation, tabNavigation]);

  if (count <= 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.iconBubble}>
          <Ionicons name="car-sport" size={narrow ? 18 : 22} color={colors.onPrimary} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>
            {count} active {count === 1 ? 'job' : 'jobs'}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            Track your deliveries live
          </Text>
        </View>
        <Pressable
          style={styles.cta}
          onPress={onTrack}
          hitSlop={4}
          accessibilityRole="button"
          accessibilityLabel={`Track ${count} active ${count === 1 ? 'job' : 'jobs'}`}
        >
          <Text style={styles.ctaText}>Track now</Text>
        </Pressable>
      </View>
    </View>
  );
}
