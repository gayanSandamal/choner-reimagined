import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppText } from './AppText';
import { theme } from '@/constants/theme';

interface Props {
  uri?: string | null;
  name?: string | null;
  size?: number;
  ring?: boolean;
}

// Deterministic hue from name — same person always gets the same gradient.
function hashHue(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

const PALETTES: ReadonlyArray<readonly [string, string]> = [
  ['#FF8A1F', '#FF4E81'],
  ['#7C5CFF', '#33C2FF'],
  ['#3DD68C', '#FFC46A'],
  ['#FFB566', '#FF6B6B'],
  ['#33C2FF', '#7C5CFF'],
  ['#FF4E81', '#FFB566']
];

function initials(name?: string | null) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
}

export function Avatar({ uri, name, size = 48, ring = false }: Props) {
  const radius = size / 2;
  const palette = PALETTES[hashHue(name ?? '') % PALETTES.length]!;

  const inner = uri ? (
    <Image source={{ uri }} style={{ width: size, height: size, borderRadius: radius }} />
  ) : (
    <LinearGradient
      colors={palette}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <AppText
        style={{
          color: '#fff',
          fontFamily: theme.fonts.displayBlack,
          fontSize: size * 0.4
        }}
      >
        {initials(name)}
      </AppText>
    </LinearGradient>
  );

  if (!ring) return inner;

  return (
    <LinearGradient
      colors={theme.gradients.warm as unknown as readonly [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        padding: 3,
        borderRadius: radius + 3,
        alignSelf: 'flex-start'
      }}
    >
      <View
        style={{
          padding: 2,
          borderRadius: radius + 1,
          backgroundColor: theme.colors.bg
        }}
      >
        {inner}
      </View>
    </LinearGradient>
  );
}

// Kept for future extension — currently unused.
const _styles = StyleSheet.create({});
