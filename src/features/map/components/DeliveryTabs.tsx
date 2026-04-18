import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useMapColors } from '@/features/map/theme/useMapColors';
import type { DeliveryTab } from '@/features/map/types';

type Props = {
  value: DeliveryTab;
  onChange: (t: DeliveryTab) => void;
};

export function DeliveryTabs({ value, onChange }: Props) {
  return (
    <View style={styles.row}>
      <Tab label="Scheduled Delivery" active={value === 'scheduled'} onPress={() => onChange('scheduled')} />
      <Tab label="Same Day Delivery" active={value === 'sameDay'} onPress={() => onChange('sameDay')} />
    </View>
  );
}

function Tab({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const c = useMapColors();
  return (
    <Pressable
      onPress={onPress}
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

const styles = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 4 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  txt: { fontSize: 14 },
  underline: { marginTop: 10, width: '80%', height: 3, borderRadius: 2, backgroundColor: 'transparent' },
});
