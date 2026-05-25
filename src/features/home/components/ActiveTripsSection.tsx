import { useEffect, useMemo, useRef, type RefObject } from 'react';
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { ActiveTripCard } from '@/features/home/components/ActiveTripCard';
import { useActiveTrips } from '@/features/home/hooks/useActiveTrips';
import { useTheme } from '@/hooks/useTheme';
import { IllustratedActionCard } from '@/shared/components/IllustratedActionCard';
import { Skeleton, SkeletonCard } from '@/shared/components/Skeleton';
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
  const slideWidth = Math.max(260, Math.min(320, width - spacing.md * 2));
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
    countPill: {
      minWidth: 30,
      height: 30,
      borderRadius: 15,
      paddingHorizontal: spacing.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary + '18',
    },
    countText: {
      color: colors.primary,
      fontSize: typography.fontSize.sm,
      fontWeight: '900',
    },
    hScroll: { paddingLeft: spacing.md, paddingRight: spacing.sm, gap: spacing.sm },
    slide: { width: slideWidth },
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
    bookButton: {
      alignSelf: 'flex-start',
      marginTop: spacing.xs,
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
      width: isNarrow ? '100%' : 108,
      minHeight: isNarrow ? 76 : 108,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: isNarrow ? 'stretch' : 'center',
    },
    artPanel: {
      width: isNarrow ? '100%' : 108,
      height: isNarrow ? 76 : 108,
      borderRadius: 22,
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
      top: isNarrow ? 39 : 58,
      height: 4,
      borderRadius: 99,
      backgroundColor: colors.primary + '33',
      transform: [{ rotate: isNarrow ? '-4deg' : '-18deg' }],
    },
    pinBubble: {
      position: 'absolute',
      left: isNarrow ? '20%' : 10,
      top: isNarrow ? 20 : 26,
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.surface,
    },
    parcelBubble: {
      width: 56,
      height: 56,
      borderRadius: 20,
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
      bottom: isNarrow ? 15 : 20,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: '#EF4444',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 3,
      borderColor: colors.surface,
    },
    offerIconBubble: {
      width: isNarrow ? 56 : 64,
      height: isNarrow ? 56 : 64,
      borderRadius: isNarrow ? 20 : 23,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: colors.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 3,
    },
    glow: {
      position: 'absolute',
      width: 140,
      height: 140,
      borderRadius: 70,
      backgroundColor: colors.primary + '10',
      right: -58,
      bottom: -70,
    },
    errBox: { paddingHorizontal: spacing.md },
    err: { color: colors.danger, textDecorationLine: 'underline' },
  });
}

function SectionHeader({
  title,
  subtitle,
  count,
  styles,
}: {
  title: string;
  subtitle?: string;
  count?: number;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.header}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.h}>{title}</Text>
        {subtitle ? <Text style={styles.subH}>{subtitle}</Text> : null}
      </View>
      {typeof count === 'number' ? (
        <View style={styles.countPill}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      ) : null}
    </View>
  );
}

function OffersCarousel({
  colors,
  styles,
  offerScrollRef,
  offerSnapInterval,
  onBookNow,
  onOfferScrollBeginDrag,
  onOfferScrollEndDrag,
  onOfferMomentumScrollEnd,
}: {
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  offerScrollRef: RefObject<ScrollView | null>;
  offerSnapInterval: number;
  onBookNow: () => void;
  onOfferScrollBeginDrag: () => void;
  onOfferScrollEndDrag: () => void;
  onOfferMomentumScrollEnd: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}) {
  return (
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
  );
}

export function ActiveTripsSection() {
  const { trips, isLoading, isError, refetch } = useActiveTrips();
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const styles = useMemo(() => createStyles(colors, width), [colors, width]);
  const navigation = useNavigation<BottomTabNavigationProp<MainTabParamList>>();
  const hasActiveTrips = !isLoading && !isError && trips.length > 0;
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
    if (isLoading || isError) return;
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
  }, [isError, isLoading, offerSnapInterval]);

  return (
    <View style={styles.section}>
      {isLoading ? (
        <>
          <SectionHeader title="Active Bookings" styles={styles} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hScroll}
          >
            {[0, 1].map((item) => (
              <View key={item} style={styles.slide}>
                <ActiveTripSkeletonCard />
              </View>
            ))}
          </ScrollView>
        </>
      ) : isError ? (
        <Pressable onPress={refetch} style={styles.errBox}>
          <Text style={styles.err}>Could not load trips. Tap to retry.</Text>
        </Pressable>
      ) : trips.length === 0 ? (
        <>
          <SectionHeader
            title="Next Booking"
            subtitle="Offers and booking ideas for your next delivery."
            styles={styles}
          />
          <OffersCarousel
            colors={colors}
            styles={styles}
            offerScrollRef={offerScrollRef}
            offerSnapInterval={offerSnapInterval}
            onBookNow={onBookNow}
            onOfferScrollBeginDrag={onOfferScrollBeginDrag}
            onOfferScrollEndDrag={onOfferScrollEndDrag}
            onOfferMomentumScrollEnd={onOfferMomentumScrollEnd}
          />
        </>
      ) : (
        <>
          <SectionHeader
            title="Active Bookings"
            subtitle="Track the deliveries already in motion."
            count={trips.length}
            styles={styles}
          />
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

          {hasActiveTrips ? (
            <>
              <SectionHeader
                title="For Your Next Delivery"
                subtitle="Offers and quick starts stay below active bookings."
                styles={styles}
              />
              <OffersCarousel
                colors={colors}
                styles={styles}
                offerScrollRef={offerScrollRef}
                offerSnapInterval={offerSnapInterval}
                onBookNow={onBookNow}
                onOfferScrollBeginDrag={onOfferScrollBeginDrag}
                onOfferScrollEndDrag={onOfferScrollEndDrag}
                onOfferMomentumScrollEnd={onOfferMomentumScrollEnd}
              />
            </>
          ) : null}
        </>
      )}
    </View>
  );
}

function ActiveTripSkeletonCard() {
  return (
    <SkeletonCard>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Skeleton width={40} height={40} radius={20} />
        <View style={{ flex: 1, gap: spacing.xs }}>
          <Skeleton width="70%" height={18} />
          <Skeleton width={80} height={18} radius={999} />
        </View>
        <Skeleton width={48} height={48} radius={12} />
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.sm }}>
        <Skeleton width={28} height={104} radius={14} />
        <View style={{ flex: 1, gap: spacing.sm }}>
          <Skeleton width="90%" height={16} />
          <Skeleton width="36%" height={14} />
          <Skeleton width="82%" height={16} style={{ marginTop: spacing.sm }} />
          <Skeleton width="32%" height={14} />
        </View>
      </View>
    </SkeletonCard>
  );
}
