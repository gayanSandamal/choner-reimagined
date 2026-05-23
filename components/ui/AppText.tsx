import { Text, TextProps, TextStyle } from 'react-native';
import { theme } from '@/constants/theme';

type Variant = 'title' | 'subtitle' | 'body' | 'caption' | 'label';

interface Props extends TextProps {
  variant?: Variant;
  muted?: boolean;
}

const styles: Record<Variant, TextStyle> = {
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: 18, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 15, fontWeight: '400', letterSpacing: 0.1 },
  caption: { fontSize: 13, fontWeight: '400', letterSpacing: 0.2 },
  label: { fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }
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
