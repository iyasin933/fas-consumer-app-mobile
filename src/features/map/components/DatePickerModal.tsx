import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useEffect, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMapColors } from '@/features/map/theme/useMapColors';

type Mode = 'date' | 'time';

type Props = {
  visible: boolean;
  mode: Mode;
  value: Date;
  minimumDate?: Date;
  onCancel: () => void;
  onConfirm: (d: Date) => void;
  title?: string;
};

/**
 * Cross-platform date/time picker UI.
 *
 * iOS: Renders as an in-tree full-screen overlay (high z-index), not RN
 * `Modal`, so touches work above @gorhom/bottom-sheet (same issue as
 * PlacesAutocompleteModal).
 *
 * `tempValue` is only synced from `value` when the sheet **opens**; otherwise
 * parent re-renders would reset the spinner while the user is still editing.
 */
export function DatePickerModal({
  visible,
  mode,
  value,
  minimumDate,
  onCancel,
  onConfirm,
  title,
}: Props) {
  const c = useMapColors();
  const [tempValue, setTempValue] = useState<Date>(() => value);
  const wasVisible = useRef(false);

  useEffect(() => {
    const opened = visible && !wasVisible.current;
    wasVisible.current = visible;
    if (opened) {
      setTempValue(new Date(value.getTime()));
    }
  }, [visible, value]);

  const handleDone = () => {
    onConfirm(new Date(tempValue.getTime()));
  };

  if (Platform.OS === 'android') {
    if (!visible) return null;
    return (
      <DateTimePicker
        mode={mode}
        value={value}
        minimumDate={minimumDate}
        is24Hour={mode === 'time'}
        onChange={(e: DateTimePickerEvent, picked?: Date) => {
          if (e.type === 'dismissed' || !picked) {
            onCancel();
            return;
          }
          onConfirm(picked);
        }}
      />
    );
  }

  if (!visible) return null;

  return (
    <View
      style={styles.overlayHost}
      pointerEvents="box-none"
      accessibilityViewIsModal
      collapsable={false}
    >
      <GestureHandlerRootView style={styles.ghRoot}>
        <Pressable
          style={[styles.backdropFill, { backgroundColor: c.surfaceOverlay }]}
          onPress={onCancel}
          accessibilityLabel="Dismiss"
        />
        <View style={styles.sheetWrap} pointerEvents="box-none">
          <Pressable onPress={(e) => e.stopPropagation()} style={styles.sheetInner}>
            <SafeAreaView edges={['bottom']} style={{ backgroundColor: c.surface }}>
              <View style={[styles.sheet, { backgroundColor: c.surface }]}>
                <View style={[styles.header, { borderBottomColor: c.border }]}>
                  <TouchableOpacity
                    hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                    onPress={onCancel}
                    accessibilityRole="button"
                    accessibilityLabel="Cancel"
                  >
                    <Text style={[styles.headerSecondary, { color: c.textSecondary }]}>
                      Cancel
                    </Text>
                  </TouchableOpacity>
                  {!!title && (
                    <Text style={[styles.headerTitle, { color: c.textPrimary }]}>{title}</Text>
                  )}
                  <TouchableOpacity
                    hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                    onPress={handleDone}
                    accessibilityRole="button"
                    accessibilityLabel="Done"
                  >
                    <Text style={[styles.headerDone, { color: c.brandGreen }]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  mode={mode}
                  value={tempValue}
                  minimumDate={mode === 'date' ? minimumDate : undefined}
                  display="spinner"
                  themeVariant={c.isDark ? 'dark' : 'light'}
                  onChange={(_: DateTimePickerEvent, picked?: Date) => {
                    if (picked) setTempValue(new Date(picked.getTime()));
                  }}
                  style={styles.picker}
                />
              </View>
            </SafeAreaView>
          </Pressable>
        </View>
      </GestureHandlerRootView>
    </View>
  );
}

const styles = StyleSheet.create({
  /** Same stacking approach as PlacesAutocompleteModal — above bottom-sheet native layers. */
  overlayHost: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2147483000,
    ...Platform.select({
      android: { elevation: 64 },
      default: {},
    }),
  },
  ghRoot: { flex: 1 },
  backdropFill: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetWrap: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  sheetInner: {
    width: '100%',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 15, fontWeight: '700' },
  headerSecondary: { fontSize: 15 },
  headerDone: { fontSize: 15, fontWeight: '700' },
  picker: { alignSelf: 'stretch' },
});
