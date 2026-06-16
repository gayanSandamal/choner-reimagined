import { PropsWithChildren } from 'react';
import { Text as RNText, StyleSheet, TextProps } from 'react-native';
import { theme } from '@/constants/theme';

interface AppTextProps extends TextProps, PropsWithChildren {
  variant?: 'display' | 'title' | 'subtitle' | 'body' | 'muted' | 'caption';
}

export function AppText({ variant = 'body', style, children, ...props }: AppTextProps) {
  return <RNText style={[styles.base, styles[variant], style]} {...props}>{children}</RNText>;
}

const styles = StyleSheet.create({
  base: { color: theme.colors.text, fontFamily: theme.fonts.body },
  display: { fontSize: 40, fontFamily: theme.fonts.displayBlack, letterSpacing: -1, lineHeight: 46 },
  title: { fontSize: 28, fontFamily: theme.fonts.display, letterSpacing: -0.5, lineHeight: 34 },
  subtitle: { fontSize: 18, fontFamily: theme.fonts.bodyBold, letterSpacing: -0.2, lineHeight: 24 },
  body: { fontSize: 15, fontFamily: theme.fonts.body, lineHeight: 22 },
  muted: { fontSize: 14, fontFamily: theme.fonts.body, color: theme.colors.muted, lineHeight: 20 },
  caption: { fontSize: 12, fontFamily: theme.fonts.body, color: theme.colors.muted, lineHeight: 16 }
});
