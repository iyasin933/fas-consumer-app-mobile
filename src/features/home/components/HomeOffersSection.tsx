import { useEffect, useMemo, useRef } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { useTheme } from '@/hooks/useTheme';
import { IllustratedActionCard } from '@/shared/components/IllustratedActionCard';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import type { MainTabParamList } from '@/types/navigation.types';

const CURRENT_OFFERS = [
  {
    id: 'first-delivery',
    eyebrow: 'First delivery offer',
    title: '20% off your first delivery',
    body: 'Use promo code FIRST20 at checkout and track your parcel from pickup to drop-off.',
    code: 'FIRST20',
    icon: 'pricetag',
    tone: 'primary',
    cta: 'Book Now',
  },
  {
    id: 'live-quotes',
    eyebrow: 'Live driver quotes',
    title: 'Compare prices before you book',
    body: 'Get real-time carrier offers and pick the option that works best for your delivery.',
    icon: 'flash',
    tone: 'pressed',
    cta: 'Start Booking',
  },
  {
    id: 'scheduled',
    eyebrow: 'Plan ahead',
    title: 'Schedule pickup and drop-off',
    body: 'Choose the delivery windows that fit your day and keep every stop organised.',
    icon: 'calendar',
    tone: 'primary',
    cta: 'Schedule Now',
  },
] as const;

const LOOPED_OFFERS = [...CURRENT_OFFERS, CURRENT_OFFERS[0]];

function offerAccent(colors: ThemeColors, tone: (typeof CURRENT_OFFERS)[number]['tone']) {
  return tone === 'pressed' ? colors.primaryPressed : colors.primary;
}

function getOfferWidth(width: number) {
  return Math.max(282, width - spacing.md * 2);
}

function createStyles(colors: ThemeColors, width: number) {
  const offerWidth = getOfferWidth(width);
  const isNarrow = width < 370;
  return StyleSheet.create({
    section: { paddingBottom: spacing.xl, gap: spacing.lg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: spacing.md,
    },
    h: {
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      color: colors.textPrimary,
    },
    subH: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.sm,
      lineHeight: 20,
      fontWeight: typography.fontWeight.medium,
      marginTop: 2,
    },
    emptyOffersScroll: {
      paddingLeft: spacing.md,
      paddingRight: spacing.md,
      gap: spacing.sm,
    },
    emptyCard: {
      width: offerWidth,
      minHeight: isNarrow ? 220 : 168,
      borderRadius: 18,
      padding: spacing.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      overflow: 'hidden',
      flexDirection: isNarrow ? 'column' : 'row',
      alignItems: isNarrow ? 'flex-start' : 'center',
      gap: spacing.md,
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
    promoCode: {
      alignSelf: 'flex-start',
      marginTop: spacing.xs,
      borderRadius: 10,
      paddingHorizontal: spacing.sm,
      paddingVertical: 6,
      backgroundColor: colors.background,
      borderWidth: 1,
      borderColor: colors.border,
      color: colors.textPrimary,
      fontSize: typography.fontSize.sm,
      fontWeight: '800',
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
      lineHeight: 19,
      maxWidth: 276,
    },
  });
}

export function HomeOffersSection() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors, width), [colors, width]);
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const offerSnapInterval = getOfferWidth(width) + spacing.sm;
  const offerScrollRef = useRef<ScrollView | null>(null);
  const offerIndexRef = useRef(0);
  const offerDraggingRef = useRef(false);
  const offerResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onBookNow = () => {
    navigation.navigate('Map', { initialSnapIndex: 1 });
  };

  const resetOfferLoop = () => {
    if (offerResetTimerRef.current) {
      clearTimeout(offerResetTimerRef.current);
    }

    offerResetTimerRef.current = setTimeout(() => {
      offerIndexRef.current = 0;
      offerScrollRef.current?.scrollTo({ x: 0, animated: false });
      offerResetTimerRef.current = null;
    }, 520);
  };

  const onOfferScrollBeginDrag = () => {
    offerDraggingRef.current = true;
    if (offerResetTimerRef.current) {
      clearTimeout(offerResetTimerRef.current);
      offerResetTimerRef.current = null;
    }
  };

  const onOfferScrollEndDrag = () => {
    setTimeout(() => {
      offerDraggingRef.current = false;
    }, 420);
  };

  const onOfferMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / offerSnapInterval);
    offerDraggingRef.current = false;

    if (nextIndex >= CURRENT_OFFERS.length) {
      offerIndexRef.current = CURRENT_OFFERS.length;
      resetOfferLoop();
      return;
    }

    offerIndexRef.current = Math.max(0, nextIndex);
  };

  useEffect(() => {
    offerIndexRef.current = 0;
    offerDraggingRef.current = false;
    offerScrollRef.current?.scrollTo({ x: 0, animated: false });

    const timer = setInterval(() => {
      if (offerDraggingRef.current) return;

      const nextIndex = offerIndexRef.current + 1;
      offerIndexRef.current = nextIndex;
      offerScrollRef.current?.scrollTo({
        x: nextIndex * offerSnapInterval,
        animated: true,
      });

      if (nextIndex >= CURRENT_OFFERS.length) {
        resetOfferLoop();
      }
    }, 3500);

    return () => {
      clearInterval(timer);
      if (offerResetTimerRef.current) {
        clearTimeout(offerResetTimerRef.current);
        offerResetTimerRef.current = null;
      }
    };
  }, [offerSnapInterval]);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={styles.h}>Next Booking</Text>
          <Text style={styles.subH}>
            Offers and booking ideas for your next delivery.
          </Text>
        </View>
      </View>
      <ScrollView
        ref={offerScrollRef}
        horizontal
        decelerationRate="fast"
        disableIntervalMomentum
        snapToAlignment="start"
        snapToInterval={offerSnapInterval}
        scrollEventThrottle={16}
        onScrollBeginDrag={onOfferScrollBeginDrag}
        onScrollEndDrag={onOfferScrollEndDrag}
        onMomentumScrollEnd={onOfferMomentumScrollEnd}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.emptyOffersScroll}
      >
        {LOOPED_OFFERS.map((offer, index) => {
          const accent = offerAccent(colors, offer.tone);
          return (
            <IllustratedActionCard
              key={`${offer.id}-${index}`}
              containerStyle={styles.emptyCard}
              eyebrow={offer.eyebrow}
              title={offer.title}
              body={offer.body}
              code={'code' in offer ? offer.code : undefined}
              accent={accent}
              iconName={offer.icon}
              actionLabel={offer.cta}
              actionIcon="add-circle-outline"
              onActionPress={onBookNow}
            />
          );
        })}
      </ScrollView>
    </View>
  );
}
