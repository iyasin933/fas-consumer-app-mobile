import { useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { DropyouQuoteCardModel } from '@/features/delivery/utils/dropyouQuoteCardData';
import {
  companyInitials,
  formatMajorCurrency,
  formatQuoteRelativeTime,
} from '@/features/delivery/utils/dropyouQuoteCardData';
import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type Props = {
  quote: DropyouQuoteCardModel;
  onAccept: () => void;
  busy: boolean;
};

export function DropyouQuoteCard({ quote, onAccept, busy }: Props) {
  const { colors, isDark } = useTheme();
  const initials = useMemo(() => companyInitials(quote.companyName), [quote.companyName]);
  const relative = useMemo(() => formatQuoteRelativeTime(quote.createdOn), [quote.createdOn]);
  const priceLabel = useMemo(
    () => formatMajorCurrency(quote.price, quote.currency),
    [quote.price, quote.currency],
  );
  const savingsLabel = useMemo(
    () =>
      quote.savingsAmountMajor != null
        ? `${formatMajorCurrency(quote.savingsAmountMajor, quote.currency)} cheaper`
        : null,
    [quote.currency, quote.savingsAmountMajor],
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: spacing.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          gap: spacing.md,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 10,
            },
            android: { elevation: 3 },
            default: {},
          }),
        },
        headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
        leftBlock: { flexDirection: 'row', flex: 1, gap: spacing.sm, minWidth: 0, paddingRight: spacing.sm },
        avatar: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.primary + '28',
          alignItems: 'center',
          justifyContent: 'center',
        },
        avatarTxt: {
          fontSize: typography.fontSize.sm,
          fontWeight: '700',
          color: colors.primary,
        },
        name: {
          fontSize: typography.fontSize.md,
          fontWeight: '700',
          color: colors.textPrimary,
        },
        time: {
          fontSize: typography.fontSize.sm,
          color: colors.textSecondary,
          marginTop: 2,
        },
        priceBlock: { alignItems: 'flex-end' },
        price: {
          fontSize: typography.fontSize.xl,
          fontWeight: '800',
          color: colors.textPrimary,
        },
        vatNote: {
          fontSize: typography.fontSize.sm,
          color: colors.muted,
          marginTop: 2,
        },
        footerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
        },
        dealPill: {
          flexDirection: 'row',
          alignItems: 'center',
          flexShrink: 1,
          backgroundColor: '#d1fae5',
          borderRadius: 999,
          paddingVertical: 6,
          paddingHorizontal: spacing.sm,
          gap: spacing.sm,
        },
        dealPillDark: {
          backgroundColor: isDark ? 'rgba(34, 197, 94, 0.18)' : '#d1fae5',
        },
        pctCircle: {
          minWidth: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: '#15803d',
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 6,
        },
        pctTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
        greatDeal: { fontSize: typography.fontSize.sm, fontWeight: '800', color: '#15803d' },
        savingsAmt: { fontSize: typography.fontSize.sm, color: colors.textPrimary, fontWeight: '500' },
        acceptBtn: {
          backgroundColor: colors.primary,
          paddingVertical: spacing.sm + 2,
          paddingHorizontal: spacing.lg,
          borderRadius: 10,
          minWidth: 100,
          alignItems: 'center',
          justifyContent: 'center',
        },
        acceptBtnPressed: { backgroundColor: colors.primaryPressed },
        acceptTxt: { color: colors.onPrimary, fontSize: typography.fontSize.sm, fontWeight: '700' },
      }),
    [colors, isDark],
  );

  const showDeal = quote.isCheaper;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.leftBlock}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt} numberOfLines={1}>
              {initials}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={styles.name} numberOfLines={2}>
              {quote.companyName}
            </Text>
            {relative ? <Text style={styles.time}>{relative}</Text> : null}
          </View>
        </View>
        <View style={styles.priceBlock}>
          <Text style={styles.price}>{priceLabel}</Text>
          <Text style={styles.vatNote}>Inc. VAT</Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        {showDeal ? (
          <View style={[styles.dealPill, styles.dealPillDark]}>
            {quote.savingsPercentage != null ? (
              <View style={styles.pctCircle}>
                <Text style={styles.pctTxt} numberOfLines={1}>
                  {quote.savingsPercentage}%
                </Text>
              </View>
            ) : null}
            <View style={{ flexShrink: 1 }}>
              <Text style={styles.greatDeal}>Great Deal</Text>
              {savingsLabel ? <Text style={styles.savingsAmt}>{savingsLabel}</Text> : null}
            </View>
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <Pressable
          style={({ pressed }) => [styles.acceptBtn, pressed && styles.acceptBtnPressed]}
          onPress={onAccept}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={colors.onPrimary} size="small" />
          ) : (
            <Text style={styles.acceptTxt}>Accept</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
