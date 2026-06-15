import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { isAxiosError } from 'axios';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { acceptDropyouQuote } from '@/features/delivery/api/dropyouAcceptQuoteApi';
import { DropyouQuoteCard } from '@/features/delivery/components/DropyouQuoteCard';
import type { DropyouQuoteCardModel } from '@/features/delivery/utils/dropyouQuoteCardData';
import { useKikiChatStore } from '@/features/kiki/store/kikiChatStore';
import type { KikiQuote } from '@/features/kiki/types';
import type { AppStackParamList } from '@/types/navigation.types';

type Props = {
  conversationKey: string;
  quote: KikiQuote;
  onAccept?: () => void;
  fallbackBookingId?: string | null;
  fallbackLoadId?: string | number | null;
};

function str(v: unknown): string {
  if (typeof v === 'string' && v.trim()) return v.trim();
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return '';
}
function num(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Map a KikiQuote into the DropyouQuoteCardModel that the main quotes
 * screen uses. We mirror the same extraction logic from
 * parseDropyouQuoteCardModel but without the strict null-on-missing
 * checks — socket quotes in Kiki may arrive before bookingId is populated.
 */
function kikiQuoteToCardModel(quote: KikiQuote): DropyouQuoteCardModel {
  const q = (quote.quote ?? quote) as Record<string, unknown>;
  const top = quote as Record<string, unknown>;
  const quoteOwner =
    q.quoteOwner && typeof q.quoteOwner === 'object'
      ? (q.quoteOwner as Record<string, unknown>)
      : undefined;

  const quoteId = str(q.quoteId ?? top.quoteId) || `anon-${Date.now()}`;
  const loadId = str(q.loadId ?? top.loadId) || '';
  const bookingId = str(q.bookingId ?? top.bookingId) || '';

  const companyName =
    str(q.quoteOwnerCompanyName) ||
    str(q.quote_owner_company_name) ||
    str(quoteOwner?.companyName) ||
    str(q.companyName) ||
    str(q.carrierName) ||
    'Driver';

  const createdOn =
    str(q.createdOn) || str(q.created_on) || str(q.eventTime) || new Date().toISOString();

  const status = (str(q.status) || 'POSTED').toUpperCase();
  const vehicleType = str(q.vehicleType) || str(q.vehicle_type) || '—';
  const currency = str(q.currency) || 'GBP';

  const totalPrice = num(q.totalPrice) || num(q.total_price) || num(q.total);
  const rawPrice = num(q.price);
  const priceMajor = totalPrice > 0 ? totalPrice : rawPrice > 0 ? rawPrice : 0;

  const savingsPct = num(q.savingsPercentage) || num(q.savings_percentage) || null;
  const isCheaper = Boolean(q.isCheaper) || Boolean(q.is_cheaper);
  const isExpensive = Boolean(q.isExpensive) || Boolean(q.is_expensive);
  const showDeal = isCheaper || isExpensive;

  return {
    quoteId,
    loadId,
    bookingId,
    companyName,
    createdOn,
    status,
    price: priceMajor,
    currency,
    vehicleType,
    savingsPercentage: savingsPct,
    isCheaper,
    isExpensive,
    showDeal,
    originalPrice: null,
    savingsAmountMajor: null,
    dealScore: null,
    dealLabel: null,
    dealColor: null,
    dealDeltaAmountMajor: null,
    dealDeltaDirection: null,
    quoteOwnerId:
      str(q.quoteOwnerId) ||
      str(q.quote_owner_id) ||
      str(quoteOwner?.id) ||
      null,
    quoteOwnerPhone:
      str(q.quoteOwnerPhone) ||
      str(q.quote_owner_phone) ||
      str(quoteOwner?.phone) ||
      null,
    agreedRate: priceMajor,
  };
}

export function KikiQuoteCard({
  conversationKey,
  quote,
  onAccept,
  fallbackBookingId,
  fallbackLoadId,
}: Props) {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [loading, setLoading] = useState(false);
  const acceptedQuoteId = useKikiChatStore(
    (s) => s.conversations[conversationKey]?.acceptedQuoteId ?? null,
  );

  const q = (quote.quote ?? quote) as Record<string, unknown>;
  const top = quote as Record<string, unknown>;
  const quoteOwner =
    q.quoteOwner && typeof q.quoteOwner === 'object'
      ? (q.quoteOwner as Record<string, unknown>)
      : undefined;
  const quoteId = str(q.quoteId ?? top.quoteId) || '';
  const bookingId = str(q.bookingId ?? top.bookingId) || str(fallbackBookingId) || '';
  const status = (str(q.status) || 'POSTED').toUpperCase();
  const vehicleType = str(q.vehicleType) || 'Car';
  const companyName =
    str(q.quoteOwnerCompanyName) ||
    str(q.quote_owner_company_name) ||
    str(quoteOwner?.companyName) ||
    'Driver';
  const price =
    num(q.price) || num(q.totalPrice) || num(top.price) || num(top.totalPrice) || 0;
  const model = kikiQuoteToCardModel(quote);
  const paymentLoadId = model.loadId || str(fallbackLoadId);
  const sourceQuoteId = q.quoteId ?? top.quoteId;
  const sourceBookingId = q.bookingId ?? top.bookingId;
  const sourceLoadId = q.loadId ?? top.loadId;
  const canAccept = Boolean(bookingId && quoteId);

  const isAccepted =
    status === 'ACCEPTED' ||
    (acceptedQuoteId != null && quoteId && String(acceptedQuoteId) === quoteId);

  const handleAccept = useCallback(async () => {
    if (!bookingId || !quoteId) {
      if (__DEV__) {
        console.log('[KikiQuoteCard] accept blocked: missing ids', {
          bookingId,
          quoteId,
          quote: {
            quoteId: sourceQuoteId,
            bookingId: sourceBookingId,
            loadId: sourceLoadId,
          },
        });
      }
      Alert.alert('Error', 'Missing booking or quote information.');
      return;
    }

    setLoading(true);
    try {
      if (__DEV__) {
        console.log('[KikiQuoteCard] accepting quote', {
          bookingId,
          quoteId,
          price,
          vehicleType,
          companyName,
        });
      }
      await acceptDropyouQuote(bookingId, quoteId);
      useKikiChatStore
        .getState()
        .setAcceptedQuoteId(conversationKey, quoteId);
      if (onAccept) onAccept();
      navigation.navigate('DeliveryPayment', {
        backTitle: 'Kiki',
        amountPence: Math.round(price * 100),
        vehicleName: vehicleType || 'Car',
        loadId: paymentLoadId,
        bookingId,
        quoteId: String(quoteId),
        carrierName: companyName,
        quoteOwnerId: model.quoteOwnerId ?? undefined,
        quoteOwnerPhone: model.quoteOwnerPhone ?? undefined,
        agreedRate: model.agreedRate ?? undefined,
      });
    } catch (err: unknown) {
      const message = isAxiosError(err)
        ? ((err.response?.data as Record<string, unknown>)?.message ??
          'Failed to accept quote')
        : 'Failed to accept quote';
      Alert.alert(
        'Quote',
        typeof message === 'string' ? message : 'Failed to accept quote',
      );
    } finally {
      setLoading(false);
    }
  }, [
    bookingId,
    companyName,
    conversationKey,
    model,
    navigation,
    onAccept,
    price,
    quoteId,
    sourceBookingId,
    sourceLoadId,
    sourceQuoteId,
    vehicleType,
    paymentLoadId,
  ]);

  if (isAccepted) {
    return (
      <DropyouQuoteCard
        quote={{ ...model, status: 'ACCEPTED' }}
        onAccept={handleAccept}
        busy={false}
        acceptDisabled={!canAccept}
        acceptLabel={!canAccept ? 'Unavailable' : undefined}
      />
    );
  }

  return (
    <DropyouQuoteCard
      quote={model}
      onAccept={handleAccept}
      busy={loading}
      acceptDisabled={!canAccept}
      acceptLabel={!canAccept ? 'Unavailable' : undefined}
    />
  );
}
