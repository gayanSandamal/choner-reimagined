import { PropsWithChildren } from 'react';
import { View, ViewProps, Pressable, StyleProp, ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

type Props = PropsWithChildren<ViewProps> & {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'glow';
};

export function Card({ children, style, onPress, variant = 'default', ...props }: Props) {
  const baseStyle: StyleProp<ViewStyle> = {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: variant === 'glow' ? theme.colors.primary : theme.colors.border,
    padding: theme.spacing(2),
    ...(variant === 'glow' ? theme.shadow.glow : theme.shadow.md)
  };

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          baseStyle,
          pressed && { opacity: 0.8, backgroundColor: theme.colors.surfaceHighlight },
          style
        ]}
        {...(props as any)}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View {...props} style={[baseStyle, style]}>
      {children}
    </View>
  );
}
