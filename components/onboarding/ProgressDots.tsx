import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';
import { theme } from '@/constants/theme';

interface Props {
  // 1-based position of the active dot. Dots before it render as done.
  current: number;
  total?: number;
}

const DOT_SIZE = 8;
const ACTIVE_WIDTH = 24;

export function ProgressDots({ current, total = 5 }: Props) {
  return (
    <View style={styles.row} accessibilityLabel={`Step ${current} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <Dot key={i} state={i + 1 === current ? 'active' : i + 1 < current ? 'done' : 'off'} />
      ))}
    </View>
  );
}

function Dot({ state }: { state: 'done' | 'active' | 'off' }) {
  const active = useSharedValue(state === 'active' ? 1 : 0);

  useEffect(() => {
    active.value = withSpring(state === 'active' ? 1 : 0, theme.motion.spring.gentle);
  }, [state]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: DOT_SIZE + active.value * (ACTIVE_WIDTH - DOT_SIZE),
    backgroundColor: interpolateColor(
      active.value,
      [0, 1],
      [state === 'done' ? theme.colors.primary2 : theme.colors.border, theme.colors.primary]
    ),
    opacity: state === 'done' ? 0.6 : 1
  }));

  return <Animated.View style={[styles.dot, animatedStyle]} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8
  },
  dot: {
    height: DOT_SIZE,
    borderRadius: theme.radius.pill
  }
});
