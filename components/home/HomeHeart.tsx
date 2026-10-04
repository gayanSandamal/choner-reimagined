import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, RadialGradient, Stop, Circle } from 'react-native-svg';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { HEART_STAGES, heartCopy, heartStage } from '@/features/home/hero';
import { theme } from '@/constants/theme';

// The shared heart: "You + ?" before a partner, "You + Gayan" after.
//
// It counts sessions WITH THIS PARTNER and grows at 1, 5, 10, 25 and 50. It is
// not the streak: the streak is personal and lives on Challenges. Nothing here
// is tappable, and nothing here resets.
//
// Drawn as the prototype's relCard() (#112, #113): a white card, a 100pt heart
// in two halves over a soft orange glow, your half always filled, your
// partner's half filled once there is one and an outline with a "?" until then.
// It used to be a 54pt Ionicons glyph with no card, which read as an icon
// rather than the centre of the screen.

// The prototype's paths, on a 132 x 124 box: left half, then right half.
const LEFT = 'M66 30 C 56 14, 32 10, 20 24 C 6 39, 10 62, 24 78 C 34 90, 52 104, 66 114 Z';
const RIGHT = 'M66 30 C 76 14, 100 10, 112 24 C 126 39, 122 62, 108 78 C 98 90, 80 104, 66 114 Z';
const HEART_WIDTH = 100;
// Each stage reached grows the heart a little: .st1 1.06 through .st5 1.3.
const STAGE_SCALE = [1, 1.06, 1.12, 1.18, 1.24, 1.3];

export function HomeHeart({
  partnerName,
  partnerState,
  sessionsTogether
}: {
  partnerName: string | null;
  partnerState: string;
  sessionsTogether: number;
}) {
  const stage = heartStage(sessionsTogether);
  const copy = heartCopy({ partnerName, partnerState, sessionsTogether });
  const partnered = Boolean(partnerName);
  const width = HEART_WIDTH * (STAGE_SCALE[stage] ?? 1);
  const glow = stage >= 3 ? 230 : 190;

  return (
    <View
      style={styles.card}
      accessible
      accessibilityLabel={[copy.title, copy.count, copy.line].filter(Boolean).join('. ')}
    >
      <View style={styles.heartWrap}>
        <Svg width={glow} height={glow} style={styles.glow}>
          <Defs>
            <RadialGradient id="hg" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#FD8302" stopOpacity={0.22} />
              <Stop offset="100%" stopColor="#FD8302" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={glow / 2} cy={glow / 2} r={glow / 2} fill="url(#hg)" />
        </Svg>
        <Svg width={width} height={(width * 124) / 132} viewBox="0 0 132 124">
          <Defs>
            <LinearGradient id="gL" x1="0" y1="1" x2="0.5" y2="0">
              <Stop offset="0%" stopColor="#FD5B01" />
              <Stop offset="100%" stopColor="#FD8302" />
            </LinearGradient>
            <LinearGradient id="gR" x1="1" y1="1" x2="0.5" y2="0">
              <Stop offset="0%" stopColor="#FD8302" />
              <Stop offset="100%" stopColor="#FFA83D" />
            </LinearGradient>
          </Defs>
          <Path d={LEFT} fill="url(#gL)" />
          {partnered ? (
            <Path d={RIGHT} fill="url(#gR)" />
          ) : (
            <Path d={RIGHT} fill="none" stroke={theme.colors.dim} strokeWidth={2.4} strokeDasharray="5 5" />
          )}
        </Svg>
        {partnered ? null : <AppText style={styles.qmark}>?</AppText>}
      </View>

      <AppText style={styles.title}>{copy.title}</AppText>
      {copy.count ? (
        <View style={styles.countRow}>
          <Icon name="fire" size={20} color={theme.colors.primary2} />
          <AppText style={styles.count}>{copy.count}</AppText>
        </View>
      ) : null}
      {copy.line ? <AppText style={styles.line}>{copy.line}</AppText> : null}
      {partnered ? (
        <View style={styles.stages}>
          {HEART_STAGES.map((m) => (
            <View key={m} style={[styles.dot, sessionsTogether >= m && styles.dotOn]} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // .relc
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 22,
    paddingTop: 6,
    paddingHorizontal: 16,
    paddingBottom: 16,
    alignItems: 'center',
    gap: 8,
    ...theme.shadow.sm
  },
  // .hwrap
  heartWrap: { width: '100%', height: 132, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute' },
  // .qmark: on the empty half, right of centre.
  qmark: {
    position: 'absolute',
    top: 30,
    left: '50%',
    marginLeft: 30,
    fontSize: 22,
    lineHeight: 28,
    fontFamily: theme.fonts.bodyBold,
    color: theme.colors.dim
  },
  // .rel-h
  title: { fontSize: 14, color: theme.colors.text, fontFamily: theme.fonts.bodyBold },
  // .rel-k
  countRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  count: { fontSize: 17, color: theme.colors.primary2, fontFamily: theme.fonts.bodyBold },
  // .rel-l
  line: { fontSize: 12.5, lineHeight: 19, color: theme.colors.muted, textAlign: 'center' },
  // .stg
  stages: { flexDirection: 'row', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.border },
  dotOn: { backgroundColor: theme.colors.primary2 }
});
