import { forwardRef } from 'react';
import { Pressable, PressableProps, StyleProp, StyleSheet, TextStyle, ViewStyle } from 'react-native';
import { AppText } from './text';
import { theme } from '@/constants/theme';

interface ButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}

import { View } from 'react-native';

export const Button = forwardRef<View, ButtonProps>(
  ({ label, variant = 'primary', style, disabled, labelStyle, ...props }, ref) => {
    return (
      <Pressable
        ref={ref}
        disabled={disabled}
        style={({ pressed }) => [
          styles.base,
          styles[variant],
          pressed && !disabled && styles.pressed,
          disabled && styles.disabled,
          style,
        ]}
        {...props}
      >
        <AppText style={[styles.label, variant === 'ghost' && { color: theme.colors.primary2 }, labelStyle]}>
          {label}
        </AppText>
      </Pressable>
    );
  }
);

Button.displayName = 'Button';

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: theme.colors.primary },
  secondary: { backgroundColor: theme.colors.surface2, borderWidth: 1, borderColor: theme.colors.border },
  ghost: { backgroundColor: 'transparent' },
  label: { fontWeight: '700' },
  pressed: { opacity: 0.8 },
  disabled: { opacity: 0.5 },
});
