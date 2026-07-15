import { ForwardedRef, forwardRef, useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, TextInputProps } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  // Renders an eye button that toggles secureTextEntry internally.
  secureToggle?: boolean;
  pill?: boolean;
}

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

export const Input = forwardRef(function Input(
  {
    label,
    error,
    style,
    onFocus,
    onBlur,
    leftIcon,
    rightIcon,
    secureToggle = false,
    pill = false,
    secureTextEntry,
    ...props
  }: InputProps,
  ref: ForwardedRef<TextInput>
) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const focus = useSharedValue(0);
  const errorPulse = useSharedValue(0);
  const shake = useSharedValue(0);

  useEffect(() => {
    focus.value = withSpring(focused ? 1 : 0, theme.motion.spring.gentle);
  }, [focused]);

  useEffect(() => {
    if (error) {
      errorPulse.value = withTiming(1, { duration: 180 });
      shake.value = withSequence(
        withTiming(-8, { duration: 60 }),
        withRepeat(withTiming(8, { duration: 90 }), 3, true),
        withTiming(0, { duration: 60 })
      );
    } else {
      errorPulse.value = withTiming(0, { duration: 180 });
    }
  }, [error]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }]
  }));

  const inputStyle = useAnimatedStyle(() => {
    const t = Math.max(focus.value, errorPulse.value);
    const borderColor = interpolateColor(
      t,
      [0, 1],
      [theme.colors.border, error ? theme.colors.danger : theme.colors.primary]
    );
    return { borderColor };
  });

  const handleFocus: TextInputProps['onFocus'] = (e) => {
    setFocused(true);
    onFocus?.(e);
  };
  const handleBlur: TextInputProps['onBlur'] = (e) => {
    setFocused(false);
    onBlur?.(e);
  };

  const adorned = Boolean(leftIcon || rightIcon || secureToggle || pill);

  if (!adorned) {
    return (
      <Animated.View style={[styles.wrapper, containerStyle]}>
        {label ? <Animated.Text style={styles.label}>{label}</Animated.Text> : null}
        <AnimatedTextInput
          ref={ref as any}
          placeholderTextColor={theme.colors.muted}
          style={[styles.input, inputStyle, style]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={secureTextEntry}
          {...props}
        />
        {error ? <Animated.Text style={styles.error}>{error}</Animated.Text> : null}
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.wrapper, containerStyle]}>
      {label ? <Animated.Text style={styles.label}>{label}</Animated.Text> : null}
      <Animated.View
        style={[styles.adornedBox, pill && { borderRadius: theme.radius.pill }, inputStyle]}
      >
        {leftIcon}
        <TextInput
          ref={ref}
          placeholderTextColor={theme.colors.muted}
          style={[styles.adornedInput, style]}
          onFocus={handleFocus}
          onBlur={handleBlur}
          secureTextEntry={secureToggle ? hidden : secureTextEntry}
          {...props}
        />
        {secureToggle ? (
          <Pressable
            hitSlop={8}
            onPress={() => setHidden((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
          >
            <Ionicons
              name={hidden ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={theme.colors.muted}
            />
          </Pressable>
        ) : (
          rightIcon
        )}
      </Animated.View>
      {error ? <Animated.Text style={styles.error}>{error}</Animated.Text> : null}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  wrapper: { gap: 8 },
  label: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 13,
    color: theme.colors.muted,
    letterSpacing: 0.4,
    textTransform: 'uppercase'
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    color: theme.colors.text,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontFamily: theme.fonts.body,
    fontSize: 15
  },
  adornedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.lg,
    paddingHorizontal: 18,
    minHeight: 56
  },
  adornedInput: {
    flex: 1,
    color: theme.colors.text,
    paddingVertical: 16,
    fontFamily: theme.fonts.body,
    fontSize: 15
  },
  error: {
    color: theme.colors.danger,
    fontFamily: theme.fonts.body,
    fontSize: 12
  }
});
