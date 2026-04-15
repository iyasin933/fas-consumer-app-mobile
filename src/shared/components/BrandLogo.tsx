import {
  Image,
  ImageSourcePropType,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

type BrandLogoProps = {
  /** Larger splash / auth hero vs compact header */
  variant?: 'hero' | 'header';
  /** Fixed square size (px). Prefer on splash so the frame matches the animated wrapper. */
  size?: number;
};

/**
 * DropYou mark — square `icon.png` inside a square frame. Uses numeric dimensions (not
 * percentage width/height) so React Native never non-uniformly stretches the bitmap when
 * the parent is transformed (e.g. splash scale animation).
 */
export function BrandLogo({ variant = 'hero', size: sizeOverride }: BrandLogoProps) {
  const { width: screenW } = useWindowDimensions();

  const side =
    sizeOverride ??
    (variant === 'hero'
      ? Math.min(280, Math.max(160, screenW * 0.5))
      : Math.min(120, Math.max(88, screenW * 0.28)));

  return (
    <View style={[styles.frame, { width: side, height: side }]}>
      <Image
        source={ICON}
        style={{ width: side, height: side, aspectRatio: 1 }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const ICON: ImageSourcePropType = require('../../../assets/generated/icon.png');

const styles = StyleSheet.create({
  frame: {
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
});
