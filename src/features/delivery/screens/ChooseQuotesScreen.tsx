import { useNavigation } from '@react-navigation/native';
import type {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { isAxiosError } from 'axios';
import { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { acceptDropyouQuote } from '@/features/delivery/api/dropyouAcceptQuoteApi';
import { DropyouQuoteCard } from '@/features/delivery/components/DropyouQuoteCard';
import { summarizePaymentApiError } from '@/features/delivery/api/deliveryPaymentApi';
import { useLoadQuotesSocket } from '@/features/delivery/providers/LoadQuotesSocketProvider';
import type { LoadQuoteRow } from '@/features/delivery/socket/loadQuotesSocket.types';
import { useLoadQuotesForLoad } from '@/features/delivery/store/loadQuotesStore';
import {
  majorToPence,
  parseDropyouQuoteCardModel,
} from '@/features/delivery/utils/dropyouQuoteCardData';
import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import type { AppStackParamList } from '@/types/navigation.types';

type Props = NativeStackScreenProps<AppStackParamList, 'ChooseQuotes'>;

function formatReceivedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

/** Best-effort line from unknown socket payload (TEG / legacy). */
function quoteSummaryLine(raw: unknown): string | null {
  if (raw == null || typeof raw !== 'object') return null;
  const top = raw as Record<string, unknown>;
  const quote = top.quote && typeof top.quote === 'object' ? (top.quote as Record<string, unknown>) : null;
  const o = quote ?? top;
  const bits: string[] = [];
  for (const key of ['price', 'amount', 'total', 'carrierName', 'carrier', 'name', 'driverName']) {
    const v = o[key];
    if (v != null && typeof v !== 'object') bits.push(String(v));
  }
  return bits.length ? bits.join(' · ') : null;
}

export function ChooseQuotesScreen({ route }: Props) {
  const { colors } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { loadId, bookingId: routeBookingId, vehicleName } = route.params;

  const quotes = useLoadQuotesForLoad(loadId);
  const { isConnected } = useLoadQuotesSocket();
  const [acceptingKey, setAcceptingKey] = useState<string | null>(null);

  const sortedQuotes = useMemo(
    () =>
      [...quotes].sort(
        (a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime(),
      ),
    [quotes],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.background },
        listFlex: { flex: 1 },
        list: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.xl,
          gap: spacing.md,
        },
        empty: {
          flexGrow: 1,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xl,
          alignItems: 'center',
          gap: spacing.md,
        },
        emptyTitle: {
          fontSize: typography.fontSize.lg,
          fontWeight: '700',
          color: colors.textPrimary,
          textAlign: 'center',
        },
        emptyBody: {
          fontSize: typography.fontSize.md,
          color: colors.textSecondary,
          textAlign: 'center',
          lineHeight: 22,
        },
        card: {
          backgroundColor: colors.surface,
          borderRadius: 14,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          gap: spacing.sm,
        },
        cardTitle: { fontSize: typography.fontSize.md, fontWeight: '700', color: colors.textPrimary },
        cardLine: { fontSize: typography.fontSize.sm, color: colors.textSecondary },
        sourcePill: {
          alignSelf: 'flex-start',
          paddingHorizontal: spacing.sm,
          paddingVertical: 4,
          borderRadius: 8,
          backgroundColor: colors.primary + '22',
        },
        sourceTxt: { fontSize: 12, fontWeight: '600', color: colors.primary },
      }),
    [colors],
  );

  const onAcceptQuote = useCallback(
    async (model: NonNullable<ReturnType<typeof parseDropyouQuoteCardModel>>) => {
      const key = `${model.loadId}:${model.quoteId}`;
      setAcceptingKey(key);
      try {
        await acceptDropyouQuote(model.bookingId, model.quoteId);
        navigation.navigate('DeliveryPayment', {
          amountPence: majorToPence(model.price, model.currency),
          vehicleName: model.vehicleType || vehicleName,
          loadId: model.loadId,
          bookingId: model.bookingId,
        });
      } catch (e) {
        if (isAxiosError(e)) {
          console.warn(
            '[ChooseQuotes] accept-quote failed',
            e.config?.method,
            e.config?.url,
            e.response?.status,
            e.response?.data,
          );
        }
        Alert.alert('Quote', summarizePaymentApiError(e));
      } finally {
        setAcceptingKey(null);
      }
    },
    [navigation, vehicleName],
  );

  const renderQuote = useCallback(
    ({ item }: { item: LoadQuoteRow }) => {
      const parsed = parseDropyouQuoteCardModel(item, routeBookingId);
      if (parsed) {
        const busy = acceptingKey === `${parsed.loadId}:${parsed.quoteId}`;
        return <DropyouQuoteCard quote={parsed} onAccept={() => void onAcceptQuote(parsed)} busy={busy} />;
      }
      const summary = quoteSummaryLine(item.raw);
      return (
        <View style={styles.card}>
          <View style={styles.sourcePill}>
            <Text style={styles.sourceTxt}>{item.source}</Text>
          </View>
          <Text style={styles.cardTitle}>Quote {item.quoteId}</Text>
          {summary ? <Text style={styles.cardLine}>{summary}</Text> : null}
          <Text style={styles.cardLine}>Received {formatReceivedAt(item.receivedAt)}</Text>
        </View>
      );
    },
    [acceptingKey, onAcceptQuote, routeBookingId, styles],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        style={styles.listFlex}
        data={sortedQuotes}
        keyExtractor={(item) => `${item.loadId}:${item.quoteId}:${item.receivedAt}`}
        renderItem={renderQuote}
        contentContainerStyle={sortedQuotes.length === 0 ? styles.empty : styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Waiting for quotes</Text>
            <Text style={styles.emptyBody}>
              Carriers respond in real time. Keep this screen open — new quotes appear here as soon as we receive
              them.
            </Text>
            {!isConnected ? (
              <Text style={styles.emptyBody}>
                You are offline from the quotes server. Check `EXPO_PUBLIC_SOCKET_URL` and your connection, then try
                again from the previous screen.
              </Text>
            ) : null}
          </View>
        }
      />
    </SafeAreaView>
  );
}
