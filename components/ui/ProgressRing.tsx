import { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { theme } from '@/constants/theme';
import { useReduceMotion } from '@/lib/motion';

interface Props {
  progress: number;
  size?: number;
  label?: string;
  strokeWidth?: number;
  showValue?: boolean;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function ProgressRing({
  progress,
  size = 96,
  label = 'Score',
  strokeWidth = 10,
  showValue = true
}: Props) {
  const reduceMotion = useReduceMotion();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, progress));

  const animated = useSharedValue(0);
  useEffect(() => {
    animated.value = reduceMotion ? clamped : withSpring(clamped, theme.motion.spring.gentle);
  }, [clamped, reduceMotion]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference - (animated.value / 100) * circumference
  }));

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        <Defs>
          <SvgGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={theme.gradients.warm[0]} />
            <Stop offset="1" stopColor={theme.gradients.warm[1]} />
          </SvgGradient>
        </Defs>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.surface3}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGrad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
          fill="none"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      {showValue && (
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <AppText variant="title" style={{ fontSize: size / 4 }}>
            {Math.round(clamped)}%
          </AppText>
          {label ? (
            <AppText variant="caption" muted>
              {label}
            </AppText>
          ) : null}
        </View>
      )}
    </View>
  );
}
