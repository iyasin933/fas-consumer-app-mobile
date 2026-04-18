import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  FlatList,
  Keyboard,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  type PlaceSuggestion,
  usePlacesAutocomplete,
} from '@/features/map/hooks/usePlacesAutocomplete';
import { useMapColors } from '@/features/map/theme/useMapColors';
import { debugLog } from '@/utils/debugLog';

type Props = {
  visible: boolean;
  title?: string;
  onClose: () => void;
  onPickSuggestion: (suggestion: PlaceSuggestion) => void;
  onPickCurrentLocation: () => void;
  bias?: { lat: number; lng: number };
};

/**
 * Full-screen Places search. **Does not use RN `Modal`.** A `Modal` can sit
 * *below* native layers used by `@gorhom/bottom-sheet`, maps, and
 * `react-native-screens`, so taps never reach JS (no logs, frozen UI). This
 * overlay uses max z-index inside the screen tree so it always wins hit-tests.
 */
export function PlacesAutocompleteModal({
  visible,
  title,
  onClose,
  onPickSuggestion,
  onPickCurrentLocation,
  bias,
}: Props) {
  const c = useMapColors();
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput | null>(null);

  const biasLat = bias?.lat;
  const biasLng = bias?.lng;
  const stableBias = useMemo(
    () =>
      biasLat !== undefined && biasLng !== undefined
        ? { lat: biasLat, lng: biasLng }
        : undefined,
    [biasLat, biasLng],
  );
  const { suggestions, loading } = usePlacesAutocomplete(query, stableBias);

  const pickedRef = useRef(false);

  useEffect(() => {
    if (visible) {
      pickedRef.current = false;
      setQuery('');
      setFocused(false);
      debugLog('PlacesAutocomplete', 'overlay mounted');
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
    pickedRef.current = false;
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      Keyboard.dismiss();
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const handleBackPress = useCallback(() => {
    debugLog('PlacesAutocomplete', 'back pressed');
    Keyboard.dismiss();
    onClose();
  }, [onClose]);

  const handlePickSuggestion = useCallback(
    (s: PlaceSuggestion) => {
      if (pickedRef.current) return;
      pickedRef.current = true;
      debugLog('PlacesAutocomplete', 'suggestion pressed', s.primaryText);
      Keyboard.dismiss();
      onClose();
      onPickSuggestion(s);
    },
    [onClose, onPickSuggestion],
  );

  const handlePickCurrent = useCallback(() => {
    if (pickedRef.current) return;
    pickedRef.current = true;
    debugLog('PlacesAutocomplete', 'use current location');
    Keyboard.dismiss();
    onClose();
    onPickCurrentLocation();
  }, [onClose, onPickCurrentLocation]);

  if (!visible) return null;

  return (
    <View
      style={styles.overlayHost}
      pointerEvents="auto"
      accessibilityViewIsModal
      collapsable={false}
    >
      <SafeAreaView
        style={[styles.safe, { backgroundColor: c.surface }]}
        edges={['top', 'left', 'right']}
      >
        <View style={[styles.headerRow, { borderBottomColor: c.border }]}>
          <TouchableOpacity
            onPress={handleBackPress}
            accessibilityRole="button"
            accessibilityLabel="Back"
            style={styles.backBtn}
            hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          >
            <Ionicons name="arrow-back" size={24} color={c.textPrimary} />
          </TouchableOpacity>
          <View
            style={[
              styles.inputWrap,
              { borderBottomColor: focused ? c.brandGreen : c.border },
            ]}
          >
            <TextInput
              ref={inputRef}
              style={[styles.input, { color: c.textPrimary }]}
              placeholder={title ?? 'Search location'}
              placeholderTextColor={c.textSecondary}
              value={query}
              onChangeText={setQuery}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => setQuery('')}
                accessibilityLabel="Clear search"
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close-circle" size={18} color={c.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <FlatList
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          data={suggestions}
          keyExtractor={(s) => s.placeId}
          ListHeaderComponent={<CurrentLocationRow onPress={handlePickCurrent} colors={c} />}
          ItemSeparatorComponent={() => (
            <View style={[styles.sep, { backgroundColor: c.hairline }]} />
          )}
          ListEmptyComponent={
            loading ? (
              <View style={styles.emptyWrap}>
                <ActivityIndicator color={c.brandGreen} />
              </View>
            ) : query.trim().length >= 2 ? (
              <Text style={[styles.emptyText, { color: c.textSecondary }]}>No results</Text>
            ) : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.65}
              style={[styles.row]}
              onPress={() => handlePickSuggestion(item)}
            >
              <View style={[styles.rowIcon, { backgroundColor: c.surfaceMuted }]}>
                <Ionicons name="location-outline" size={20} color={c.textSecondary} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowPrimary, { color: c.textPrimary }]} numberOfLines={1}>
                  {item.primaryText}
                </Text>
                {!!item.secondaryText && (
                  <Text
                    style={[styles.rowSecondary, { color: c.textSecondary }]}
                    numberOfLines={1}
                  >
                    {item.secondaryText}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      </SafeAreaView>
    </View>
  );
}

function CurrentLocationRow({
  onPress,
  colors: c,
}: {
  onPress: () => void;
  colors: ReturnType<typeof useMapColors>;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.75}
      style={[styles.row, { backgroundColor: c.brandGreenSoft }]}
      onPress={onPress}
      accessibilityLabel="Use current location"
    >
      <View style={[styles.rowIcon, { backgroundColor: c.brandGreen }]}>
        <Ionicons name="locate" size={18} color="#ffffff" />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowPrimary, { color: c.brandGreen }]}>Use current location</Text>
        <Text style={[styles.rowSecondary, { color: c.textSecondary }]}>
          We&apos;ll pin your GPS spot
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  /** Must beat map + @gorhom/bottom-sheet native stacking. */
  overlayHost: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2147483000,
    ...Platform.select({
      android: { elevation: 64 },
      default: {},
    }),
  },
  safe: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: {
    padding: 4,
    marginLeft: -4,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 2,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 60 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 14,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowPrimary: { fontSize: 15, fontWeight: '700' },
  rowSecondary: { fontSize: 13, marginTop: 2 },
  emptyWrap: { paddingVertical: 32, alignItems: 'center' },
  emptyText: { textAlign: 'center', paddingVertical: 24 },
});
