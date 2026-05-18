import { useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

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
  const relative = useMemo(
    () => formatQuoteRelativeTime(quote.createdOn),
    [quote.createdOn],
  );
  const priceLabel = useMemo(
    () => formatMajorCurrency(quote.price, quote.currency),
    [quote.price, quote.currency],
  );
  const dealDeltaLabel = useMemo(
    () =>
      quote.dealDeltaAmountMajor != null && quote.dealDeltaDirection
        ? `${formatMajorCurrency(quote.dealDeltaAmountMajor, quote.currency)} ${
            quote.dealDeltaDirection === 'more' ? 'More' : 'cheaper'
          }`
        : null,
    [quote.currency, quote.dealDeltaAmountMajor, quote.dealDeltaDirection],
  );
  const showDeal = quote.showDeal && quote.dealScore != null && quote.dealLabel != null;
  const dealColor = quote.dealColor ?? (quote.isExpensive ? '#EC3B35' : '#2ECC71');
  const isWarningDeal = quote.isExpensive || dealColor === '#EC3B35';
  const dealIcon = quote.isExpensive
    ? 'trending-up'
    : quote.dealColor === '#F1C40F'
      ? 'remove'
      : 'trending-down';
  const dealBg = quote.isExpensive
    ? isDark
      ? 'rgba(236, 59, 53, 0.18)'
      : '#FFF1F1'
    : dealColor === '#F1C40F'
      ? isDark
        ? 'rgba(241, 196, 15, 0.18)'
        : '#FFF9E6'
      : isDark
        ? 'rgba(46, 204, 113, 0.18)'
        : '#ECFDF3';

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surface,
          borderRadius: 18,
          padding: spacing.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          gap: spacing.md,
          overflow: 'hidden',
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.1,
              shadowRadius: 18,
            },
            android: { elevation: 4 },
            default: {},
          }),
        },
        cornerGraphic: {
          position: 'absolute',
          right: -30,
          bottom: -44,
          width: 150,
          height: 150,
          borderRadius: 75,
          backgroundColor: dealColor + '10',
          pointerEvents: 'none',
        },
        cornerLine: {
          position: 'absolute',
          left: 16,
          right: -10,
          top: 54,
          height: 4,
          borderRadius: 99,
          backgroundColor: dealColor + '22',
          transform: [{ rotate: '-18deg' }],
        },
        cornerPin: {
          position: 'absolute',
          right: 46,
          bottom: 56,
          width: 34,
          height: 34,
          borderRadius: 17,
          backgroundColor: dealColor,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 3,
          borderColor: colors.surface,
        },
        headerRow: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          zIndex: 1,
        },
        leftBlock: {
          flexDirection: 'row',
          flex: 1,
          gap: spacing.sm,
          minWidth: 0,
          paddingRight: spacing.sm,
        },
        avatar: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: colors.primary + '20',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.primary + '55',
        },
        avatarTxt: {
          fontSize: typography.fontSize.sm,
          fontWeight: '700',
          color: colors.primary,
        },
        name: {
          fontSize: typography.fontSize.md,
          lineHeight: 20,
          fontWeight: '700',
          color: colors.textPrimary,
        },
        time: {
          fontSize: typography.fontSize.sm,
          color: colors.textSecondary,
          marginTop: 2,
        },
        priceBlock: { alignItems: 'flex-end', flexShrink: 0, minWidth: 92 },
        price: {
          fontSize: 24,
          lineHeight: 29,
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
          gap: spacing.sm,
          zIndex: 1,
        },
        dealPill: {
          flexDirection: 'row',
          alignItems: 'center',
          flex: 1,
          minWidth: 0,
          maxWidth: '62%',
          borderRadius: 14,
          paddingVertical: 7,
          paddingHorizontal: 8,
          gap: 6,
          borderWidth: StyleSheet.hairlineWidth,
        },
        dealIconWrap: {
          width: 26,
          height: 26,
          borderRadius: 13,
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        },
        dealMetaRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 4,
          minWidth: 0,
        },
        pctTxt: { fontSize: 12, fontWeight: '700' },
        dealText: { flexShrink: 1, minWidth: 0, fontSize: 13, fontWeight: '700' },
        savingsAmt: {
          fontSize: 12,
          color: colors.textSecondary,
          fontWeight: '600',
          marginTop: 1,
        },
        acceptBtn: {
          backgroundColor: colors.primary,
          minHeight: 44,
          paddingHorizontal: spacing.sm + 2,
          borderRadius: 14,
          minWidth: 104,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 7,
          shadowColor: colors.primary,
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.22,
          shadowRadius: 9,
          elevation: 3,
        },
        acceptBtnPressed: {
          backgroundColor: colors.primaryPressed,
          transform: [{ scale: 0.98 }],
        },
        disabledBtn: { backgroundColor: '#FECACA' },
        disabledTxt: { color: '#DC2626' },
        acceptTxt: {
          color: colors.onPrimary,
          fontSize: typography.fontSize.sm,
          fontWeight: '700',
        },
        dealTextBlock: { flex: 1, minWidth: 0 },
      }),
    [colors, dealColor],
  );
  const isCancelled = quote.status.toUpperCase() === 'CANCELLED';

  return (
    <View style={styles.card}>
      <View style={styles.cornerGraphic}>
        <View style={styles.cornerLine} />
        <View style={styles.cornerPin}>
          <Ionicons name="navigate" size={16} color="#ffffff" />
        </View>
      </View>

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
          <Text style={styles.price} numberOfLines={1}>
            {priceLabel}
          </Text>
          <Text style={styles.vatNote}>Inc. VAT</Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        {showDeal ? (
          <View
            style={[
              styles.dealPill,
              { backgroundColor: dealBg, borderColor: dealColor + '33' },
            ]}
          >
            <View style={[styles.dealIconWrap, { backgroundColor: dealColor }]}>
              <Ionicons name={dealIcon} size={14} color="#ffffff" />
            </View>
            {quote.dealScore != null ? (
              <View style={styles.dealTextBlock}>
                <View style={styles.dealMetaRow}>
                  <Text
                    style={[styles.dealText, { color: dealColor }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {quote.dealLabel}
                  </Text>
                  <Text
                    style={[
                      styles.pctTxt,
                      { color: isWarningDeal ? dealColor : colors.primary },
                    ]}
                    numberOfLines={1}
                  >
                    {quote.dealScore}%
                  </Text>
                </View>
                {dealDeltaLabel ? (
                  <Text style={styles.savingsAmt}>{dealDeltaLabel}</Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.dealTextBlock}>
                <Text
                  style={[styles.dealText, { color: dealColor }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {quote.dealLabel}
                </Text>
                {dealDeltaLabel ? (
                  <Text style={styles.savingsAmt} numberOfLines={1}>
                    {dealDeltaLabel}
                  </Text>
                ) : null}
              </View>
            )}
          </View>
        ) : (
          <View style={{ flex: 1 }} />
        )}
        <Pressable
          style={({ pressed }) => [
            styles.acceptBtn,
            isCancelled && styles.disabledBtn,
            pressed && !isCancelled && styles.acceptBtnPressed,
          ]}
          onPress={onAccept}
          disabled={busy || isCancelled}
        >
          {busy ? (
            <Text style={styles.acceptTxt}>Accepting</Text>
          ) : (
            <>
              {!isCancelled ? (
                <Ionicons name="checkmark" size={17} color={colors.onPrimary} />
              ) : null}
              <Text style={[styles.acceptTxt, isCancelled && styles.disabledTxt]}>
                {isCancelled ? 'Cancelled' : 'Accept'}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}
