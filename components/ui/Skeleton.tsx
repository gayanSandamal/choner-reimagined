import { useEffect } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import { theme } from '@/constants/theme';
import { useReduceMotion } from '@/lib/motion';

interface Props {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({ width = '100%', height = 16, radius = theme.radius.sm, style }: Props) {
  const reduceMotion = useReduceMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      t.value = 0.5;
      return;
    }
    t.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 0.35 + t.value * 0.45
  }));

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius: radius,
          backgroundColor: theme.colors.surface2
        },
        animatedStyle,
        style
      ]}
    />
  );
}
