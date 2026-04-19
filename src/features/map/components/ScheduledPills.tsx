import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useScheduleDateTimePicker } from '@/features/map/components/ScheduleDateTimePickerProvider';
import { useDeliveryFormStore } from '@/features/map/store/deliveryFormStore';
import { useMapColors } from '@/features/map/theme/useMapColors';
import type { TimeWindow } from '@/features/map/types';
import {
  mergeStopDateTime,
  startOfDay,
} from '@/features/map/utils/deliverySchedule';

type ScheduleRole = 'pickup' | 'stop' | 'dropoff';

type Props = {
  window?: TimeWindow;
  dateISO?: string;
  onWindowChange: (w: TimeWindow | undefined) => void;
  onDateChange: (iso: string | undefined) => void;
  scheduleRole: ScheduleRole;
  /**
   * For dropoff: earliest instant allowed (pickup + route ETA + 1h buffer).
   * Drives date minimum and post-pick validation.
   */
  minDropoffAt?: Date;
};

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
}
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function singleInstantWindow(at: Date): TimeWindow {
  const iso = at.toISOString();
  return { fromISO: iso, toISO: iso };
}

function rangeWindow(from: Date, durationMin: number): TimeWindow {
  return {
    fromISO: from.toISOString(),
    toISO: new Date(from.getTime() + durationMin * 60 * 1000).toISOString(),
  };
}

/**
 * Time + date pills. Pickup uses a single exact time (not a from–to range).
 * Pickup/stop cannot be scheduled in the past; date minimum is today.
 */
export function ScheduledPills({
  window,
  dateISO,
  onWindowChange,
  onDateChange,
  scheduleRole,
  minDropoffAt,
}: Props) {
  const c = useMapColors();
  const setToast = useDeliveryFormStore((s) => s.setToast);
  const { openPicker } = useScheduleDateTimePicker();

  const isPickup = scheduleRole === 'pickup';
  const isStop = scheduleRole === 'stop';
  const isDropoff = scheduleRole === 'dropoff';
  const noPast = isPickup || isStop;

  const datePickerMin = useMemo(() => {
    const today = startOfDay(new Date());
    if (isDropoff && minDropoffAt) {
      const m = startOfDay(minDropoffAt);
      return m.getTime() > today.getTime() ? m : today;
    }
    return today;
  }, [isDropoff, minDropoffAt]);

  const timePickerValue = useMemo(() => {
    if (!window) return new Date();
    const merged = mergeStopDateTime(dateISO, window.fromISO);
    if (isDropoff && minDropoffAt && merged < minDropoffAt) return new Date(minDropoffAt);
    if (noPast && merged < new Date()) return new Date();
    return merged;
  }, [window, dateISO, isDropoff, minDropoffAt, noPast]);

  const timeLabel = useMemo(() => {
    if (!window) return 'Select time';
    if (isPickup) return fmtTime(window.fromISO);
    return `${fmtTime(window.fromISO)} – ${fmtTime(window.toISO)}`;
  }, [window, isPickup]);

  const handleTimeConfirm = useCallback(
    (picked: Date) => {
      // Pickup: single instant, not in the past
      if (isPickup) {
        let merged = mergeStopDateTime(dateISO, picked.toISOString());
        const n = new Date();
        if (merged < n) {
          merged = n;
          setToast('Pickup cannot be in the past — set to the earliest time available now.');
        }
        onWindowChange(singleInstantWindow(merged));
        return;
      }

      // Dropoff: logistics floor + 30‑min window
      if (isDropoff && minDropoffAt) {
        let from = mergeStopDateTime(dateISO, picked.toISOString());
        if (from < minDropoffAt) {
          from = new Date(minDropoffAt);
          setToast('Adjusted to the earliest valid dropoff (after pickup + drive + 1h buffer).');
          onDateChange(
            new Date(from.getFullYear(), from.getMonth(), from.getDate(), 12, 0, 0, 0).toISOString(),
          );
          onWindowChange(rangeWindow(from, 30));
          return;
        }
        onWindowChange(rangeWindow(from, 30));
        return;
      }

      // Stop: 30‑min window, not in the past
      if (isStop) {
        let merged = mergeStopDateTime(dateISO, picked.toISOString());
        const n = new Date();
        if (merged < n) {
          merged = n;
          setToast('Stop time cannot be in the past — set to the earliest time available now.');
        }
        onWindowChange(rangeWindow(merged, 30));
        return;
      }

      // Dropoff without min floor
      const from = mergeStopDateTime(dateISO, picked.toISOString());
      onWindowChange(rangeWindow(from, 30));
    },
    [isPickup, isDropoff, isStop, minDropoffAt, dateISO, onWindowChange, onDateChange, setToast],
  );

  const handleDateConfirm = useCallback(
    (picked: Date) => {
      const iso = picked.toISOString();

      if (isDropoff && minDropoffAt) {
        const merged = mergeStopDateTime(iso, window?.fromISO);
        if (merged < minDropoffAt) {
          const c = new Date(minDropoffAt);
          setToast('Adjusted to the earliest valid dropoff (after pickup + drive + 1h buffer).');
          onDateChange(
            new Date(c.getFullYear(), c.getMonth(), c.getDate(), 12, 0, 0, 0).toISOString(),
          );
          onWindowChange(rangeWindow(c, 30));
          return;
        }
      }

      onDateChange(iso);

      if (!window?.fromISO || !noPast) return;

      const merged = mergeStopDateTime(iso, window.fromISO);
      if (merged >= new Date()) return;

      const n = new Date();
      setToast('Time updated — scheduled time cannot be in the past.');
      if (isPickup) {
        onWindowChange(singleInstantWindow(n));
      } else if (isStop) {
        onWindowChange(rangeWindow(n, 30));
      }
    },
    [isDropoff, isPickup, isStop, minDropoffAt, window?.fromISO, noPast, onDateChange, onWindowChange, setToast],
  );

  const dateLabel = dateISO ? fmtDate(dateISO) : 'Select Date';

  const pillBase = {
    borderColor: c.border,
    backgroundColor: c.surface,
  };
  const pillActive = {
    borderColor: c.brandGreen,
    backgroundColor: c.brandGreenSoft,
  };

  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.pill, window ? pillActive : pillBase]}
        onPress={() =>
          openPicker({
            mode: 'time',
            value: timePickerValue,
            title: 'Pick a time',
            onCancel: () => {},
            onConfirm: handleTimeConfirm,
          })
        }
        accessibilityLabel="Select time"
      >
        <Ionicons
          name="time-outline"
          size={14}
          color={window ? c.brandGreen : c.textSecondary}
        />
        <Text
          style={[
            styles.pillTxt,
            { color: window ? c.brandGreen : c.textSecondary },
          ]}
          numberOfLines={1}
        >
          {timeLabel}
        </Text>
      </Pressable>
      <Pressable
        style={[styles.pill, dateISO ? pillActive : pillBase]}
        onPress={() =>
          openPicker({
            mode: 'date',
            value: dateISO ? new Date(dateISO) : datePickerMin,
            minimumDate: datePickerMin,
            title: 'Pick a date',
            onCancel: () => {},
            onConfirm: handleDateConfirm,
          })
        }
        accessibilityLabel="Select date"
      >
        <Ionicons
          name="calendar-outline"
          size={14}
          color={dateISO ? c.brandGreen : c.textSecondary}
        />
        <Text
          style={[
            styles.pillTxt,
            { color: dateISO ? c.brandGreen : c.textSecondary },
          ]}
          numberOfLines={1}
        >
          {dateLabel}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, marginTop: 12 },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  pillTxt: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
});
