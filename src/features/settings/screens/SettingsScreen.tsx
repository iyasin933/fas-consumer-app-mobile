import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useMutation } from '@tanstack/react-query';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  fetchPlaceDetails,
  PlacesDetailsError,
  type PlaceSuggestion,
  usePlacesAutocomplete,
} from '@/features/map/hooks/usePlacesAutocomplete';
import { Button } from '@/shared/components/Button';
import { TextField } from '@/shared/components/TextField';
import { useAuth } from '@/hooks/useAuth';
import { useTheme, type AppearancePreference } from '@/hooks/useTheme';
import * as authSession from '@/services/authSession.service';
import type { ThemeColors } from '@/shared/theme/colors';
import { spacing } from '@/shared/theme/spacing';
import { typography } from '@/shared/theme/typography';
import { pickUserIdFromProfile } from '@/utils/authIdentity';

const APPEARANCE_OPTIONS: { value: AppearancePreference; label: string; hint: string }[] = [
  { value: 'system', label: 'System', hint: 'Match device light or dark mode' },
  { value: 'light', label: 'Light', hint: 'Always use light appearance' },
  { value: 'dark', label: 'Dark', hint: 'Always use dark appearance' },
];

type ProfileForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  streetAddress: string;
  city: string;
  postalCode: string;
  avatar: string;
};

type ProfileMode = 'account' | 'preferences';
type SelectedProfileImage = {
  uri: string;
  contentType: string;
  fileSize?: number | null;
};

type ImagePickerModule = typeof import('expo-image-picker');

