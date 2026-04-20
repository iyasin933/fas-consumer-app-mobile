import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';

type DialRow = { code: string; name: string; dial: string };

/** Curated list (dial codes) — extend as needed for your markets. */
const DIAL_ROWS: DialRow[] = [
  { code: 'GB', name: 'United Kingdom', dial: '+44' },
  { code: 'IE', name: 'Ireland', dial: '+353' },
  { code: 'US', name: 'United States', dial: '+1' },
  { code: 'CA', name: 'Canada', dial: '+1' },
  { code: 'AU', name: 'Australia', dial: '+61' },
  { code: 'NZ', name: 'New Zealand', dial: '+64' },
  { code: 'FR', name: 'France', dial: '+33' },
  { code: 'DE', name: 'Germany', dial: '+49' },
  { code: 'ES', name: 'Spain', dial: '+34' },
  { code: 'IT', name: 'Italy', dial: '+39' },
  { code: 'NL', name: 'Netherlands', dial: '+31' },
  { code: 'BE', name: 'Belgium', dial: '+32' },
  { code: 'PT', name: 'Portugal', dial: '+351' },
  { code: 'PL', name: 'Poland', dial: '+48' },
  { code: 'RO', name: 'Romania', dial: '+40' },
  { code: 'IN', name: 'India', dial: '+91' },
  { code: 'PK', name: 'Pakistan', dial: '+92' },
  { code: 'BD', name: 'Bangladesh', dial: '+880' },
  { code: 'AE', name: 'United Arab Emirates', dial: '+971' },
  { code: 'SA', name: 'Saudi Arabia', dial: '+966' },
  { code: 'ZA', name: 'South Africa', dial: '+27' },
  { code: 'NG', name: 'Nigeria', dial: '+234' },
  { code: 'KE', name: 'Kenya', dial: '+254' },
  { code: 'BR', name: 'Brazil', dial: '+55' },
  { code: 'MX', name: 'Mexico', dial: '+52' },
  { code: 'TR', name: 'Turkey', dial: '+90' },
  { code: 'GR', name: 'Greece', dial: '+30' },
  { code: 'SE', name: 'Sweden', dial: '+46' },
  { code: 'NO', name: 'Norway', dial: '+47' },
  { code: 'DK', name: 'Denmark', dial: '+45' },
  { code: 'FI', name: 'Finland', dial: '+358' },
  { code: 'CH', name: 'Switzerland', dial: '+41' },
  { code: 'AT', name: 'Austria', dial: '+43' },
  { code: 'CZ', name: 'Czechia', dial: '+420' },
  { code: 'HU', name: 'Hungary', dial: '+36' },
  { code: 'SK', name: 'Slovakia', dial: '+421' },
  { code: 'LT', name: 'Lithuania', dial: '+370' },
  { code: 'LV', name: 'Latvia', dial: '+371' },
  { code: 'EE', name: 'Estonia', dial: '+372' },
  { code: 'CN', name: 'China', dial: '+86' },
  { code: 'JP', name: 'Japan', dial: '+81' },
  { code: 'KR', name: 'South Korea', dial: '+82' },
  { code: 'SG', name: 'Singapore', dial: '+65' },
  { code: 'MY', name: 'Malaysia', dial: '+60' },
  { code: 'PH', name: 'Philippines', dial: '+63' },
  { code: 'ID', name: 'Indonesia', dial: '+62' },
  { code: 'TH', name: 'Thailand', dial: '+66' },
  { code: 'VN', name: 'Vietnam', dial: '+84' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Called with E.164-style dial prefix including `+`. */
  onPickDial: (dialCode: string) => void;
};

export function DialCodePickerModal({ visible, onClose, onPickDial }: Props) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return DIAL_ROWS;
    return DIAL_ROWS.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        r.code.toLowerCase().includes(s) ||
        r.dial.replace('+', '').includes(s.replace(/^\+/, '')),
    );
  }, [q]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          justifyContent: 'flex-end',
        },
        sheet: {
          maxHeight: '88%',
          backgroundColor: colors.surface,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          paddingBottom: Math.max(insets.bottom, spacing.md),
        },
        head: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        headTitle: { fontSize: typography.fontSize.lg, fontWeight: '700', color: colors.textPrimary },
        close: { fontSize: typography.fontSize.md, fontWeight: '600', color: colors.primary },
        search: {
          marginHorizontal: spacing.lg,
          marginTop: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          paddingHorizontal: spacing.md,
          paddingVertical: 10,
          fontSize: typography.fontSize.md,
          color: colors.textPrimary,
        },
        row: {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: spacing.lg,
          paddingVertical: 14,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
        },
        rowLeft: { flex: 1, paddingRight: spacing.md },
        rowName: { fontSize: typography.fontSize.md, color: colors.textPrimary, fontWeight: '600' },
        rowMeta: { fontSize: typography.fontSize.sm, color: colors.textSecondary, marginTop: 2 },
        dial: { fontSize: typography.fontSize.md, fontWeight: '800', color: colors.primary },
      }),
    [colors, insets.bottom],
  );

  const onSelect = useCallback(
    (dial: string) => {
      onPickDial(dial);
      setQ('');
      onClose();
    },
    [onClose, onPickDial],
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.head}>
            <Text style={styles.headTitle}>Country code</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Text style={styles.close}>Done</Text>
            </Pressable>
          </View>
          <TextInput
            style={styles.search}
            placeholder="Search country or code"
            placeholderTextColor={colors.muted}
            value={q}
            onChangeText={setQ}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.code}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable style={styles.row} onPress={() => onSelect(item.dial)}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowName}>{item.name}</Text>
                  <Text style={styles.rowMeta}>{item.code}</Text>
                </View>
                <Text style={styles.dial}>{item.dial}</Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={{ padding: spacing.lg }}>
                <Text style={{ color: colors.textSecondary }}>No matches.</Text>
              </View>
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}
