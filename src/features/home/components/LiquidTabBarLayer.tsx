import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { buildNotchBarPath } from '@/features/home/utils/liquidTabMaskPath';
import { useTheme } from '@/hooks/useTheme';
import { lightColors } from '@/shared/theme/colors';

type Props = {
  width: number;
  height: number;
  cornerRadius: number;
  notchRadius: number;
  notchControlLength: number;
};

/**
 * Renders the white bar background with rounded top corners and a
 * smooth curved notch at the centre for the floating action button.
 */
export function LiquidTabBarLayer({ width, height, cornerRadius, notchRadius, notchControlLength }: Props) {
  const { colors: themeColors } = useTheme();
  const colors = themeColors ?? lightColors;
  const w = Math.max(1, width);
  const d = buildNotchBarPath(w, height, cornerRadius, notchRadius, notchControlLength);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg
        width={w}
        height={height}
        style={styles.svg}
        pointerEvents="none"
      >
        <Path d={d} fill={colors.surface} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  svg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});