function getImagePicker(): ImagePickerModule | null {
  const nativeImagePicker = requireOptionalNativeModule('ExponentImagePicker');
  if (!nativeImagePicker) return null;

  try {
    // Native module is only available after rebuilding the Expo dev client.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-image-picker') as ImagePickerModule;
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function readProfileField(user: unknown, key: string): string {
  const direct = asRecord(user);
  const result = asRecord(direct?.result);
  const nestedUser = asRecord(result?.user);
  return asString(direct?.[key] ?? nestedUser?.[key] ?? result?.[key]);
}

function parseStoredAddress(address: string, postalCode: string): Pick<ProfileForm, 'streetAddress' | 'city' | 'postalCode'> {
  const pieces = address
    .split(',')
    .map((piece) => piece.trim())
    .filter(Boolean);
  const cleanedPieces = postalCode
    ? pieces.filter((piece) => piece.toLowerCase() !== postalCode.toLowerCase())
    : pieces;

  return {
    streetAddress: cleanedPieces[0] ?? address,
    city: cleanedPieces.length > 1 ? cleanedPieces[cleanedPieces.length - 1] : '',
    postalCode,
  };
}

function profileFormFromUser(user: unknown): ProfileForm {
  const address = readProfileField(user, 'address');
  const postalCode = readProfileField(user, 'postalCode') || readProfileField(user, 'zipCode');
  const parsedAddress = parseStoredAddress(address, postalCode);

  return {
    firstName: readProfileField(user, 'firstName'),
    lastName: readProfileField(user, 'lastName'),
    email: readProfileField(user, 'email'),
    phone: readProfileField(user, 'phone'),
    address,
    ...parsedAddress,
    avatar: readProfileField(user, 'avatar'),
  };
}

function buildProfileAddress(form: ProfileForm): string {
  return [form.streetAddress, form.city, form.postalCode]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ');
}

function initials(firstName: string, lastName: string, email: string): string {
  const joined = `${firstName.trim().charAt(0)}${lastName.trim().charAt(0)}`.trim();
  if (joined) return joined.toUpperCase();
  return email.trim().slice(0, 2).toUpperCase() || 'DU';
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      gap: spacing.lg,
      alignItems: 'center',
    },
    screenItem: {
      width: '100%',
      maxWidth: 680,
    },
    hero: {
      borderRadius: 22,
      overflow: 'hidden',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    heroBand: {
      height: 88,
      backgroundColor: colors.primary,
    },
    heroAccent: {
      position: 'absolute',
      right: -44,
      top: -34,
      width: 150,
      height: 150,
      borderRadius: 75,
      backgroundColor: colors.onPrimary + '22',
    },
    heroLine: {
      position: 'absolute',
      left: -16,
      right: -16,
      top: 64,
      height: 5,
      borderRadius: 99,
      backgroundColor: colors.onPrimary + '30',
      transform: [{ rotate: '-8deg' }],
    },
    heroBody: {
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.md,
      marginTop: -42,
      alignItems: 'center',
      gap: spacing.md,
    },
    avatarWrap: {
      alignSelf: 'center',
      width: 92,
      height: 92,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatar: {
      width: 82,
      height: 82,
      borderRadius: 41,
      backgroundColor: colors.background,
      borderWidth: 4,
      borderColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    avatarPressed: {
      opacity: 0.9,
      transform: [{ scale: 0.98 }],
    },
    avatarImage: {
      width: '100%',
      height: '100%',
    },
    avatarText: {
      color: colors.primary,
      fontSize: typography.fontSize.lg,
      fontWeight: '800',
    },
    cameraBadge: {
      position: 'absolute',
      right: 4,
      bottom: 4,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.primary,
      borderWidth: 3,
      borderColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroTextBlock: {
      alignSelf: 'stretch',
      alignItems: 'center',
      minWidth: 0,
      gap: 4,
    },
    profileName: {
      color: colors.textPrimary,
      fontSize: typography.fontSize.lg,
      fontWeight: typography.fontWeight.bold,
      textAlign: 'center',
    },
    profileEmail: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.sm,
      textAlign: 'center',
    },
    heroStatusRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: spacing.sm,
    },
    heroPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: spacing.sm,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: colors.primary + '12',
      borderWidth: 1,
      borderColor: colors.primary + '24',
    },
    heroPillText: {
      color: colors.textPrimary,
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.bold,
    },
    modeTabs: {
      flexDirection: 'row',
      padding: 4,
      borderRadius: 16,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 4,
    },
    modeTab: {
      flex: 1,
      minHeight: 44,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
    },
    modeTabActive: {
      backgroundColor: colors.primary,
    },
    modeTabText: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.bold,
    },
    modeTabTextActive: {
      color: colors.onPrimary,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: spacing.md,
      gap: spacing.md,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.06,
      shadowRadius: 24,
      elevation: 2,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing.sm,
      justifyContent: 'space-between',
    },
    sectionHeaderCopy: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      flex: 1,
      minWidth: 0,
    },
    sectionIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.primary + '14',
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionTitle: {
      color: colors.textPrimary,
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.bold,
    },
    sectionBody: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.sm,
      marginTop: 2,
    },
    successBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      borderRadius: 12,
      backgroundColor: colors.primary + '14',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
    },
    successText: {
      color: colors.primary,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.bold,
      flex: 1,
    },
    errorBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      borderRadius: 12,
      backgroundColor: colors.danger + '12',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.sm,
    },
    errorText: {
      color: colors.danger,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.medium,
      flex: 1,
    },
    formGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
    },
    formCell: {
      minWidth: 0,
    },
    formCellFull: {
      width: '100%',
    },
    addressCell: {
      zIndex: 4,
    },
    lockedInput: {
      backgroundColor: colors.background,
      color: colors.textSecondary,
    },
    suggestionPanel: {
      marginTop: -4,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    suggestionRow: {
      minHeight: 54,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    suggestionRowLast: {
      borderBottomWidth: 0,
    },
    suggestionIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary + '14',
    },
    suggestionCopy: {
      flex: 1,
      minWidth: 0,
    },
    suggestionTitle: {
      color: colors.textPrimary,
      fontSize: typography.fontSize.sm,
      fontWeight: typography.fontWeight.bold,
    },
    suggestionBody: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.xs,
      marginTop: 2,
    },
    addressLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.xs,
      paddingHorizontal: spacing.md,
      paddingBottom: spacing.xs,
    },
    addressLoadingText: {
      color: colors.textSecondary,
      fontSize: typography.fontSize.xs,
      fontWeight: typography.fontWeight.medium,
    },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    saveRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    saveButton: {
      flex: 1,
      minWidth: 180,
    },
    resetButton: {
      width: 106,
      minWidth: 106,
    },
    optionSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '0A',
    },
    optionTexts: { flex: 1, marginRight: spacing.md },
    optionLabel: {
      fontSize: typography.fontSize.md,
      fontWeight: typography.fontWeight.bold,
      color: colors.textPrimary,
    },
    optionHint: {
      fontSize: typography.fontSize.sm,
      color: colors.textSecondary,
      marginTop: 4,
      lineHeight: 18,
    },
    radio: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioInner: {
      width: 12,
      height: 12,
      borderRadius: 6,
      backgroundColor: colors.primary,
    },
    out: {
      minHeight: 52,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
      backgroundColor: colors.surface,
    },
    outPressed: {
      opacity: 0.86,
    },
    outTxt: { color: colors.danger, fontWeight: typography.fontWeight.bold, fontSize: typography.fontSize.md },
  });
}

