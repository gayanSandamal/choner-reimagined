import { forwardRef } from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { AppText } from './text';
import { theme, GradientName } from '@/constants/theme';
import { PressableScale } from './PressableScale';

type Variant = 'primary' | 'secondary' | 'ghost' | 'gradient' | 'danger';

interface ButtonProps {
  label: string;
  variant?: Variant;
  gradient?: GradientName;
  loading?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<View, ButtonProps>(function Button(
  {
    label,
    variant = 'primary',
    gradient = 'warm',
    loading = false,
    disabled,
    onPress,
    style,
    labelStyle,
    size = 'md',
    leftIcon,
    rightIcon
  },
  ref
) {
  const isDisabled = disabled || loading;
  const haptic = variant === 'ghost' ? 'light' : 'medium';

  const sizeStyle = size === 'sm' ? styles.sizeSm : size === 'lg' ? styles.sizeLg : styles.sizeMd;
  const variantBg =
    variant === 'primary'
      ? styles.primary
      : variant === 'secondary'
      ? styles.secondary
      : variant === 'ghost'
      ? styles.ghost
      : variant === 'danger'
      ? styles.danger
      : undefined;

  const labelColor =
    variant === 'ghost'
      ? theme.colors.primary2
      : variant === 'secondary'
      ? theme.colors.text
      : '#FFFFFF';

  const inner = loading ? (
    <Animated.View entering={FadeIn.duration(120)} exiting={FadeOut.duration(120)}>
      <ActivityIndicator color={labelColor} />
    </Animated.View>
  ) : (
    <Animated.View
      entering={FadeIn.duration(120)}
      style={styles.content}
    >
      {leftIcon}
      <AppText style={[styles.label, { color: labelColor }, labelStyle]}>{label}</AppText>
      {rightIcon}
    </Animated.View>
  );

  if (variant === 'gradient') {
    return (
      <PressableScale
        ref={ref}
        disabled={isDisabled}
        haptic={haptic}
        onPress={onPress}
        style={[styles.gradientWrap, sizeStyle, isDisabled && styles.disabled, style]}
      >
        <LinearGradient
          colors={theme.gradients[gradient] as unknown as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        {inner}
      </PressableScale>
    );
  }

  return (
    <PressableScale
      ref={ref}
      disabled={isDisabled}
      haptic={haptic}
      onPress={onPress}
      style={[styles.base, variantBg, sizeStyle, isDisabled && styles.disabled, style]}
    >
      {inner}
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  gradientWrap: {
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadow.glow
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sizeSm: { paddingVertical: 10, paddingHorizontal: 14, minHeight: 40 },
  sizeMd: { paddingVertical: 14, paddingHorizontal: 18, minHeight: 52 },
  sizeLg: { paddingVertical: 18, paddingHorizontal: 22, minHeight: 60 },
  primary: { backgroundColor: theme.colors.primary, ...theme.shadow.glow },
  secondary: {
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  ghost: { backgroundColor: 'transparent' },
  danger: { backgroundColor: theme.colors.danger },
  label: { fontFamily: theme.fonts.bodyBold, fontSize: 15, letterSpacing: 0.3 },
  disabled: { opacity: 0.5 }
});
