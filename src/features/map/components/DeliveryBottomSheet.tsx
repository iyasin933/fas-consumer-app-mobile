import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import DraggableFlatList, {
  type DragEndParams,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';

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
  /** Called when the user edits dropoff time/date so ETA can avoid overwriting. */
  onDropoffScheduleEdited?: () => void;
  /** Fires once when the sheet's snap index settles (used to sync map insets). */
  onChange?: (index: number) => void;
  initialSnapIndex?: 0 | 1 | 2;
  /** Extra bottom padding so content clears the floating tab bar. */
  bottomInset?: number;
};

/**
 * Bottom sheet hosting the delivery form. Three snap points:
 * 35 % (tabs only) → 65 % (default) → 95 % (expanded).
 *
 * The list inside is a `DraggableFlatList` (react-native-draggable-flatlist).
 * We disable the sheet's own content-panning gesture so vertical pans go to
 * the list — the sheet still responds to drags on its handle.
 *
 * Ordering rule (enforced on drag end): `[pickup, ...stops, dropoff]`. Only
 * stop cards expose a drag handle, but we still sanitize on drop in case the
 * list reorders the endpoints.
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
    const reorder = useDeliveryFormStore((s) => s.reorder);
    const toggleStopIsAlsoDropoff = useDeliveryFormStore((s) => s.toggleStopIsAlsoDropoff);
    const setWindow = useDeliveryFormStore((s) => s.setWindow);
    const setDateISO = useDeliveryFormStore((s) => s.setDateISO);

    const snapPoints = useMemo(() => ['35%', '65%', '95%'], []);
    const proceedEnabled = canProceed(rows);
    const stopCount = rows.filter((r) => r.kind === 'stop').length;

    const handleDragEnd = useCallback(
      ({ data }: DragEndParams<DeliveryStop>) => {
        // The store's `reorder` also enforces order, but we normalize here
        // too so the DraggableFlatList receives a clean list immediately
        // instead of flashing a momentarily-wrong order.
        const pickup = data.find((r) => r.kind === 'pickup');
        const dropoff = data.find((r) => r.kind === 'dropoff');
        const stops = data.filter((r) => r.kind === 'stop');
        if (!pickup || !dropoff) {
          reorder(data);
          return;
        }
        reorder([pickup, ...stops, dropoff]);
      },
      [reorder],
    );

    const renderItem = useCallback(
      ({ item, drag, isActive }: RenderItemParams<DeliveryStop>) => {
        const label = getStopLabel(rows, item);
        const isStop = item.kind === 'stop';
        return (
          <View style={styles.cardWrap}>
            <DeliveryRowCard
              row={item}
              label={label}
              tab={tab}
              // Only stops can be dragged — pickup & dropoff are locked.
              onDragStart={isStop ? drag : undefined}
              isActiveDrag={isActive}
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
                if (item.kind === 'dropoff') onDropoffScheduleEdited?.();
                setWindow(item.id, w);
              }}
              onDateChange={(iso) => {
                if (item.kind === 'dropoff') onDropoffScheduleEdited?.();
                setDateISO(item.id, iso);
              }}
            />
          </View>
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
        <BottomSheetView style={styles.content}>
          <DeliveryTabs value={tab} onChange={setTab} />
          <View style={[styles.divider, { backgroundColor: c.hairline }]} />
          <DraggableFlatList
            data={rows}
            onDragEnd={handleDragEnd}
            keyExtractor={(r) => r.id}
            renderItem={renderItem}
            containerStyle={styles.listContainer}
            // Add extra bottom padding equal to the floating tab-bar height
            // so the AddStop / Proceed buttons are never hidden behind it.
            contentContainerStyle={[
              styles.listContent,
              { paddingBottom: 24 + bottomInset },
            ]}
            activationDistance={12}
            ItemSeparatorComponent={() => <View style={styles.rowGap} />}
            ListFooterComponent={
              <View style={styles.footer}>
                <View style={styles.rowGap} />
                <AddStopButton onPress={() => addStop()} disabled={stopCount >= MAX_STOPS} />
                <View style={styles.proceedGap} />
                <ProceedButton enabled={proceedEnabled} onPress={onProceed} />
              </View>
            }
            keyboardShouldPersistTaps="handled"
          />
        </BottomSheetView>
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
  content: { flex: 1, paddingTop: 4 },
  divider: { height: 1 },
  listContainer: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingTop: 12 },
  cardWrap: {},
  rowGap: { height: 12 },
  footer: { marginTop: 4 },
  proceedGap: { height: 16 },
});
