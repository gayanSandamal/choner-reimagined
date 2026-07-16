import { StyleProp, ViewStyle } from 'react-native';
import { BrandLogo } from './BrandLogo';

// Web fork: lottie-react-native's web renderer needs the optional
// @lottiefiles/dotlottie-react peer, which we don't ship. Web (used only for
// the dev preview) renders the static mark instead; iOS/Android get the
// animated version from AnimatedBrandLogo.tsx.
export function AnimatedBrandLogo({
  size = 160,
  style
}: {
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return <BrandLogo size={size} style={style} />;
}
