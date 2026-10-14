import { forwardRef } from 'react';
import { ActivityIndicator, StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { AppText } from './text';
import { theme, GradientName } from '@/constants/theme';
import { PressableScale } from './PressableScale';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'gradient' | 'danger';

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
  pill?: boolean;
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
    rightIcon,
    pill = false
  },
  ref
) {
  const isDisabled = disabled || loading;
  const haptic = variant === 'ghost' ? 'light' : 'medium';

  const sizeStyle = size === 'sm' ? styles.sizeSm : size === 'lg' ? styles.sizeLg : styles.sizeMd;
  const variantBg =
    variant === 'secondary'
      ? styles.secondary
      : variant === 'ghost'
      ? styles.ghost
      : variant === 'outline'
      ? styles.outline
      : variant === 'danger'
      ? styles.danger
      : undefined;

  const labelColor =
    variant === 'ghost'
      ? theme.colors.primary2
      : variant === 'outline'
      ? theme.colors.primary
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

  // The prototypes' .btn: linear-gradient(135deg, #FD8302, #FD5B01) with the
  // orange drop shadow. `primary` used to be flat #FD8302 under the same glow,
  // which is the "old style" #98 reports, so both now draw the gradient.
  if (variant === 'gradient' || variant === 'primary') {
    return (
      <PressableScale
        ref={ref}
        disabled={isDisabled}
        haptic={haptic}
        onPress={onPress}
        style={[styles.gradientWrap, pill && styles.pill, isDisabled && styles.disabled, style]}
      >
        {/* The gradient IS the surface, not an absoluteFill child the wrapper
            has to clip. overflow:'hidden' with a 999 radius squares the
            corners off on Android, which is what `pill` used to do (#120). */}
        <LinearGradient
          colors={theme.gradients[gradient] as unknown as readonly [string, string, ...string[]]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradientFill, sizeStyle, pill && styles.pill]}
        >
          {inner}
        </LinearGradient>
      </PressableScale>
    );
  }

  return (
    <PressableScale
      ref={ref}
      disabled={isDisabled}
      haptic={haptic}
      onPress={onPress}
      style={[styles.base, variantBg, sizeStyle, pill && styles.pill, isDisabled && styles.disabled, style]}
    >
      {inner}
    </PressableScale>
  );
});

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.button,
    alignItems: 'center',
    justifyContent: 'center'
  },
  gradientWrap: {
    borderRadius: theme.radius.button,
    ...theme.shadow.glow
  },
  gradientFill: {
    borderRadius: theme.radius.button,
    alignItems: 'center',
    justifyContent: 'center'
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sizeSm: { paddingVertical: 10, paddingHorizontal: 14, minHeight: 40 },
  sizeMd: { paddingVertical: 14, paddingHorizontal: 18, minHeight: 52 },
  sizeLg: { paddingVertical: 18, paddingHorizontal: 22, minHeight: 60 },
  secondary: {
    backgroundColor: theme.colors.surface2,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  ghost: { backgroundColor: 'transparent' },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.primary
  },
  danger: { backgroundColor: theme.colors.danger },
  pill: { borderRadius: theme.radius.pill },
  label: { fontFamily: theme.fonts.bodyBold, fontSize: 15, letterSpacing: 0.3 },
  disabled: { opacity: 0.5 }
});
