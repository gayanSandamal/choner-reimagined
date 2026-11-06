import { forwardRef } from 'react';
import { Pressable, PressableProps } from 'react-native';
import type { PressableInstance } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { theme } from '@/constants/theme';
import { haptics } from '@/lib/haptics';
import { useReduceMotion } from '@/lib/motion';

type HapticIntensity = 'none' | 'light' | 'medium' | 'heavy' | 'selection';
type ScaleIntensity = 'subtle' | 'base' | 'bold';

interface Props extends PressableProps {
  scaleTo?: ScaleIntensity;
  haptic?: HapticIntensity;
  // Disable scale animation entirely (useful when wrapping non-rectangular content).
  noScale?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function fireHaptic(intensity: HapticIntensity) {
  switch (intensity) {
    case 'none':
      return;
    case 'light':
      return haptics.tap();
    case 'medium':
      return haptics.press();
    case 'heavy':
      return haptics.bold();
    case 'selection':
      return haptics.selection();
  }
}

// PressableScale: drop-in replacement for <Pressable> that scales down on
// press-in with a spring and fires a haptic. Honors the "Reduce Motion"
// system setting by falling back to a quick opacity tween.
export const PressableScale = forwardRef<PressableInstance, Props>(function PressableScale(
  {
    children,
    onPressIn,
    onPressOut,
    onPress,
    scaleTo = 'base',
    haptic = 'light',
    noScale = false,
    disabled,
    style,
    ...rest
  },
  ref
) {
  const reduceMotion = useReduceMotion();
  const targetScale = theme.motion.pressScale[scaleTo];
  // Reduced motion, and anything non-rectangular, fades instead of scaling.
  const fade = noScale || reduceMotion;

  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  // Reanimated 4: this worklet reads shared values and does nothing else.
  //
  // It used to start the spring INSIDE the worklet, off a ternary on a
  // `pressed` shared value, and it passed a dependency array. Both are
  // Reanimated 3 shapes. Reanimated 4 ignores dependency arrays on native and
  // warns once per app start, which is the "[Reanimated] Dependencies should
  // only be used on the web" line in the Metro log: this was the only call
  // site in the app producing it, and it arrived with Reanimated 4.7.1 in the
  // SDK 58 upgrade (f6188b8) rather than with any change to this file.
  // Animations now start where the press happens, which is where 4 wants them.
  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }]
  }));

  const animatePress = (down: boolean) => {
    if (fade) {
      scale.value = 1;
      opacity.value = withTiming(down ? 0.7 : 1, { duration: 90 });
      return;
    }
    opacity.value = 1;
    scale.value = withSpring(down ? targetScale : 1, theme.motion.spring.bouncy);
  };

  return (
    <AnimatedPressable
      ref={ref}
      disabled={disabled}
      style={[animatedStyle, style as any]}
      onPressIn={(e) => {
        animatePress(true);
        if (!disabled) {
          fireHaptic(haptic);
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        animatePress(false);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (!disabled) onPress?.(e);
      }}
      {...rest}
    >
      {children as any}
    </AnimatedPressable>
  );
});
