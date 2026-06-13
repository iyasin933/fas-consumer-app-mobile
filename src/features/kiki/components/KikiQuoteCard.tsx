import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { isAxiosError } from 'axios';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { api } from '@/api/client';
import { useKikiChatStore } from '@/features/kiki/store/kikiChatStore';
import type { KikiQuote } from '@/features/kiki/types';
import { useTheme } from '@/hooks/useTheme';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import type { AppStackParamList } from '@/types/navigation.types';

type Props = {
  quote: KikiQuote;
  onAccept?: () => void;
};

function createStyles(colors: ThemeColors, narrow: boolean) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
      borderRadius: narrow ? 12 : 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: narrow ? spacing.sm : spacing.md,
      marginBottom: narrow ? spacing.xs : spacing.sm,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: narrow ? spacing.xs : spacing.sm,
      flex: 1,
    },
    avatar: {
      width: narrow ? 36 : 44,
      height: narrow ? 36 : 44,
      borderRadius: narrow ? 18 : 22,
      backgroundColor: '#D4F3E1',
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      fontSize: narrow ? 12 : 14,
      fontWeight: '700',
      color: colors.primary,
    },
    info: {
      flex: 1,
    },
    name: {
      fontSize: narrow ? typography.fontSize.xs : typography.fontSize.sm,
      fontWeight: '600',
      color: colors.textPrimary,
    },
    meta: {
      fontSize: narrow ? typography.fontSize.xs : typography.fontSize.sm,
      color: colors.textSecondary,
      marginTop: 2,
    },
    price: {
      fontSize: narrow ? typography.fontSize.md : typography.fontSize.lg,
      fontWeight: '700',
      color: colors.primary,
    },
    vatLabel: {
      fontSize: narrow ? typography.fontSize.xs : typography.fontSize.sm,
      color: colors.primary,
    },
    acceptBtn: {
      marginTop: narrow ? spacing.xs : spacing.sm,
      minHeight: narrow ? 44 : 48,
      borderRadius: 999,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
      paddingHorizontal: narrow ? spacing.sm : spacing.md,
    },
    acceptDisabled: {
      opacity: 0.5,
    },
    acceptText: {
      color: colors.onPrimary,
      fontSize: narrow ? typography.fontSize.xs : typography.fontSize.sm,
      fontWeight: '600',
    },
    acceptedBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: narrow ? spacing.xs : spacing.sm,
      paddingVertical: narrow ? 2 : 4,
      borderRadius: 999,
      backgroundColor: '#D4F3E1',
      marginTop: narrow ? spacing.xs : spacing.sm,
    },
    acceptedText: {
      fontSize: narrow ? typography.fontSize.xs : typography.fontSize.sm,
      fontWeight: '600',
      color: colors.primary,
    },
  });
}

function companyInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function KikiQuoteCard({ quote, onAccept }: Props) {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const narrow = width < 380;
  const styles = useMemo(() => createStyles(colors, narrow), [colors, narrow]);
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [loading, setLoading] = useState(false);
  const acceptedQuoteId = useKikiChatStore((s) => s.acceptedQuoteId);

  const q = quote.quote ?? quote;
  const quoteId = q.quoteId ?? quote.quoteId;
  const bookingId = typeof q.bookingId === 'string' ? q.bookingId : undefined;
  const status = (typeof q.status === 'string' ? q.status : '').toUpperCase();
  const isAccepted =
    status === 'ACCEPTED' ||
    (acceptedQuoteId != null &&
      quoteId != null &&
      String(acceptedQuoteId) === String(quoteId));

  const companyName =
    typeof q.quoteOwnerCompanyName === 'string'
      ? q.quoteOwnerCompanyName
      : 'Driver';
  const vehicleType = typeof q.vehicleType === 'string' ? q.vehicleType : '';
  const price = typeof q.price === 'number' ? q.price : Number(q.price ?? 0);
  const initials = companyInitials(companyName);

  const handleAccept = async () => {
    if (!bookingId || !quoteId) {
      Alert.alert('Error', 'Missing booking or quote information.');
      return;
    }

    setLoading(true);
    try {
      const url = `/dropyou/accept-quote/${bookingId}`;
      const response = await api.post(url, { quoteId: String(quoteId) });

      if (response.status === 200) {
        useKikiChatStore.getState().setAcceptedQuoteId(quoteId);
        if (onAccept) onAccept();
        navigation.navigate('DeliveryPayment', {
          backTitle: 'Kiki',
          amountPence: Math.round(price * 100),
          vehicleName: vehicleType || 'Car',
          bookingId,
          quoteId: String(quoteId),
          carrierName: companyName,
        });
      }
    } catch (err: unknown) {
      const message = isAxiosError(err)
        ? (err.response?.data as Record<string, unknown>)?.message ?? 'Failed to accept quote'
        : 'Failed to accept quote';
      Alert.alert('Quote', typeof message === 'string' ? message : 'Failed to accept quote');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <View style={styles.left}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>
              {companyName}
            </Text>
            {vehicleType ? (
              <Text style={styles.meta}>{vehicleType}</Text>
            ) : null}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.price}>£{price.toFixed(2)}</Text>
          <Text style={styles.vatLabel}>Inc. VAT</Text>
        </View>
      </View>

      {isAccepted ? (
        <View style={styles.acceptedBadge}>
          <Text style={styles.acceptedText}>Accepted</Text>
        </View>
      ) : status !== 'CANCELLED' ? (
        <Pressable
          style={[styles.acceptBtn, loading && styles.acceptDisabled]}
          onPress={() => void handleAccept()}
          disabled={loading}
          accessibilityRole="button"
          accessibilityLabel="Accept quote"
        >
          {loading ? (
            <Ionicons name="hourglass-outline" size={narrow ? 14 : 16} color={colors.onPrimary} />
          ) : (
            <Ionicons name="checkmark" size={narrow ? 14 : 16} color={colors.onPrimary} />
          )}
          <Text style={styles.acceptText}>
            {loading ? 'Accepting...' : 'Accept'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}