import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

export type PinKind = 'pickup' | 'stop' | 'dropoff';

const COLORS: Record<PinKind, string> = {
  pickup: '#2ECC71',
  stop: '#F59E0B',
  dropoff: '#EF4444',
};

/**
 * Drop-in content for react-native-maps `<Marker>`. Renders a teardrop-ish
 * badge with a centered label (number for stops, icon for endpoints).
 */
export function MapMarkerBadge({ kind, label }: { kind: PinKind; label?: string }) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.pin, { backgroundColor: COLORS[kind] }]}>
        {kind === 'pickup' ? (
          <Ionicons name="arrow-up" size={16} color="#ffffff" />
        ) : kind === 'dropoff' ? (
          <Ionicons name="flag" size={14} color="#ffffff" />
        ) : (
          <Text style={styles.txt}>{label ?? ''}</Text>
        )}
      </View>
      <View style={[styles.stem, { borderTopColor: COLORS[kind] }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  pin: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 4,
  },
  stem: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    marginTop: -2,
  },
  txt: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 12,
  },
});
