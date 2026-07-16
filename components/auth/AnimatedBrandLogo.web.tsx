import { BrandLogo } from './BrandLogo';
import { AnimatedBrandLogoProps } from './AnimatedBrandLogo.types';

// Web fork: lottie-react-native's web renderer needs the optional
// @lottiefiles/dotlottie-react peer, which we don't ship. Web (used only for
// the dev preview) renders the static mark instead; iOS/Android get the
// animated version from AnimatedBrandLogo.tsx. Pre-authorized by the spec's
// I/O Matrix ("Web (dev preview)" scenario: static fallback is acceptable).
export function AnimatedBrandLogo({ size = 160, style }: AnimatedBrandLogoProps) {
  return <BrandLogo size={size} style={style} />;
}
