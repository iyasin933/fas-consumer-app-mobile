import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { AddStopButton } from '@/features/map/components/AddStopButton';
import { DeliveryRowCard } from '@/features/map/components/DeliveryRowCard';
import { DeliveryTabs } from '@/features/map/components/DeliveryTabs';
import { ProceedButton } from '@/features/map/components/ProceedButton';
import { canProceed, getStopLabel, useDeliveryFormStore } from '@/features/map/store/deliveryFormStore';
import { useMapColors } from '@/features/map/theme/useMapColors';
import type { DeliveryStop, PlacesTarget } from '@/features/map/types';
import { MAX_STOPS } from '@/features/map/types';

type BottomSheetInstance = React.ElementRef<typeof BottomSheet>;

export type DeliveryBottomSheetHandle = {
  snapToIndex: (index: number) => void;
  expand: () => void;
  collapse: () => void;
};

type Props = {
  onOpenPlaces: (target: PlacesTarget) => void;
  onClearPlace: (target: PlacesTarget) => void;
  onPickupGps: () => void;
  onProceed: () => void;
  /** Fires once when the sheet's snap index settles (used to sync map insets). */
  onChange?: (index: number) => void;
  initialSnapIndex?: 0 | 1 | 2;
  /** Extra bottom padding so content clears the floating tab bar. */
  bottomInset?: number;
  /** Called when the user edits dropoff date/time so ETA does not overwrite their choice. */
  onDropoffScheduleEdited?: () => void;
};

/**
 * Bottom sheet hosting the delivery form. Three snap points:
 * 35 % (tabs only) → 65 % (default) → 95 % (expanded).
 *
 * Tabs + delivery-type toggles and the Add Stop / Proceed row stay fixed; only
 * the pickup / stop / dropoff cards sit in `BottomSheetScrollView`.
 * `enableContentPanningGesture={false}` keeps vertical pans on that area from
 * moving the sheet — use the handle (or empty map) to change snap.
 *
 * Stops stay in insert order (pickup → …stops… → dropoff).
 */
