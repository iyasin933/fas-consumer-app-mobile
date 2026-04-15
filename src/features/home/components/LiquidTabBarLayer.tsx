import { useEffect, useMemo, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { buildLiquidMaskPath } from '@/features/home/utils/liquidTabMaskPath';
import { useTheme } from '@/hooks/useTheme';
import { lightColors } from '@/shared/theme/colors';

/** Center vertically in the bar so the pill is never clipped at y=0 */
const HOLE_R = 20;
const HOLE_CY = 32;

type Props = {
  width: number;
  height: number;
  /** Spring-animated tab index (0–4). */
  indexAnim: Animated.Value;
  initialTabIndex: number;
};

export function LiquidTabBarLayer({ width, height, indexAnim, initialTabIndex }: Props) {
  const { colors: themeColors, isDark } = useTheme();
  const colors = themeColors ?? lightColors;
  const w = Math.max(1, width);
  const slot = w / 5;
  const cxForIndex = useMemo(
    () => (idx: number) => (idx + 0.5) * slot,
    [slot],
  );

  const [cx, setCx] = useState(() => cxForIndex(initialTabIndex));

  useEffect(() => {
    const id = indexAnim.addListener(({ value }) => {
      setCx(cxForIndex(value));
    });
    return () => {
      indexAnim.removeListener(id);
    };
  }, [indexAnim, cxForIndex]);

  useEffect(() => {
    indexAnim.stopAnimation((v) => setCx(cxForIndex(v)));
  }, [width, indexAnim, cxForIndex]);

  const d = buildLiquidMaskPath(w, height, cx, HOLE_CY, HOLE_R);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg
        width={w}
        height={height}
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}
        pointerEvents="none"
      >
        <Path d={d} fill={colors.surface} fillRule="evenodd" />
      </Svg>
      <View
        pointerEvents="none"
        style={[
          styles.circle,
          isDark && styles.circleDark,
          {
            left: cx - (HOLE_R + 1),
            top: HOLE_CY - (HOLE_R + 1),
            width: (HOLE_R + 1) * 2,
            height: (HOLE_R + 1) * 2,
            borderRadius: HOLE_R + 1,
            backgroundColor: colors.primary,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 5,
    elevation: 6,
  },
  circleDark: {
    shadowOpacity: 0.45,
  },
});
