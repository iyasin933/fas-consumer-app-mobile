import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { isAxiosError } from 'axios';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useStripe } from '@stripe/stripe-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  confirmPaymentIntentMobile,
  createDeliveryPaymentIntentClientSecret,
  paymentIntentIdFromClientSecret,
  stringifyResponseData,
  summarizePaymentApiError,
} from '@/features/delivery/api/deliveryPaymentApi';
import { allocateDropyouLoad } from '@/features/delivery/api/dropyouAllocateLoadApi';
import { useDeliveryOrderDraftStore } from '@/features/delivery/store/deliveryOrderDraftStore';
import { useTheme } from '@/hooks/useTheme';
import { env } from '@/shared/config/env';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import type { AppStackParamList } from '@/types/navigation.types';

type Props = NativeStackScreenProps<AppStackParamList, 'DeliveryPayment'>;

function formatGbpFromPence(pence: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
}

function normalizePhoneForAllocation(phone?: string): string {
  const digits = phone?.replace(/\D/g, '') ?? '';
  return digits ? `+${digits}` : '';
}

export function DeliveryPaymentScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const {
    amountPence,
    vehicleName,
    loadId,
    bookingId,
    carrierName,
    quoteId,
    quoteOwnerId,
    quoteOwnerPhone,
    agreedRate,
  } = route.params;
  const pickup = useDeliveryOrderDraftStore((s) => s.pickup);
  const dropoff = useDeliveryOrderDraftStore((s) => s.dropoff);
  const hasAutoPresentedRef = useRef(false);

  const [busy, setBusy] = useState(false);
  const [showSuccessConfetti, setShowSuccessConfetti] = useState(false);
  const amountLabel = useMemo(() => formatGbpFromPence(amountPence), [amountPence]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.background },
        confettiLayer: {
          ...StyleSheet.absoluteFillObject,
          zIndex: 10,
          pointerEvents: 'none',
        },
        scroll: { flex: 1 },
        body: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: 118 + insets.bottom,
          gap: spacing.md,
        },
        eyebrow: {
          color: colors.primary,
          fontSize: 12,
          fontWeight: typography.fontWeight.bold,
          letterSpacing: 0,
          textTransform: 'uppercase',
        },
        title: {
          fontSize: 22,
          lineHeight: 28,
          fontWeight: '900',
          color: colors.textPrimary,
          marginTop: 2,
        },
        subtitle: {
          color: colors.textSecondary,
          fontSize: typography.fontSize.sm,
          lineHeight: 20,
          marginTop: 4,
        },
        summaryCard: {
          backgroundColor: colors.surface,
          borderRadius: 18,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          padding: spacing.md,
          gap: spacing.md,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
          shadowRadius: 18,
          elevation: 3,
        },
        amountRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: spacing.md,
        },
        vehiclePill: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 7,
          alignSelf: 'flex-start',
          borderRadius: 999,
          paddingVertical: 7,
          paddingHorizontal: 10,
          backgroundColor: colors.primary + '18',
        },
        vehicleText: {
          color: colors.primary,
          fontSize: typography.fontSize.sm,
          fontWeight: typography.fontWeight.bold,
        },
        amountBlock: { alignItems: 'flex-end', marginLeft: 'auto' },
        amountLabel: {
          color: colors.textSecondary,
          fontSize: 12,
          fontWeight: typography.fontWeight.bold,
        },
        amount: {
          fontSize: typography.fontSize.xl,
          lineHeight: 33,
          fontWeight: '900',
          color: colors.textPrimary,
        },
        divider: {
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border,
        },
        routeRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          minHeight: 42,
        },
        routeIcon: {
          width: 34,
          height: 34,
          borderRadius: 17,
          alignItems: 'center',
          justifyContent: 'center',
        },
        routeCopy: { flex: 1, minWidth: 0 },
        routeLabel: {
          color: colors.textSecondary,
          fontSize: 11,
          fontWeight: typography.fontWeight.bold,
          textTransform: 'uppercase',
        },
        routeAddress: {
          color: colors.textPrimary,
          fontSize: typography.fontSize.sm,
          lineHeight: 19,
          fontWeight: typography.fontWeight.bold,
          marginTop: 2,
        },
        footer: {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: Math.max(insets.bottom, spacing.md),
          backgroundColor: colors.background,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
        },
        cta: {
          backgroundColor: colors.primary,
          minHeight: 56,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: spacing.sm,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.24,
          shadowRadius: 12,
          elevation: 4,
        },
        ctaPressed: { backgroundColor: colors.primaryPressed, transform: [{ scale: 0.99 }] },
        ctaDisabled: { opacity: 0.65 },
        ctaTxt: {
          color: colors.onPrimary,
          fontSize: typography.fontSize.md,
          fontWeight: typography.fontWeight.bold,
          letterSpacing: 0.5,
        },
      }),
    [colors, insets.bottom],
  );

  const pay = useCallback(async () => {
    if (busy) return;
    if (!env.stripePublishableKey) {
      Alert.alert('Stripe', 'Add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY to your environment.');
      return;
    }
    setBusy(true);
    try {
      if (__DEV__) {
        console.log('[DeliveryPayment] start pay', {
          amountPence,
          gbpFromPence: (amountPence / 100).toFixed(2),
          createIntentAmountMode: env.paymentCreateIntentAmountInMajorUnits ? 'major (pounds)' : 'minor (pence)',
          loadId,
          bookingId,
          quoteId,
          carrierName,
          quoteOwnerId,
          quoteOwnerPhone,
          agreedRate,
          vehicleName,
        });
      }
      const paymentIntentClientSecret = await createDeliveryPaymentIntentClientSecret({
        amount: amountPence,
        currency: 'gbp',
        ...(loadId != null ? { loadId } : {}),
      });

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'DropYou',
        paymentIntentClientSecret,
        allowsDelayedPaymentMethods: true,
        returnURL: 'dropyou://stripe-redirect',
      });

      if (initError) {
        Alert.alert('Payment', initError.message);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code === 'Canceled') return;
        Alert.alert('Payment', presentError.message);
        return;
      }

      const paymentIntentId = paymentIntentIdFromClientSecret(paymentIntentClientSecret);
      try {
        await confirmPaymentIntentMobile(paymentIntentId);
      } catch (e) {
        Alert.alert(
          'Payment',
          `The payment went through, but confirming with the server failed: ${summarizePaymentApiError(e)}`,
        );
        return;
      }

      if (loadId != null && quoteOwnerId) {
        if (__DEV__) {
          console.log('[DeliveryPayment] assigning load to subcontractor', {
            loadId,
            quoteOwnerId,
            quoteOwnerPhone,
            normalizedDriverPhoneNumber: normalizePhoneForAllocation(quoteOwnerPhone),
            agreedRate,
          });
        }
        await allocateDropyouLoad(loadId, {
          subcontractor: quoteOwnerId,
          driverPhoneNumber: normalizePhoneForAllocation(quoteOwnerPhone),
          notes: '',
          agreedRate,
        });
      } else {
        Alert.alert(
          'Payment',
          'Payment succeeded, but the carrier could not be assigned because driver details were missing.',
        );
        return;
      }

      setShowSuccessConfetti(true);
    } catch (e) {
      if (isAxiosError(e)) {
        console.warn(
          '[DeliveryPayment] request failed',
          e.config?.method,
          e.config?.url,
          e.response?.status,
          stringifyResponseData(e.response?.data),
        );
      } else {
        console.warn('[DeliveryPayment]', e);
      }
      Alert.alert('Payment', summarizePaymentApiError(e));
    } finally {
      setBusy(false);
    }
  }, [
    agreedRate,
    amountPence,
    bookingId,
    busy,
    carrierName,
    initPaymentSheet,
    loadId,
    presentPaymentSheet,
    quoteId,
    quoteOwnerId,
    quoteOwnerPhone,
    vehicleName,
  ]);

  useEffect(() => {
    if (hasAutoPresentedRef.current) return;
    hasAutoPresentedRef.current = true;
    const handle = setTimeout(() => {
      void pay();
    }, 450);
    return () => clearTimeout(handle);
  }, [pay]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      {showSuccessConfetti ? (
        <View style={styles.confettiLayer} pointerEvents="none">
          <ConfettiCannon
            count={220}
            origin={{ x: width / 2, y: -16 }}
            fadeOut
            fallSpeed={3200}
            colors={[colors.primary, '#22c55e', '#86efac', '#fcd34d', colors.onPrimary]}
            onAnimationEnd={() => {
              setShowSuccessConfetti(false);
              if (loadId != null) {
                navigation.reset({
                  index: 0,
                  routes: [
                    {
                      name: 'DeliveryTracking',
                      params: {
                        loadId: String(loadId),
                        bookingId,
                        vehicleName,
                        amountPence,
                        carrierName,
                        quoteId,
                      },
                    },
                  ],
                });
              }
            }}
          />
        </View>
      ) : null}
      <ScrollView style={styles.scroll} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={styles.eyebrow}>Secure checkout</Text>
          <Text style={styles.title}>Booking summary</Text>
          <Text style={styles.subtitle}>Review your delivery details before payment.</Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.amountRow}>
            <View style={styles.vehiclePill}>
              <Ionicons name="car-sport" size={15} color={colors.primary} />
              <Text style={styles.vehicleText} numberOfLines={1}>
                {vehicleName}
              </Text>
            </View>
            <View style={styles.amountBlock}>
              <Text style={styles.amountLabel}>Total</Text>
              <Text style={styles.amount}>{amountLabel}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.routeRow}>
            <View style={[styles.routeIcon, { backgroundColor: colors.primary + '18' }]}>
              <Ionicons name="location-sharp" size={18} color={colors.primary} />
            </View>
            <View style={styles.routeCopy}>
              <Text style={styles.routeLabel}>Pickup</Text>
              <Text style={styles.routeAddress} numberOfLines={2}>
                {pickup?.address ?? 'Pickup location'}
              </Text>
            </View>
          </View>

          <View style={styles.routeRow}>
            <View style={[styles.routeIcon, { backgroundColor: '#FEE2E2' }]}>
              <Ionicons name="flag" size={17} color="#EF4444" />
            </View>
            <View style={styles.routeCopy}>
              <Text style={styles.routeLabel}>Dropoff</Text>
              <Text style={styles.routeAddress} numberOfLines={2}>
                {dropoff?.address ?? 'Dropoff location'}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          style={({ pressed }) => [styles.cta, busy && styles.ctaDisabled, pressed && !busy && styles.ctaPressed]}
          onPress={pay}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <>
              <Ionicons name="card" size={20} color={colors.onPrimary} />
              <Text style={styles.ctaTxt}>Pay {amountLabel}</Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