export function SettingsScreen() {
  const { signOut, user } = useAuth();
  const { colors, appearancePreference, setAppearancePreference } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const tabBarHeight = useBottomTabBarHeight();
  const [form, setForm] = useState<ProfileForm>(() => profileFormFromUser(user));
  const [selectedImage, setSelectedImage] = useState<SelectedProfileImage | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [addressSearchActive, setAddressSearchActive] = useState(false);
  const [addressResolving, setAddressResolving] = useState(false);
  const [mode, setMode] = useState<ProfileMode>('account');
  const originalForm = useMemo(() => profileFormFromUser(user), [user]);
  const isDirty = JSON.stringify(form) !== JSON.stringify(originalForm);
  const hasValidRequiredNames = Boolean(form.firstName.trim() && form.lastName.trim());
  const showNameErrors = submitAttempted || isDirty;
  const firstNameError = showNameErrors && !form.firstName.trim() ? 'First name is required.' : undefined;
  const lastNameError = showNameErrors && !form.lastName.trim() ? 'Last name is required.' : undefined;
  const addressQuery = addressSearchActive ? form.streetAddress : '';
  const { suggestions: addressSuggestions, loading: addressSuggestionsLoading } =
    usePlacesAutocomplete(addressQuery);
  const visibleAddressSuggestions = addressSearchActive
    ? addressSuggestions.slice(0, 4)
    : [];
  const avatarUrl = form.avatar;
  const isVerified = readProfileField(user, 'isVerified') === 'true' || asRecord(user)?.isVerified === true;

  useEffect(() => {
    setForm(profileFormFromUser(user));
  }, [user]);

  useEffect(() => {
    if (!successMessage) return;
    const timeout = setTimeout(() => setSuccessMessage(''), 2600);
    return () => clearTimeout(timeout);
  }, [successMessage]);

  const profileMutation = useMutation({
    mutationFn: async (nextForm: ProfileForm) => {
      const userId = pickUserIdFromProfile(user);
      if (userId == null) {
        throw new Error('We could not find your user id. Please sign in again.');
      }
      const email = nextForm.email.trim();
      const avatar = selectedImage
        ? await authSession.uploadProfileImage(selectedImage)
        : nextForm.avatar || null;

      await authSession.updateProfile({
        userId,
        profile: {
          firstName: nextForm.firstName.trim(),
          lastName: nextForm.lastName.trim(),
          ...(email ? { email } : {}),
          phone: nextForm.phone.trim(),
          address: buildProfileAddress(nextForm) || null,
          postalCode: nextForm.postalCode.trim() || null,
          zipCode: nextForm.postalCode.trim() || null,
          avatar,
          language: readProfileField(user, 'language') || 'en',
        },
      });
    },
    onSuccess: () => {
      setSelectedImage(null);
      setSubmitAttempted(false);
      setSuccessMessage('Profile updated successfully');
    },
    onError: (error) => {
      Alert.alert('Profile', error instanceof Error ? error.message : 'Could not update profile.');
    },
  });

  const appearanceMutation = useMutation({
    mutationFn: async (preference: AppearancePreference) => {
      const userId = pickUserIdFromProfile(user);
      if (userId == null) {
        throw new Error('We could not find your user id. Please sign in again.');
      }
      await authSession.updateProfile({
        userId,
        profile: {
          isDarkModeOn: preference === 'dark',
        },
      });
    },
    onError: (error) => {
      Alert.alert('Appearance', error instanceof Error ? error.message : 'Could not update appearance.');
    },
  });

  const submitProfile = () => {
    setSubmitAttempted(true);
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const email = form.email.trim();

    if (!firstName || !lastName) {
      Alert.alert('Profile', 'Please enter your first and last name.');
      return;
    }
    if (!form.phone.trim()) {
      Alert.alert('Profile', 'Please enter your phone number.');
      return;
    }
    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      Alert.alert('Profile', 'Please enter a valid email address.');
      return;
    }

    profileMutation.mutate(form);
  };

  const updateField = (field: keyof ProfileForm) => (value: string) => {
    setSuccessMessage('');
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateStreetAddress = (value: string) => {
    setAddressSearchActive(true);
    setSuccessMessage('');
    setForm((current) => ({
      ...current,
      streetAddress: value,
      address: buildProfileAddress({ ...current, streetAddress: value }),
    }));
  };

  const updateAppearance = (preference: AppearancePreference) => {
    setAppearancePreference(preference);
    if (preference === 'system') return;
    appearanceMutation.mutate(preference);
  };

  const pickAddressSuggestion = async (suggestion: PlaceSuggestion) => {
    setAddressResolving(true);
    try {
      const details = await fetchPlaceDetails(suggestion.placeId);
      setForm((current) => {
        const next = {
          ...current,
          streetAddress: details.streetAddress || details.address || suggestion.fullText,
          city: details.city || current.city,
          postalCode: details.postalCode || current.postalCode,
        };
        return {
          ...next,
          address: buildProfileAddress(next) || details.address || suggestion.fullText,
        };
      });
      setSuccessMessage('');
      setAddressSearchActive(false);
      Keyboard.dismiss();
    } catch (error) {
      const message =
        error instanceof PlacesDetailsError
          ? error.message
          : 'Could not resolve that address. Please try another address.';
      Alert.alert('Address', message);
    } finally {
      setAddressResolving(false);
    }
  };

  const changeProfileImage = async () => {
    const imagePicker = getImagePicker();
    if (!imagePicker) {
      Alert.alert(
        'Profile photo',
        'Photo upload needs the updated development build. Please rebuild and run the app, then try again.',
      );
      return;
    }

    const permission = await imagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Profile photo', 'Please allow photo library access to change your profile image.');
      return;
    }

    const result = await imagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.82,
    });

    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const contentType = asset.mimeType ?? 'image/jpeg';
    if (asset.fileSize && asset.fileSize > 10 * 1024 * 1024) {
      Alert.alert('Profile photo', 'Please choose an image under 10 MB.');
      return;
    }

    setSelectedImage({
      uri: asset.uri,
      contentType,
      fileSize: asset.fileSize,
    });
    setForm((current) => ({ ...current, avatar: asset.uri }));
    setSuccessMessage('');
  };

  const resetProfile = () => {
    setForm(originalForm);
    setSelectedImage(null);
    setSubmitAttempted(false);
    setAddressSearchActive(false);
    setSuccessMessage('');
  };

  const displayName = `${form.firstName.trim()} ${form.lastName.trim()}`.trim() || 'DropYou';
  const displayEmail = form.email.trim() || form.phone.trim() || 'Profile';
  const horizontalPadding = width < 380 ? spacing.md : spacing.lg;
  const availableFormWidth = Math.min(
    680,
    Math.max(0, width - horizontalPadding * 2),
  ) - spacing.md * 2;
  const twoColumnCellWidth = Math.floor((availableFormWidth - spacing.md) / 2);
  const useFormGrid = twoColumnCellWidth >= 132;
  const nameCellStyle = useFormGrid
    ? [styles.formCell, { width: twoColumnCellWidth }]
    : styles.formCellFull;
  const halfCellStyle = nameCellStyle;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: tabBarHeight + spacing.lg,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, styles.screenItem]}>
          <View style={styles.heroBand} />
          <View style={styles.heroAccent} />
          <View style={styles.heroLine} />
          <View style={styles.heroBody}>
            <View style={styles.avatarWrap}>
              <Pressable
                style={({ pressed }) => [styles.avatar, pressed && styles.avatarPressed]}
                onPress={() => void changeProfileImage()}
                accessibilityRole="button"
                accessibilityLabel="Change profile photo"
              >
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
                ) : (
                  <Text style={styles.avatarText}>{initials(form.firstName, form.lastName, form.email)}</Text>
                )}
              </Pressable>
              <View pointerEvents="none" style={styles.cameraBadge}>
                <Ionicons name="camera" size={14} color={colors.onPrimary} />
              </View>
            </View>
            <View style={styles.heroTextBlock}>
              <Text style={styles.profileName} numberOfLines={1}>{displayName}</Text>
              <Text style={styles.profileEmail} numberOfLines={1}>{displayEmail}</Text>
            </View>
            <View style={styles.heroStatusRow}>
              <View style={styles.heroPill}>
                <Ionicons
                  name={isVerified ? 'shield-checkmark' : 'shield-outline'}
                  size={14}
                  color={colors.primary}
                />
                <Text style={styles.heroPillText}>{isVerified ? 'Verified' : 'Verification pending'}</Text>
              </View>
              <View style={styles.heroPill}>
                <Ionicons name="briefcase-outline" size={14} color={colors.primary} />
                <Text style={styles.heroPillText}>Consumer account</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.modeTabs, styles.screenItem]}>
          {[
            { value: 'account' as const, label: 'Account', icon: 'person-outline' as const },
            { value: 'preferences' as const, label: 'Preferences', icon: 'options-outline' as const },
          ].map((item) => {
            const selected = mode === item.value;
            return (
              <Pressable
                key={item.value}
                style={[styles.modeTab, selected && styles.modeTabActive]}
                onPress={() => setMode(item.value)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
              >
                <Ionicons
                  name={item.icon}
                  size={16}
                  color={selected ? colors.onPrimary : colors.textSecondary}
                />
                <Text style={[styles.modeTabText, selected && styles.modeTabTextActive]}>
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {mode === 'account' ? (
          <View style={[styles.card, styles.screenItem]}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionHeaderCopy}>
                <View style={styles.sectionIcon}>
                  <Ionicons name="person-outline" size={19} color={colors.primary} />
                </View>
                <View>
                  <Text style={styles.sectionTitle}>Profile</Text>
                  <Text style={styles.sectionBody}>Keep your booking account current.</Text>
                </View>
              </View>
            </View>

            {successMessage ? (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle" size={17} color={colors.primary} />
                <Text style={styles.successText}>{successMessage}</Text>
              </View>
            ) : null}

            {profileMutation.isError ? (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={17} color={colors.danger} />
                <Text style={styles.errorText}>
                  {profileMutation.error instanceof Error
                    ? profileMutation.error.message
                    : 'Could not update profile.'}
                </Text>
              </View>
            ) : null}

            <View style={styles.formGrid}>
              <View style={nameCellStyle}>
                <TextField
                  label="First name"
                  value={form.firstName}
                  onChangeText={updateField('firstName')}
                  autoCapitalize="words"
                  editable={!profileMutation.isPending}
                  error={firstNameError}
                />
              </View>
              <View style={nameCellStyle}>
                <TextField
                  label="Last name"
                  value={form.lastName}
                  onChangeText={updateField('lastName')}
                  autoCapitalize="words"
                  editable={!profileMutation.isPending}
                  error={lastNameError}
                />
              </View>
              <View style={styles.formCellFull}>
                <TextField
                  label="Email"
                  value={form.email}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={false}
                  style={styles.lockedInput}
                />
              </View>
              <View style={styles.formCellFull}>
                <TextField
                  label="Phone"
                  value={form.phone}
                  keyboardType="phone-pad"
                  editable={false}
                  style={styles.lockedInput}
                />
              </View>
              <View style={[styles.formCellFull, styles.addressCell]}>
                <TextField
                  label="Street address"
                  value={form.streetAddress}
                  onChangeText={updateStreetAddress}
                  onFocus={() => setAddressSearchActive(Boolean(form.streetAddress.trim()))}
                  autoCapitalize="words"
                  editable={!profileMutation.isPending && !addressResolving}
                  placeholder="Start typing an address"
                />
                {addressSuggestionsLoading && form.streetAddress.trim().length >= 2 ? (
                  <View style={styles.addressLoading}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.addressLoadingText}>Finding addresses</Text>
                  </View>
                ) : null}
                {visibleAddressSuggestions.length > 0 ? (
                  <View style={styles.suggestionPanel}>
                    {visibleAddressSuggestions.map((suggestion, index) => (
                      <Pressable
                        key={suggestion.placeId}
                        accessibilityRole="button"
                        accessibilityLabel={`Use ${suggestion.fullText}`}
                        disabled={addressResolving}
                        onPress={() => void pickAddressSuggestion(suggestion)}
                        style={({ pressed }) => [
                          styles.suggestionRow,
                          index === visibleAddressSuggestions.length - 1 && styles.suggestionRowLast,
                          pressed && { opacity: 0.74 },
                        ]}
                      >
                        <View style={styles.suggestionIcon}>
                          <Ionicons name="location" size={16} color={colors.primary} />
                        </View>
                        <View style={styles.suggestionCopy}>
                          <Text style={styles.suggestionTitle} numberOfLines={1}>
                            {suggestion.primaryText}
                          </Text>
                          {suggestion.secondaryText ? (
                            <Text style={styles.suggestionBody} numberOfLines={1}>
                              {suggestion.secondaryText}
                            </Text>
                          ) : null}
                        </View>
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
              <View style={halfCellStyle}>
                <TextField
                  label="City"
                  value={form.city}
                  onChangeText={updateField('city')}
                  autoCapitalize="words"
                  editable={!profileMutation.isPending}
                  placeholder="Town or city"
                />
              </View>
              <View style={halfCellStyle}>
                <TextField
                  label="Postcode"
                  value={form.postalCode}
                  onChangeText={updateField('postalCode')}
                  autoCapitalize="characters"
                  editable={!profileMutation.isPending}
                  placeholder="UK postcode"
                />
              </View>
            </View>

            <View style={styles.saveRow}>
              <Button
                title="Discard"
                variant="outline"
                onPress={resetProfile}
                disabled={!isDirty || profileMutation.isPending}
                style={styles.resetButton}
              />
              <Button
                title="Save Changes"
                onPress={submitProfile}
                disabled={!isDirty || !hasValidRequiredNames}
                loading={profileMutation.isPending}
                style={styles.saveButton}
                leftAccessory={
                  profileMutation.isPending ? (
                    <ActivityIndicator color={colors.onPrimary} size="small" />
                  ) : undefined
                }
              />
            </View>
          </View>
        ) : null}

        {mode === 'preferences' ? (
          <View style={[styles.card, styles.screenItem]}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderCopy}>
              <View style={styles.sectionIcon}>
                <Ionicons name="contrast-outline" size={19} color={colors.primary} />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Appearance</Text>
                <Text style={styles.sectionBody}>Choose how the app should look.</Text>
              </View>
            </View>
          </View>

          {APPEARANCE_OPTIONS.map(({ value, label, hint }) => {
            const selected = appearancePreference === value;
            return (
              <Pressable
                key={value}
                style={[styles.option, selected && styles.optionSelected]}
                onPress={() => updateAppearance(value)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <View style={styles.optionTexts}>
                  <Text style={styles.optionLabel}>{label}</Text>
                  <Text style={styles.optionHint}>{hint}</Text>
                </View>
                <View style={styles.radio}>
                  {selected ? <View style={styles.radioInner} /> : null}
                </View>
              </Pressable>
            );
          })}
          </View>
        ) : null}

        <Pressable
          style={({ pressed }) => [styles.out, styles.screenItem, pressed && styles.outPressed]}
          onPress={() => void signOut()}
          accessibilityRole="button"
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.outTxt}>Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
