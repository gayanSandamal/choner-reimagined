import { StyleSheet } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { AppText } from './AppText';
import { theme } from '@/constants/theme';
import { PressableScale } from './PressableScale';

interface Props {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
}

export function Chip({ label, active = false, onPress, icon, size = 'md' }: Props) {
  const t = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    t.value = withSpring(active ? 1 : 0, theme.motion.spring.bouncy);
  }, [active]);

  const bgStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      t.value,
      [0, 1],
      [theme.colors.chip, theme.colors.primary]
    ),
    borderColor: interpolateColor(
      t.value,
      [0, 1],
      [theme.colors.border, theme.colors.primary]
    ),
    transform: [{ scale: 1 + t.value * 0.02 }]
  }));

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(t.value, [0, 1], [theme.colors.text, '#FFFFFF'])
  }));

  const sizeStyle = size === 'sm' ? styles.sm : styles.md;

  return (
    <PressableScale onPress={onPress} scaleTo="subtle" haptic="selection" disabled={!onPress}>
      <Animated.View style={[styles.base, sizeStyle, bgStyle]}>
        {icon}
        <Animated.Text
          style={[
            { fontFamily: theme.fonts.bodyBold, fontSize: size === 'sm' ? 12 : 14 },
            textStyle
          ]}
        >
          {label}
        </Animated.Text>
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: theme.radius.pill,
    borderWidth: 1
  },
  sm: { paddingHorizontal: 12, paddingVertical: 6 },
  md: { paddingHorizontal: 16, paddingVertical: 10 }
});
