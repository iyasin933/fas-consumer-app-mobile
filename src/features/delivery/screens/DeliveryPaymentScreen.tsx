import { CommonActions } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { isAxiosError } from 'axios';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useStripe } from '@stripe/stripe-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  confirmPaymentIntentMobile,
  createDeliveryPaymentIntentClientSecret,
  paymentIntentIdFromClientSecret,
  stringifyResponseData,
  summarizePaymentApiError,
} from '@/features/delivery/api/deliveryPaymentApi';
import { useTheme } from '@/hooks/useTheme';
import { env } from '@/shared/config/env';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import type { AppStackParamList } from '@/types/navigation.types';

type Props = NativeStackScreenProps<AppStackParamList, 'DeliveryPayment'>;

/** After payment: land on Map tab (live tracking). Tab order must match `MainTabNavigator`. */
function resetToMapTracking(
  navigation: Props['navigation'],
): void {
  navigation.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [
        {
          name: 'MainTabs',
          state: {
            routes: [
              { name: 'HomeMain' },
              { name: 'Bookings' },
              { name: 'Map', params: { initialSnapIndex: 2 } },
              { name: 'Notifications' },
              { name: 'Settings' },
            ],
            index: 2,
          },
        },
      ],
    }),
  );
}

function formatGbpFromPence(pence: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
}

export function DeliveryPaymentScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { amountPence, vehicleName, loadId } = route.params;

  const [busy, setBusy] = useState(false);
  const [showSuccessConfetti, setShowSuccessConfetti] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.background },
        confettiLayer: {
          ...StyleSheet.absoluteFillObject,
          zIndex: 10,
          pointerEvents: 'none',
        },
        body: { flex: 1, padding: spacing.lg, gap: spacing.md },
        title: {
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.bold,
          color: colors.textPrimary,
        },
        meta: { fontSize: typography.fontSize.md, color: colors.textSecondary },
        amount: { fontSize: typography.fontSize.xl, fontWeight: '800', color: colors.textPrimary },
        cta: {
          marginTop: spacing.lg,
          backgroundColor: colors.primary,
          paddingVertical: spacing.md,
          borderRadius: 12,
          alignItems: 'center',
        },
        ctaDisabled: { opacity: 0.5 },
        ctaTxt: {
          color: colors.onPrimary,
          fontSize: typography.fontSize.md,
          fontWeight: typography.fontWeight.bold,
        },
      }),
    [colors],
  );

  const pay = useCallback(async () => {
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
  }, [amountPence, initPaymentSheet, loadId, presentPaymentSheet, vehicleName]);

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
              resetToMapTracking(navigation);
            }}
          />
        </View>
      ) : null}
      <View style={styles.body}>
        <Text style={styles.title}>Payment</Text>
        <Text style={styles.meta}>{vehicleName}</Text>
        <Text style={styles.amount}>{formatGbpFromPence(amountPence)}</Text>
        <Text style={styles.meta}>
          You will complete card details in the secure Stripe sheet (Apple Pay may appear if enabled on
          device and your Stripe Dashboard).
        </Text>
        <Pressable style={[styles.cta, busy && styles.ctaDisabled]} onPress={pay} disabled={busy}>
          {busy ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text style={styles.ctaTxt}>PAY WITH STRIPE</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
