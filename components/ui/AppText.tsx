import { Text, TextProps, TextStyle } from 'react-native';
import { theme } from '@/constants/theme';

type Variant = 'display' | 'title' | 'subtitle' | 'body' | 'caption' | 'label';

interface Props extends TextProps {
  variant?: Variant;
  muted?: boolean;
}

const styles: Record<Variant, TextStyle> = {
  display: {
    fontFamily: theme.fonts.displayBlack,
    fontSize: 40,
    letterSpacing: -1,
    lineHeight: 46
  },
  title: {
    fontFamily: theme.fonts.display,
    fontSize: 28,
    letterSpacing: -0.5,
    lineHeight: 34
  },
  subtitle: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 18,
    letterSpacing: -0.2,
    lineHeight: 24
  },
  body: {
    fontFamily: theme.fonts.body,
    fontSize: 15,
    letterSpacing: 0.1,
    lineHeight: 22
  },
  caption: {
    fontFamily: theme.fonts.body,
    fontSize: 13,
    letterSpacing: 0.2,
    lineHeight: 18
  },
  label: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase'
  }
};

export function AppText({ variant = 'body', muted = false, style, ...props }: Props) {
  return (
    <Text
      {...props}
      style={[
        {
          color: muted ? theme.colors.muted : theme.colors.text,
          ...styles[variant]
        },
        style
      ]}
    />
  );
}
