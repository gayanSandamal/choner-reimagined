import { useCallback, useEffect, useRef } from 'react';
import { View } from 'react-native';
import LottieView from 'lottie-react-native';
import { useReduceMotion } from '@/lib/motion';
import { BrandLogo } from './BrandLogo';
import { CHONER_MARK_ASPECT } from './chonerMarkXml';
import { AnimatedBrandLogoProps } from './AnimatedBrandLogo.types';

// The animated brand mark: jumps straight into the subtle loop segment
// (heartbeat + orbiting dot) so the *only* entrance motion is the existing
// Reanimated FadeInDown the caller already wraps this in — avoids stacking
// two independent, uncoordinated entrance animations. Falls back to the
// static BrandLogo when the OS requests reduced motion.
//
// Sized off the static mark's own aspect ratio (not the Lottie comp's, which
// carries extra padding) so swapping between animated and fallback states
// never resizes the box; `resizeMode="contain"` letterboxes the difference.
const chonerLogoSource = require('../../assets/lottie/choner-logo.json');
const LOOP_START = 18;
const LOOP_END: number = chonerLogoSource.op;

export function AnimatedBrandLogo({ size = 160, style }: AnimatedBrandLogoProps) {
  const reduceMotion = useReduceMotion();
  const ref = useRef<LottieView>(null);

  const onAnimationFinish = useCallback(() => {
    ref.current?.play(LOOP_START, LOOP_END);
  }, []);

  useEffect(() => {
    if (!reduceMotion) {
      ref.current?.play(LOOP_START, LOOP_END);
    }
  }, [reduceMotion]);

  if (reduceMotion) {
    return <BrandLogo size={size} style={style} />;
  }

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Choner logo"
      style={[{ width: size, height: size / CHONER_MARK_ASPECT }, style]}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ width: '100%', height: '100%' }}
      >
        <LottieView
          ref={ref}
          source={chonerLogoSource}
          loop={false}
          onAnimationFinish={onAnimationFinish}
          resizeMode="contain"
          style={{ width: '100%', height: '100%' }}
        />
      </View>
    </View>
  );
}
