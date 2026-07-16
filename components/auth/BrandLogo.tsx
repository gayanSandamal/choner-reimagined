import { StyleProp, ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { CHONER_MARK_ASPECT, chonerMarkXml } from './chonerMarkXml';

// The brand mark: the heart-orbit logo rendered from the exact traced artwork
// in CHONER_LOGO_NEW.svg, with the dark background and wordmark removed so it
// sits transparently on whatever screen shows it. `size` drives the width;
// height is derived from the artwork's aspect ratio.
export function BrandLogo({
  size = 160,
  style
}: {
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <SvgXml
      xml={chonerMarkXml}
      width={size}
      height={size / CHONER_MARK_ASPECT}
      accessibilityRole="image"
      accessibilityLabel="Choner logo"
      style={style}
    />
  );
}
