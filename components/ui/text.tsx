import { PropsWithChildren } from 'react';
import { Text as RNText, StyleSheet, TextProps } from 'react-native';
import { theme } from '@/constants/theme';

interface AppTextProps extends TextProps, PropsWithChildren {
  variant?: 'title' | 'subtitle' | 'body' | 'muted' | 'caption';
}

export function AppText({ variant = 'body', style, children, ...props }: AppTextProps) {
  return <RNText style={[styles.base, styles[variant], style]} {...props}>{children}</RNText>;
}

const styles = StyleSheet.create({
  base: { color: theme.colors.text },
  title: { fontSize: 28, fontWeight: '700' },
  subtitle: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22 },
  muted: { fontSize: 14, color: theme.colors.muted },
  caption: { fontSize: 12, color: theme.colors.muted },
});
