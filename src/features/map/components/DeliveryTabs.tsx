import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useMapColors } from '@/features/map/theme/useMapColors';
import type { DeliveryTab } from '@/features/map/types';

type Props = {
  value: DeliveryTab;
  onChange: (t: DeliveryTab) => void;
};

export function DeliveryTabs({ value, onChange }: Props) {
  const { width } = useWindowDimensions();
  const narrow = width < 380;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: 'row',
          paddingHorizontal: narrow ? 12 : 16,
          marginTop: 4,
        },
        tab: {
          flex: 1,
          minHeight: narrow ? 44 : 48,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: narrow ? 10 : 12,
        },
        txt: { fontSize: narrow ? 13 : 14 },
        underline: {
          marginTop: narrow ? 8 : 10,
          width: '80%',
          height: 3,
          borderRadius: 2,
          backgroundColor: 'transparent',
        },
      }),
    [narrow],
  );

  return (
    <View style={styles.row}>
      <Tab label="Scheduled Delivery" active={value === 'scheduled'} onPress={() => onChange('scheduled')} styles={styles} />
      <Tab label="Same Day Delivery" active={value === 'sameDay'} onPress={() => onChange('sameDay')} styles={styles} />
    </View>
  );
}

function Tab({ label, active, onPress, styles }: { label: string; active: boolean; onPress: () => void; styles: ReturnType<typeof StyleSheet.create<{ row: any; tab: any; txt: any; underline: any }>> }) {
  const c = useMapColors();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
      style={styles.tab}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <Text
        style={[
          styles.txt,
          active
            ? { color: c.textPrimary, fontWeight: '800' }
            : { color: c.textSecondary, fontWeight: '500' },
        ]}
      >
        {label}
      </Text>
      <View
        style={[
          styles.underline,
          active && { backgroundColor: c.brandGreen },
        ]}
      />
    </Pressable>
  );
}
