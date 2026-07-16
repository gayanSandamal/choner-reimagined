import { useCallback, useRef } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import LottieView from 'lottie-react-native';
import { useReduceMotion } from '@/lib/motion';
import { BrandLogo } from './BrandLogo';

// The animated brand mark: plays the authored Lottie entrance once, then
// chains the subtle loop segment (heartbeat + orbiting dot) indefinitely.
// Falls back to the static BrandLogo when the OS requests reduced motion.
const ASPECT = 660 / 480;
const LOOP_START = 18;
const LOOP_END = 138;

export function AnimatedBrandLogo({
  size = 160,
  style
}: {
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduceMotion = useReduceMotion();
  const ref = useRef<LottieView>(null);

  const onAnimationFinish = useCallback((isCancelled: boolean) => {
    if (!isCancelled) {
      ref.current?.play(LOOP_START, LOOP_END);
    }
  }, []);

  if (reduceMotion) {
    return <BrandLogo size={size} style={style} />;
  }

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel="Choner logo"
      style={[{ width: size, height: size / ASPECT }, style]}
    >
      <LottieView
        ref={ref}
        source={require('../../assets/lottie/choner-logo.json')}
        autoPlay
        loop={false}
        onAnimationFinish={onAnimationFinish}
        resizeMode="contain"
        style={{ width: '100%', height: '100%' }}
      />
    </View>
  );
}
