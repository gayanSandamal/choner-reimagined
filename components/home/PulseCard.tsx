import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { AppText } from '@/components/ui/AppText';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { HomePulse, PulseMoment, pulseChips, pulseMomentItems } from '@/features/home/hero';
import { ACTIVITY_ICONS } from './activityIcons';
import { theme } from '@/constants/theme';

// Choner Pulse and Just Happened, drawn as the prototype's dark cards
// (.pulse2 and .jsq, #112). Every number is a real count from
// get_home_pulse(); an activity with nobody on it is not drawn, and with
// nobody at all neither card is.
//
// The little faces are anonymous silhouettes, decoration rather than people:
// Home never names anyone outside your own pair.

const NAVY_GRADIENT = ['#0B2231', '#001827'] as const;
const PEACH = '#FFB070';
const HUES = ['#FD8302', '#1E3A4C', '#2E9E6B', '#8E5FD9', '#D9534F', '#3B8FD1'];

// .anon: a person-shaped circle on a coloured gradient.
function Anon({ i, size, ring }: { i: number; size: number; ring: string }) {
  return (
    <LinearGradient
      colors={[HUES[i % HUES.length], '#001827']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.anon, { width: size, height: size, borderRadius: size / 2, borderColor: ring }]}
    >
      <Icon name="user" size={size * 0.58} color="rgba(255,255,255,0.85)" strokeWidth={2} />
    </LinearGradient>
  );
}

function Faces({ from, size, ring }: { from: number; size: number; ring: string }) {
  return (
    <View style={styles.faces}>
      {[0, 1, 2].map((k) => (
        <View key={k} style={k > 0 ? { marginLeft: -6 } : null}>
          <Anon i={from + k} size={size} ring={ring} />
        </View>
      ))}
    </View>
  );
}

function LiveDot() {
  return <View style={styles.live} />;
}

// The tiles open Find's directory. That is the one thing on Home that leaves
// for another tab's screen, and it is browsing, not starting a search.
export function PulseCard({ pulse, onOpenDirectory }: { pulse: HomePulse; onOpenDirectory: () => void }) {
  const tiles = pulse.by_activity.filter((a) => a.people > 0);
  if (pulse.people <= 0 || tiles.length === 0) return null;
  const chips = pulseChips(pulse);

  return (
    <LinearGradient colors={NAVY_GRADIENT} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.pulse}>
      <View style={styles.head}>
        <LiveDot />
        <AppText style={styles.heading}>Choner Pulse</AppText>
      </View>
      <AppText style={styles.headline}>
        <AppText style={styles.big}>{pulse.people} </AppText>
        {pulse.people === 1 ? 'person is on Choner right now' : 'people are on Choner right now'}
      </AppText>

      <View style={styles.tiles}>
        {tiles.map((a, i) => (
          <PressableScale
            key={a.activity_key}
            onPress={onOpenDirectory}
            haptic="selection"
            accessibilityRole="button"
            accessibilityLabel={`${a.title}, ${a.people} people. See who is on the move.`}
            style={styles.tile}
          >
            <LinearGradient
              colors={theme.gradients.warm as unknown as readonly [string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.tileIcon}
            >
              <Icon name={ACTIVITY_ICONS[a.activity_key] ?? 'target'} size={20} color="#FFFFFF" />
            </LinearGradient>
            <AppText style={styles.tileCount}>{a.people}</AppText>
            <AppText style={styles.tileLabel}>{a.title}</AppText>
            <Faces from={a.people + i} size={16} ring="#13293A" />
          </PressableScale>
        ))}
      </View>

      {chips.length ? (
        <View style={styles.chips}>
          {chips.map((c) => (
            <View key={c} style={styles.chip}>
              <AppText style={styles.chipText}>{c}</AppText>
            </View>
          ))}
        </View>
      ) : null}
    </LinearGradient>
  );
}

function SmallHeart({ size }: { size: number }) {
  return (
    <Svg width={size} height={(size * 22) / 24} viewBox="0 0 24 22">
      <Path
        d="M12 21C6 17 1.5 13.4 1.5 8.5 1.5 5.5 3.7 3.5 6.3 3.5 8.7 3.5 10.7 5 12 7 13.3 5 15.3 3.5 17.7 3.5 20.3 3.5 22.5 5.5 22.5 8.5 22.5 13.4 18 17 12 21z"
        fill="#FD5B01"
      />
    </Svg>
  );
}

