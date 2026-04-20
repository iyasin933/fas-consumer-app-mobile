import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DialCodePickerModal } from '@/features/delivery/components/DialCodePickerModal';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useDeliveryOrderDraftStore } from '@/features/delivery/store/deliveryOrderDraftStore';
import { useTheme } from '@/hooks/useTheme';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import type { AppStackParamList } from '@/types/navigation.types';

const DISCLAIMER_STORAGE_KEY = 'dropyou_prohibited_items_disclaimer_dismissed_v1';

const PROHIBITED_DISCLAIMER_BODY =
  'For safety and legal reasons, certain items cannot be transported, including: substances under the UK Misuse of Drugs Act; live animals (mammals, reptiles, fish, insects); pressurised containers (e.g. fire extinguishers, aerosols); and sharp instruments (e.g. scissors, knives, garden tools). By continuing you confirm your shipment does not contain prohibited goods.';

const SUGGESTED_NOTES = [
  'No Call Please',
  'Leave at the front door',
  'Call upon arrival',
  'Fragile - handle with care',
  'Deliver to reception',
  'Keep upright',
  'Do not bend',
  'Goods must be secure',
  'Straps required',
  'Handballing required',
] as const;

export function RecipientDetailsScreen() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();

  const recipientName = useDeliveryOrderDraftStore((s) => s.recipientName);
  const recipientCompany = useDeliveryOrderDraftStore((s) => s.recipientCompany);
  const recipientDialCode = useDeliveryOrderDraftStore((s) => s.recipientDialCode);
  const recipientPhoneLocal = useDeliveryOrderDraftStore((s) => s.recipientPhoneLocal);
  const recipientNotes = useDeliveryOrderDraftStore((s) => s.recipientNotes);
  const setRecipient = useDeliveryOrderDraftStore((s) => s.setRecipient);

  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [disclaimerVisible, setDisclaimerVisible] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const v = await AsyncStorage.getItem(DISCLAIMER_STORAGE_KEY);
        if (!cancelled && v !== '1') {
          setDisclaimerVisible(true);
        }
      } catch {
        if (!cancelled) setDisclaimerVisible(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dismissDisclaimer = useCallback(() => {
    Keyboard.dismiss();
    setDisclaimerVisible(false);
    void AsyncStorage.setItem(DISCLAIMER_STORAGE_KEY, '1').catch(() => {});
  }, []);

  const appendSuggestedNote = useCallback(
    (note: string) => {
      const cur = recipientNotes.trim();
      const next = cur ? `${cur}, ${note}` : note;
      setRecipient({ recipientNotes: next });
    },
    [recipientNotes, setRecipient],
  );

  const onConfirm = useCallback(() => {
    const name = recipientName.trim();
    const local = recipientPhoneLocal.replace(/\s/g, '');
    if (!name) {
      Alert.alert('Name required', 'Please enter the recipient name.');
      return;
    }
    if (!local || local.length < 6) {
      Alert.alert('Phone required', 'Enter a valid phone number (including area code after the country).');
      return;
    }
    navigation.navigate('ChooseVehicle');
  }, [navigation, recipientName, recipientPhoneLocal]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        safe: { flex: 1, backgroundColor: colors.background },
        scroll: { flex: 1 },
        content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xl },
        title: {
          fontSize: typography.fontSize.lg,
          fontWeight: typography.fontWeight.bold,
          color: colors.textPrimary,
        },
        label: { fontSize: typography.fontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 },
        input: {
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          paddingHorizontal: spacing.md,
          paddingVertical: Platform.OS === 'ios' ? 12 : 8,
          fontSize: typography.fontSize.md,
          color: colors.textPrimary,
          backgroundColor: colors.surface,
        },
        multiline: { minHeight: 100, textAlignVertical: 'top' },
        dashed: { borderStyle: 'dashed', borderWidth: 1, borderColor: colors.primary },
        phoneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
        dialBtn: {
          flexDirection: 'row',
          alignItems: 'center',
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 10,
          paddingHorizontal: spacing.md,
          paddingVertical: 12,
          backgroundColor: colors.surface,
          gap: spacing.xs,
        },
        dialTxt: { fontSize: typography.fontSize.md, fontWeight: '700', color: colors.textPrimary },
        phoneInput: { flex: 1 },
        chipsTitle: { fontSize: typography.fontSize.sm, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.sm },
        chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.xs },
        chip: {
          paddingVertical: 6,
          paddingHorizontal: 10,
          borderRadius: 20,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        },
        chipTxt: { fontSize: typography.fontSize.sm, color: colors.textPrimary },
        ctaWrap: {
          padding: spacing.lg,
          paddingBottom: spacing.md,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
        },
        cta: {
          backgroundColor: colors.primary,
          paddingVertical: spacing.md,
          borderRadius: 12,
          alignItems: 'center',
        },
        ctaTxt: {
          color: colors.onPrimary,
          fontSize: typography.fontSize.md,
          fontWeight: typography.fontWeight.bold,
        },
        /**
         * In-tree overlay (not RN `Modal`) — same stacking approach as `DatePickerModal` so
         * touches work above native layers (e.g. map bottom sheet / stack compositing).
         */
        overlayHost: {
          ...StyleSheet.absoluteFillObject,
          zIndex: 2_147_483_000,
          ...Platform.select({
            android: { elevation: 64 },
            default: {},
          }),
        },
        ghRoot: { flex: 1 },
        overlayDim: {
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.45)',
          justifyContent: 'center',
          padding: spacing.lg,
        },
        overlayCardWrap: {
          width: '100%',
          maxWidth: 520,
          alignSelf: 'center',
        },
        modalCard: {
          maxHeight: '88%',
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: spacing.lg,
          elevation: 16,
        },
        modalTitle: { fontSize: typography.fontSize.lg, fontWeight: '800', color: colors.textPrimary },
        modalBody: {
          fontSize: typography.fontSize.md,
          color: colors.textSecondary,
          lineHeight: 22,
          marginTop: spacing.sm,
        },
        modalClose: {
          marginTop: spacing.lg,
          backgroundColor: colors.primary,
          minHeight: 48,
          paddingVertical: spacing.md,
          borderRadius: 12,
          alignItems: 'center',
          justifyContent: 'center',
        },
        modalCloseTxt: { color: colors.onPrimary, fontWeight: '700', fontSize: typography.fontSize.md },
      }),
    [colors],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Recipient details</Text>

          <View>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor={colors.muted}
              value={recipientName}
              onChangeText={(t) => setRecipient({ recipientName: t })}
              autoCapitalize="words"
            />
          </View>

          <View>
            <Text style={styles.label}>Company (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Company (optional)"
              placeholderTextColor={colors.muted}
              value={recipientCompany}
              onChangeText={(t) => setRecipient({ recipientCompany: t })}
            />
          </View>

          <View>
            <Text style={styles.label}>Phone number</Text>
            <View style={styles.phoneRow}>
              <Pressable style={styles.dialBtn} onPress={() => setShowCountryPicker(true)}>
                <Text style={styles.dialTxt}>{recipientDialCode}</Text>
                <Text style={{ color: colors.muted }}>▾</Text>
              </Pressable>
              <TextInput
                style={[styles.input, styles.phoneInput]}
                placeholder="Phone number"
                placeholderTextColor={colors.muted}
                value={recipientPhoneLocal}
                onChangeText={(t) => setRecipient({ recipientPhoneLocal: t })}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.multiline, styles.dashed]}
              placeholder="Type to add notes"
              placeholderTextColor={colors.muted}
              value={recipientNotes}
              onChangeText={(t) => setRecipient({ recipientNotes: t })}
              multiline
            />
            <Text style={styles.chipsTitle}>Suggested notes</Text>
            <View style={styles.chipsRow}>
              {SUGGESTED_NOTES.map((n) => (
                <Pressable key={n} style={styles.chip} onPress={() => appendSuggestedNote(n)}>
                  <Text style={styles.chipTxt}>{n}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>

        <View style={[styles.ctaWrap, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <Pressable style={styles.cta} onPress={onConfirm}>
            <Text style={styles.ctaTxt}>Confirm</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {showCountryPicker ? (
        <DialCodePickerModal
          visible
          onClose={() => setShowCountryPicker(false)}
          onPickDial={(dial) => setRecipient({ recipientDialCode: dial })}
        />
      ) : null}

      {disclaimerVisible ? (
        <View
          style={styles.overlayHost}
          pointerEvents="auto"
          collapsable={false}
          accessibilityViewIsModal
        >
          <GestureHandlerRootView style={styles.ghRoot}>
            <Pressable style={styles.overlayDim} onPress={dismissDisclaimer} accessibilityLabel="Dismiss disclaimer">
              <View style={styles.overlayCardWrap} pointerEvents="box-none">
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                  }}
                  style={styles.modalCard}
                >
                  <Text style={styles.modalTitle}>Prohibited items disclaimer</Text>
                  <Text style={styles.modalBody}>{PROHIBITED_DISCLAIMER_BODY}</Text>
                  <Pressable
                    style={styles.modalClose}
                    onPress={dismissDisclaimer}
                    accessibilityRole="button"
                    accessibilityLabel="Close disclaimer"
                    hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                  >
                    <Text style={styles.modalCloseTxt}>Close</Text>
                  </Pressable>
                </Pressable>
              </View>
            </Pressable>
          </GestureHandlerRootView>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
