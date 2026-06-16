import { PropsWithChildren } from 'react';
import { View, ViewProps, StyleProp, ViewStyle, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { theme, GradientName } from '@/constants/theme';
import { PressableScale } from './PressableScale';

type Variant = 'default' | 'glow' | 'glass' | 'gradient';

type Props = PropsWithChildren<ViewProps> & {
  onPress?: () => void;
  onLongPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: Variant;
  gradient?: GradientName;
  // Press-scale intensity when onPress is set.
  pressScale?: 'subtle' | 'base' | 'bold';
};

export function Card({
  children,
  style,
  onPress,
  onLongPress,
  variant = 'default',
  gradient = 'warm',
  pressScale = 'subtle',
  ...props
}: Props) {
  const baseStyle: StyleProp<ViewStyle> = [
    styles.base,
    variant === 'glow' && styles.glow,
    variant === 'glass' && styles.glass,
    variant === 'gradient' && styles.gradient
  ];

  const inner = (
    <>
      {variant === 'glass' ? (
        <BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill} />
      ) : null}
      {variant === 'gradient' ? (
        <LinearGradient
          colors={theme.gradients[gradient] as unknown as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {variant === 'glow' ? (
        <LinearGradient
          colors={['rgba(255,138,31,0.18)', 'rgba(255,138,31,0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </>
  );

  if (onPress || onLongPress) {
    return (
      <PressableScale
        onPress={onPress}
        onLongPress={onLongPress}
        scaleTo={pressScale}
        haptic="light"
        style={[baseStyle, style]}
      >
        {inner}
      </PressableScale>
    );
  }

  return (
    <View {...props} style={[baseStyle, style]}>
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing(2),
    overflow: 'hidden',
    ...theme.shadow.md
  },
  glow: {
    borderColor: theme.colors.primary,
    ...theme.shadow.glow
  },
  glass: {
    backgroundColor: theme.colors.glassTint,
    borderColor: theme.colors.glassBorder
  },
  gradient: {
    borderColor: 'transparent',
    ...theme.shadow.glow
  }
});
