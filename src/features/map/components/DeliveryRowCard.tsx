import { Ionicons } from '@expo/vector-icons';
import { memo, useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { AddressField } from '@/features/map/components/AddressField';
import { ScheduledPills } from '@/features/map/components/ScheduledPills';
import { useDeliveryFormStore } from '@/features/map/store/deliveryFormStore';
import { useMapColors } from '@/features/map/theme/useMapColors';
import { computeMinDropoffAt } from '@/features/map/utils/deliverySchedule';
import type { DeliveryStop, DeliveryTab, TimeWindow } from '@/features/map/types';

type Props = {
  row: DeliveryStop;
  label: string;
  tab: DeliveryTab;
  /** Long-press reorder handle; only shown when this is set (e.g. draggable list). */
  onDragStart?: () => void;
  isActiveDrag?: boolean;

  onOpenPlaces: () => void;
  onOpenExtraDropoffPlaces?: () => void;
  /** Clears the primary address for this row. */
  onClearPlace?: () => void;
  /** Clears the secondary "also a dropoff" address on a stop. */
  onClearExtraDropoff?: () => void;
  onGpsTap?: () => void;
  onRemove?: () => void;
  onToggleDropoff?: () => void;
  onWindowChange: (w: TimeWindow | undefined) => void;
  onDateChange: (iso: string | undefined) => void;
};

/**
 * One card in the list. Every card has the same chrome and differs only by:
 *   - header color & text,
 *   - extra controls (toggle + delete on stops),
 *   - optional scheduled pills.
 *
 * Stop rows can expose a reorder handle when `onDragStart` is provided.
 */
export const DeliveryRowCard = memo(function DeliveryRowCard({
  row,
  label,
  tab,
  onDragStart,
  isActiveDrag,
  onOpenPlaces,
  onOpenExtraDropoffPlaces,
  onClearPlace,
  onClearExtraDropoff,
  onGpsTap,
  onRemove,
  onToggleDropoff,
  onWindowChange,
  onDateChange,
}: Props) {
  const c = useMapColors();
  const rows = useDeliveryFormStore((s) => s.rows);
  const routeDurationSec = useDeliveryFormStore((s) => s.routeDurationSec);
  const minDropoffAt = useMemo(
    () =>
      row.kind === 'dropoff' ? computeMinDropoffAt(rows, routeDurationSec) : undefined,
    [row.kind, rows, routeDurationSec],
  );
  const isStop = row.kind === 'stop';
  const isPickup = row.kind === 'pickup';
  const dropoffScheduleNeedsRoute =
    tab === 'scheduled' && row.kind === 'dropoff' && !minDropoffAt;

  const color = useMemo(() => {
    if (row.kind === 'pickup') return c.brandGreen;
    if (row.kind === 'stop') return c.stopBrown;
    return c.dropoffRed;
  }, [row.kind, c]);

  const elevate = useSharedValue(0);
  useEffect(() => {
    elevate.value = withTiming(isActiveDrag ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.quad),
    });
  }, [elevate, isActiveDrag]);
  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + elevate.value * 0.02 }],
    shadowOpacity: 0.08 + elevate.value * 0.15,
    shadowRadius: 6 + elevate.value * 10,
  }));

  return (
    <Animated.View
      // FadeIn/FadeOut only — slide-in caused a visible layout gap while the
      // list re-measured, so we keep it simple and fast.
      entering={FadeIn.duration(180)}
      exiting={FadeOut.duration(140)}
      style={[
        styles.card,
        { backgroundColor: c.surface, borderColor: c.border },
        dragStyle,
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.headerText, { color }]}>{label}</Text>

        <View style={styles.headerRight}>
          {isStop && (
            <View style={styles.toggleGroup}>
              <Text style={[styles.toggleLabel, { color: c.stopBrown }]}>Dropoff</Text>
              <Switch
                value={!!row.isAlsoDropoff}
                onValueChange={onToggleDropoff}
                trackColor={{ false: c.border, true: '#F59E0B' }}
                thumbColor="#ffffff"
              />
            </View>
          )}
          {isStop && onDragStart && (
            <Pressable
              onLongPress={onDragStart}
              delayLongPress={180}
              hitSlop={6}
              accessibilityLabel={`Reorder ${label}`}
            >
              <Ionicons name="reorder-three" size={22} color={c.textMuted} />
            </Pressable>
          )}
          {isStop && (
            <Pressable
              onPress={onRemove}
              hitSlop={8}
              accessibilityLabel={`Remove ${label}`}
              style={[styles.delBtn, { backgroundColor: c.dropoffRed }]}
            >
              <Ionicons name="close" size={16} color="#ffffff" />
            </Pressable>
          )}
        </View>
      </View>

      <AddressField
        placeholder={
          isPickup
            ? 'Select Pickup Location'
            : row.kind === 'dropoff'
              ? 'Select Dropoff Location'
              : 'Select Stop Location'
        }
        value={row.place}
        onPress={onOpenPlaces}
        onClear={onClearPlace}
        showGps={isPickup}
        onGpsPress={onGpsTap}
      />

      {isStop && row.isAlsoDropoff && (
        <Animated.View entering={FadeIn.duration(180)} style={styles.subField}>
          <Text style={[styles.subLabel, { color: c.textPrimary }]}>
            Dropoff for this stop
          </Text>
          <AddressField
            placeholder="Select Dropoff Location"
            value={row.extraDropoff ?? null}
            onPress={onOpenExtraDropoffPlaces ?? (() => {})}
            onClear={onClearExtraDropoff}
          />
        </Animated.View>
      )}

      {tab === 'scheduled' && (
        <ScheduledPills
          scheduleRole={row.kind}
          window={row.window}
          dateISO={row.dateISO}
          minDropoffAt={minDropoffAt}
          disabled={dropoffScheduleNeedsRoute}
          disabledReason="Select pickup and dropoff first — we calculate dropoff time from route ETA."
          onWindowChange={onWindowChange}
          onDateChange={onDateChange}
        />
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.15,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  toggleLabel: { fontSize: 12, fontWeight: '700' },
  delBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subField: { marginTop: 10, gap: 6 },
  subLabel: { fontSize: 12, fontWeight: '600' },
});
