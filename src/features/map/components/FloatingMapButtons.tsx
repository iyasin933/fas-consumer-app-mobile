import { Ionicons } from '@expo/vector-icons';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useMapColors } from '@/features/map/theme/useMapColors';

type Props = {
  onBack?: () => void;
  onMenu?: () => void;
};

/**
 * Two floating cards on top of the map: a back arrow (top-left) and a
 * kebab/ellipsis menu (top-right). Safe-area aware so they clear the notch.
 * Background/icon colors adapt to the theme.
 */
export function FloatingMapButtons({ onBack, onMenu }: Props) {
  const c = useMapColors();
  const btnBg = { backgroundColor: c.surface };
  const iconColor = c.textPrimary;
  return (
    <SafeAreaView pointerEvents="box-none" style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.row} pointerEvents="box-none">
        <Pressable
          style={({ pressed }) => [styles.btn, btnBg, pressed && styles.btnPressed]}
          onPress={onBack}
          accessibilityLabel="Back"
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color={iconColor} />
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.btn, btnBg, pressed && styles.btnPressed]}
          onPress={onMenu}
          accessibilityLabel="More options"
          hitSlop={8}
        >
          <Ionicons name="ellipsis-horizontal" size={22} color={iconColor} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.16,
        shadowRadius: 6,
      },
      android: { elevation: 5 },
    }),
  },
  btnPressed: { opacity: 0.7 },
});
