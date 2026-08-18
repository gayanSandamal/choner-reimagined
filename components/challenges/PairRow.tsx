import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { useReduceMotion } from '@/lib/motion';
import { theme } from '@/constants/theme';

const DIM = '#2c4759';
const SURFACE_2 = '#072839';
const BORDER = '#0e3448';

function initialsOf(name?: string | null) {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '··';
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase();
}

// One seat at the fire: lit when that person has checked in today.
function Seat({ label, on }: { label: string; on: boolean }) {
  if (on) {
    return (
      <LinearGradient
        colors={['#FE8C00', '#e07600']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.seat, styles.seatOn]}
      >
        <AppText style={styles.seatTextOn}>{label}</AppText>
      </LinearGradient>
    );
  }
  return (
    <View style={styles.seat}>
      <AppText style={styles.seatText}>{label}</AppText>
    </View>
  );
}

// The empty seat: nobody there, and nothing is happening about it.
function OpenSeat() {
  return (
    <View style={[styles.seat, styles.seatOpen]}>
      <AppText style={styles.seatPlus}>+</AppText>
    </View>
  );
}

// The empty seat while we're actively looking. Three blinking dots — the only
// motion allowed in a partnerless heart, because something really is happening.
function SeekingSeat() {
  const reduceMotion = useReduceMotion();
  return (
    <View style={[styles.seat, styles.seatSeek]}>
      {[0, 1, 2].map((i) => (
        <Blip key={i} index={i} still={reduceMotion} />
      ))}
    </View>
  );
}

function Blip({ index, still }: { index: number; still: boolean }) {
  const o = useSharedValue(still ? 1 : 0.2);
  useEffect(() => {
    if (still) return;
    o.value = withDelay(
      index * 200,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 650, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.2, { duration: 650, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, [still, index]);
  const style = useAnimatedStyle(() => ({ opacity: o.value }));
  return <Animated.View style={[styles.blip, style]} />;
}

interface Props {
  youName?: string | null;
  youCheckedIn: boolean;
  // 'open' — nobody and not looking · 'seeking' — in the pool
  // otherwise the partner's name, lit when they've checked in.
  partner: { kind: 'open' } | { kind: 'seeking' } | { kind: 'person'; name?: string | null; on: boolean };
  streak?: number;
}

// You, the streak between you, and them. The streak only appears once there is
// something to count.
export function PairRow({ youName, youCheckedIn, partner, streak }: Props) {
  return (
    <View style={styles.row}>
      <Seat label={initialsOf(youName)} on={youCheckedIn} />
      {typeof streak === 'number' && streak > 0 ? (
        <View style={styles.streak}>
          <AppText style={styles.streakNum}>{streak}</AppText>
          <AppText style={styles.streakLabel}>day streak</AppText>
        </View>
      ) : null}
      {partner.kind === 'open' ? (
        <OpenSeat />
      ) : partner.kind === 'seeking' ? (
        <SeekingSeat />
      ) : (
        <Seat label={initialsOf(partner.name)} on={partner.on} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 10
  },
  seat: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 3,
    backgroundColor: SURFACE_2,
    borderWidth: 1,
    borderColor: BORDER
  },
  seatOn: { borderColor: 'transparent' },
  seatOpen: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: DIM, backgroundColor: 'transparent' },
  seatSeek: { borderWidth: 1.5, borderColor: 'rgba(254,140,0,0.4)', backgroundColor: 'transparent' },
  seatText: { fontFamily: theme.fonts.bodyBold, fontSize: 10.5, color: DIM, letterSpacing: 0.3 },
  seatTextOn: { fontFamily: theme.fonts.bodyBold, fontSize: 10.5, color: '#2a1400', letterSpacing: 0.3 },
  seatPlus: { fontSize: 15, color: DIM },
  blip: { width: 3.5, height: 3.5, borderRadius: 2, backgroundColor: '#FE8C00' },
  streak: { alignItems: 'center' },
  streakNum: { fontFamily: theme.fonts.bodyBold, fontSize: 26, color: theme.colors.text, lineHeight: 28 },
  streakLabel: { fontSize: 10.5, color: theme.colors.muted, marginTop: 2 }
});
