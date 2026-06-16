import { forwardRef, useMemo } from 'react';
import { Pressable, PressableProps, View } from 'react-native';
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
export const PressableScale = forwardRef<View, Props>(function PressableScale(
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
  const pressed = useSharedValue(0);
  const targetScale = theme.motion.pressScale[scaleTo];

  const animatedStyle = useAnimatedStyle(() => {
    if (noScale || reduceMotion) {
      return { opacity: pressed.value ? 0.7 : 1 };
    }
    return {
      transform: [
        {
          scale: pressed.value
            ? withSpring(targetScale, theme.motion.spring.bouncy)
            : withSpring(1, theme.motion.spring.bouncy)
        }
      ]
    };
  }, [targetScale, noScale, reduceMotion]);

  const composedStyle = useMemo(
    () => (typeof style === 'function' ? style : style),
    [style]
  );

  return (
    <AnimatedPressable
      ref={ref}
      disabled={disabled}
      style={[animatedStyle, composedStyle as any]}
      onPressIn={(e) => {
        pressed.value = 1;
        if (!disabled) {
          fireHaptic(haptic);
        }
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        pressed.value = 0;
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