export const DeliveryBottomSheet = forwardRef<DeliveryBottomSheetHandle, Props>(
  function DeliveryBottomSheet(
    {
      onOpenPlaces,
      onClearPlace,
      onPickupGps,
      onProceed,
      onDropoffScheduleEdited,
      onChange,
      initialSnapIndex = 1,
      bottomInset = 0,
    },
    ref,
  ) {
    const sheetRef = useRef<BottomSheetInstance | null>(null);
    const c = useMapColors();

    useImperativeHandle(
      ref,
      () => ({
        snapToIndex: (i: number) => sheetRef.current?.snapToIndex(i),
        expand: () => sheetRef.current?.expand(),
        collapse: () => sheetRef.current?.collapse(),
      }),
      [],
    );

    const tab = useDeliveryFormStore((s) => s.tab);
    const rows = useDeliveryFormStore((s) => s.rows);
    const setTab = useDeliveryFormStore((s) => s.setTab);
    const addStop = useDeliveryFormStore((s) => s.addStop);
    const removeStop = useDeliveryFormStore((s) => s.removeStop);
    const toggleStopIsAlsoDropoff = useDeliveryFormStore((s) => s.toggleStopIsAlsoDropoff);
    const setWindow = useDeliveryFormStore((s) => s.setWindow);
    const setDateISO = useDeliveryFormStore((s) => s.setDateISO);

    const snapPoints = useMemo(() => ['35%', '65%', '95%'], []);
    const proceedEnabled = canProceed(rows);
    const stopCount = rows.filter((r) => r.kind === 'stop').length;

    const renderRow = useCallback(
      (item: DeliveryStop) => {
        const label = getStopLabel(rows, item);
        const isStop = item.kind === 'stop';
        const isDropoff = item.kind === 'dropoff';
        return (
          <DeliveryRowCard
            row={item}
            label={label}
            tab={tab}
            onDragStart={undefined}
            isActiveDrag={false}
            onOpenPlaces={() =>
              onOpenPlaces(
                item.kind === 'pickup'
                  ? { kind: 'pickup' }
                  : item.kind === 'dropoff'
                    ? { kind: 'dropoff' }
                    : { kind: 'stop', stopId: item.id },
              )
            }
            onOpenExtraDropoffPlaces={() =>
              onOpenPlaces({ kind: 'stopExtraDropoff', stopId: item.id })
            }
            onClearPlace={() =>
              onClearPlace(
                item.kind === 'pickup'
                  ? { kind: 'pickup' }
                  : item.kind === 'dropoff'
                    ? { kind: 'dropoff' }
                    : { kind: 'stop', stopId: item.id },
              )
            }
            onClearExtraDropoff={
              isStop
                ? () => onClearPlace({ kind: 'stopExtraDropoff', stopId: item.id })
                : undefined
            }
            onGpsTap={item.kind === 'pickup' ? onPickupGps : undefined}
            onRemove={isStop ? () => removeStop(item.id) : undefined}
            onToggleDropoff={isStop ? () => toggleStopIsAlsoDropoff(item.id) : undefined}
            onWindowChange={(w) => {
              if (isDropoff) onDropoffScheduleEdited?.();
              setWindow(item.id, w);
            }}
            onDateChange={(iso) => {
              if (isDropoff) onDropoffScheduleEdited?.();
              setDateISO(item.id, iso);
            }}
          />
        );
      },
      [
        rows,
        tab,
        onOpenPlaces,
        onClearPlace,
        onPickupGps,
        onDropoffScheduleEdited,
        removeStop,
        toggleStopIsAlsoDropoff,
        setWindow,
        setDateISO,
      ],
    );

    return (
      <BottomSheet
        ref={(r) => {
          sheetRef.current = r;
        }}
        index={initialSnapIndex}
        snapPoints={snapPoints}
        animationConfigs={undefined}
        animateOnMount={false}
        enableDynamicSizing={false}
        enablePanDownToClose={false}
        enableContentPanningGesture={false}
        onChange={onChange}
        handleIndicatorStyle={[styles.handle, { backgroundColor: c.handle }]}
        backgroundStyle={[
          styles.bg,
          { backgroundColor: c.surface },
        ]}
      >
        <View style={[styles.sheetBody, { backgroundColor: c.surface }]}>
          <View style={styles.stickyHeader}>
            <DeliveryTabs value={tab} onChange={setTab} />
            <View style={[styles.divider, { backgroundColor: c.hairline }]} />
          </View>

          <BottomSheetScrollView
            style={styles.cardScroll}
            contentContainerStyle={styles.cardScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            <View style={styles.cardsColumn}>
              {rows.map((item) => (
                <View key={item.id} style={styles.cardWrap}>
                  {renderRow(item)}
                </View>
              ))}
            </View>
          </BottomSheetScrollView>

          <View
            style={[
              styles.stickyFooter,
              {
                borderTopColor: c.hairline,
                backgroundColor: c.surface,
                paddingBottom: 12 + bottomInset,
              },
            ]}
          >
            <View style={styles.footerActionsRow}>
              <View style={styles.footerActionCellAdd}>
                <AddStopButton
                  onPress={() => addStop()}
                  disabled={stopCount >= MAX_STOPS}
                  style={styles.footerActionFill}
                />
              </View>
              <View style={styles.footerActionCellProceed}>
                <ProceedButton
                  enabled={proceedEnabled}
                  onPress={onProceed}
                  style={styles.footerActionFill}
                />
              </View>
            </View>
          </View>
        </View>
      </BottomSheet>
    );
  },
);

const styles = StyleSheet.create({
  bg: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handle: {
    width: 44,
    height: 5,
    borderRadius: 3,
  },
  sheetBody: {
    flex: 1,
  },
  stickyHeader: {
    flexShrink: 0,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginTop: 0,
  },
  /** `minHeight: 0` lets the scroll region shrink inside the flex sheet body. */
  cardScroll: {
    flex: 1,
    minHeight: 0,
  },
  cardScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  cardsColumn: {
    gap: 12,
  },
  cardWrap: {},
  stickyFooter: {
    flexShrink: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerActionsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 10,
  },
  /** ~30% / ~70% of the row (after gap), excluding the fixed 10px gutter. */
  footerActionCellAdd: {
    flex: 4,
    minWidth: 0,
  },
  footerActionCellProceed: {
    flex: 7,
    minWidth: 0,
  },
  footerActionFill: {
    alignSelf: 'stretch',
    width: '100%',
  },
});
