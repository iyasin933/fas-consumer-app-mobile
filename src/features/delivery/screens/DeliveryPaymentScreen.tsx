import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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

function formatGbpFromPence(pence: number): string {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(pence / 100);
}

export function DeliveryPaymentScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const { amountPence, vehicleName, loadId } = route.params;

  const [busy, setBusy] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.background },
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

      Alert.alert('Success', 'Your payment was completed.', [
        {
          text: 'OK',
          onPress: () => {
            if (navigation.canGoBack()) {
              navigation.pop(4);
            } else {
              navigation.navigate('MainTabs');
            }
          },
        },
      ]);
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
  }, [amountPence, initPaymentSheet, loadId, navigation, presentPaymentSheet]);

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
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
