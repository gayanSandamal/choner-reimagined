import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
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

  // The scale is all that animates now. The selected fill used to interpolate
  // to a flat theme.colors.primary — the old pre-gradient button style (#134),
  // which ebb199b moved buttons off and never came back for chips. A gradient
  // cannot be interpolated the way a colour can, so selecting is a swap, the
  // same trade the Find form's Pill already makes.
  const scaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + t.value * 0.02 }] }));

  const sizeStyle = size === 'sm' ? styles.sm : styles.md;
  const textStyle = { fontFamily: theme.fonts.bodyBold, fontSize: size === 'sm' ? 12 : 14 };

  const inner = (
    <>
      {icon}
      <AppText style={[textStyle, active ? styles.labelActive : styles.label]}>{label}</AppText>
    </>
  );

  return (
    <PressableScale onPress={onPress} scaleTo="subtle" haptic="selection" disabled={!onPress}>
      <Animated.View style={scaleStyle}>
        {active ? (
          // The gradient IS the surface — no absoluteFill child, so nothing has
          // to clip, and a pill radius cannot square the corners off on
          // Android (#120). Same border width in both states so a row of chips
          // cannot reflow when one is selected.
          <LinearGradient
            colors={theme.gradients.warm as unknown as readonly [string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.base, sizeStyle, styles.activeEdge]}
          >
            {inner}
          </LinearGradient>
        ) : (
          <View style={[styles.base, sizeStyle, styles.restEdge]}>{inner}</View>
        )}
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
  restEdge: { backgroundColor: theme.colors.chip, borderColor: theme.colors.border },
  activeEdge: { borderColor: 'transparent' },
  label: { color: theme.colors.text },
  labelActive: { color: '#FFFFFF' },
  sm: { paddingHorizontal: 12, paddingVertical: 6 },
  md: { paddingHorizontal: 16, paddingVertical: 10 }
});
