import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, ClipPath, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { theme } from '@/constants/theme';

// The brand logo: an orange heart circled by a tilted orbit ring with a
// small satellite dot, recreated as vector paths from the brand artwork.
const VIEWBOX = 200;

const HEART_PATH =
  'M100 170C62 138 26 112 26 72C26 44 47 26 71 26C84 26 95 33 100 44C105 33 116 26 129 26C153 26 174 44 174 72C174 112 138 138 100 170Z';

// One orbit ellipse (rx 96, ry 24, tilted -15deg about 100,102), split at its
// major-axis tips so the ring passes behind the heart across the top and in
// front of it across the bottom.
const ORBIT_BACK = 'M7.3 126.8A96 24 -15 0 1 192.7 77.2';
const ORBIT_FRONT = 'M7.3 126.8A96 24 -15 0 0 192.7 77.2';

export function BrandLogo({
  size = 160,
  style
}: {
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
      fill="none"
      accessibilityRole="image"
      accessibilityLabel="Choner logo"
      style={style}
    >
      <Defs>
        <LinearGradient id="brandHeart" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={theme.colors.secondary} />
          <Stop offset="1" stopColor={theme.colors.primary} />
        </LinearGradient>
        <ClipPath id="brandHeartClip">
          <Path d={HEART_PATH} />
        </ClipPath>
      </Defs>
      <Path d={ORBIT_BACK} stroke={theme.colors.primary} strokeWidth={10} />
      <Path d={HEART_PATH} fill="url(#brandHeart)" />
      {/* Background-coloured casing, clipped to the heart, separates the ring
          from the heart without erasing the ring elsewhere. */}
      <Path
        d={ORBIT_FRONT}
        stroke={theme.colors.bg}
        strokeWidth={16}
        clipPath="url(#brandHeartClip)"
      />
      <Path d={ORBIT_FRONT} stroke={theme.colors.primary} strokeWidth={10} />
      <Circle cx={172} cy={28} r={7} fill={theme.colors.primary} />
    </Svg>
  );
}