function Pair({ a, b, size, heart }: { a: number; b: number; size: number; heart: number }) {
  return (
    <View style={styles.pair}>
      <Anon i={a} size={size} ring="#0B2231" />
      <View style={{ marginHorizontal: -heart / 4, zIndex: 2 }}>
        <SmallHeart size={heart} />
      </View>
      <Anon i={b} size={size} ring="#0B2231" />
    </View>
  );
}

function MomentPicture({ m }: { m: PulseMoment }) {
  if (m.kind === 'pair') return <Pair a={0} b={1} size={64} heart={40} />;
  if (m.kind === 'pairs') {
    return (
      <View style={{ gap: 8, alignItems: 'center' }}>
        {[0, 1, 2].slice(0, Math.min(3, m.n)).map((k) => (
          <Pair key={k} a={k} b={k + 3} size={30} heart={18} />
        ))}
      </View>
    );
  }
  if (m.kind === 'done') {
    return (
      <View style={styles.col}>
        <View style={styles.ok}>
          <Icon name="check" size={30} color="#5FD3A0" strokeWidth={2.6} />
        </View>
        <AppText style={styles.momentNumber}>{m.n}</AppText>
      </View>
    );
  }
  return (
    <View style={styles.col}>
      <AppText style={styles.momentNumber}>{m.n}</AppText>
      <Faces from={2} size={26} ring="#0B2231" />
    </View>
  );
}

// Just Happened: a square dark card that changes by itself and is not
// tappable. It rotates through what has actually happened; with nothing to say
// it is absent.
export function JustHappened({ pulse }: { pulse: HomePulse }) {
  const moments = pulseMomentItems(pulse);
  const [i, setI] = useState(0);

  useEffect(() => {
    if (moments.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % moments.length), 4000);
    return () => clearInterval(t);
  }, [moments.length]);

  if (moments.length === 0) return null;
  const current = i % moments.length;
  const m = moments[current];
  return (
    <LinearGradient
      colors={NAVY_GRADIENT}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.square}
      accessible
      accessibilityLabel={`Just happened. ${m.text}`}
    >
      <View style={styles.head}>
        <LiveDot />
        <AppText style={styles.heading}>Just Happened</AppText>
      </View>
      <View style={styles.squareBody}>
        <MomentPicture m={m} />
        {/* The number is drawn above for the counted kinds, so the line keeps it. */}
        <AppText style={styles.momentText}>{m.text}</AppText>
        {moments.length > 1 ? (
          <View style={styles.dots}>
            {moments.map((_, k) => (
              <View key={k} style={[styles.dot, k === current && styles.dotOn]} />
            ))}
          </View>
        ) : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  // .pulse2
  pulse: { borderRadius: 22, paddingTop: 16, paddingHorizontal: 16, paddingBottom: 14, gap: 12, ...theme.shadow.lg },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  live: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.primary2 },
  heading: { fontSize: 13, color: PEACH, fontFamily: theme.fonts.bodyBold },
  headline: { fontSize: 15, lineHeight: 20, color: 'rgba(255,255,255,0.85)' },
  big: { fontSize: 40, lineHeight: 46, letterSpacing: -1.5, color: '#FFFFFF', fontFamily: theme.fonts.bodyBold },
  // .tiles, two columns
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    alignItems: 'flex-start',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 12
  },
  tileIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  tileCount: { fontSize: 24, lineHeight: 28, letterSpacing: -0.6, color: '#FFFFFF', fontFamily: theme.fonts.bodyBold },
  tileLabel: { fontSize: 11.5, color: 'rgba(255,255,255,0.65)' },
  faces: { flexDirection: 'row', marginTop: 4 },
  anon: { alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  // .dsum
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: 'rgba(253,131,2,0.16)', borderRadius: 99, paddingVertical: 4, paddingHorizontal: 10 },
  chipText: { fontSize: 11, color: '#FFD2AE', fontFamily: theme.fonts.bodyMedium },
  // .jsq
  square: { width: '100%', aspectRatio: 1, borderRadius: 24, padding: 18, ...theme.shadow.lg },
  squareBody: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  pair: { flexDirection: 'row', alignItems: 'center' },
  col: { alignItems: 'center', gap: 12 },
  ok: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(46,158,107,0.22)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  momentNumber: { fontSize: 76, lineHeight: 84, letterSpacing: -3, color: '#FFFFFF', fontFamily: theme.fonts.bodyBold },
  momentText: { fontSize: 16, lineHeight: 22, color: 'rgba(255,255,255,0.92)', textAlign: 'center', maxWidth: 250 },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.25)' },
  dotOn: { width: 14, backgroundColor: theme.colors.primary }
});
