import { StyleSheet, Text, TextProps, TextStyle } from 'react-native';
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

// Enough room for ascenders and descenders at any size; below this the native
// text box crops the glyphs.
const MIN_LINE_RATIO = 1.25;

// Callers routinely override just the fontSize (the tab page titles ask for 24
// on the body variant, whose lineHeight is 22). The variant's lineHeight would
// otherwise stay behind and clip the taller glyphs, so raise it just enough to
// fit — sizes that already have room keep the variant's spacing untouched.
function resolveLineHeight(variant: Variant, style: TextProps['style']): number | undefined {
  const base = styles[variant];
  if (!base.lineHeight) return undefined;

  const override = StyleSheet.flatten(style) as TextStyle | undefined;
  if (!override || override.lineHeight !== undefined) return undefined;
  if (typeof override.fontSize !== 'number') return undefined;

  const needed = Math.ceil(override.fontSize * MIN_LINE_RATIO);
  return needed > base.lineHeight ? needed : undefined;
}

export function AppText({ variant = 'body', muted = false, style, ...props }: Props) {
  const lineHeight = resolveLineHeight(variant, style);

  return (
    <Text
      {...props}
      style={[
        {
          color: muted ? theme.colors.muted : theme.colors.text,
          ...styles[variant]
        },
        style,
        lineHeight !== undefined && { lineHeight }
      ]}
    />
  );
}
