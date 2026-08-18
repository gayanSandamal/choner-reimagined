import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Stop,
  Circle,
  Rect
} from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { useReduceMotion } from '@/lib/motion';
import type { PartnerState } from '@/types/database';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Source viewBox from the reference mockup. Both halves meet on the centre
// line at x=66, which is what makes "left is you, right is them" read.
const VB_W = 132;
const VB_H = 124;

const LEFT_PATH = 'M66 30 C 56 14, 32 10, 20 24 C 6 39, 10 62, 24 78 C 34 90, 52 104, 66 114 Z';
const RIGHT_PATH = 'M66 30 C 76 14, 100 10, 112 24 C 126 39, 122 62, 108 78 C 98 90, 80 104, 66 114 Z';

const ORANGE = '#FE8C00';
const ORANGE_SOFT = '#ffb355';
const ORANGE_DEEP = '#e07600';
const DIM = '#2c4759';

interface Props {
  // Has the user checked in today?
  youCheckedIn: boolean;
  // Has the partner? Only meaningful once partnered.
  partnerCheckedIn: boolean;
  partnerState: PartnerState;
  width?: number;
}

// The single visual identity of the app: one heart, split down the middle.
// Left half is you, right half is your partner.
//
// The state table is deliberate about restraint — glow, scale, heartbeat and
// the orbiting dot are each tied to a specific condition, and the solo state
// gets none of them. That stillness is what makes a partnered heart feel like
// something; adding motion to solo would flatten the whole system.
export function Heart({ youCheckedIn, partnerCheckedIn, partnerState, width = 132 }: Props) {
  const reduceMotion = useReduceMotion();

  const partnered = partnerState === 'partnered';
  const finding = partnerState === 'finding';

  // Mirrors the reference: the partner half only counts once there is a real
  // partner behind it.
  const both = partnered && youCheckedIn && partnerCheckedIn;
  const some = youCheckedIn || (partnered && partnerCheckedIn);

  const scale = both ? 1.05 : some ? 0.97 : 0.9;
  // Never any glow while solo — including the invited and matched waits, which
  // are still a half-empty heart.
  const glow = !partnered && !finding ? 0 : both ? 0.28 : some ? 0.13 : 0;

  const height = (width / VB_W) * VB_H;

  // ---- heartbeat: only when both are in ----
  const beat = useSharedValue(1);
  useEffect(() => {
    if (both && !reduceMotion) {
      beat.value = withRepeat(
        withSequence(
          withTiming(1.045, { duration: 364, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 364, easing: Easing.inOut(Easing.ease) }),
          withTiming(1.03, { duration: 364, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1508, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      beat.value = withTiming(1, { duration: 200 });
    }
  }, [both, reduceMotion]);

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale * beat.value }]
  }));

  // ---- seeking pulse: only while in the pool ----
  const seek = useSharedValue(1);
  useEffect(() => {
    if (finding && !reduceMotion) {
      seek.value = withRepeat(
        withSequence(
          withTiming(0.28, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.7, { duration: 1400, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        false
      );
    } else {
      seek.value = withTiming(1, { duration: 200 });
    }
  }, [finding, reduceMotion]);

  const seekProps = useAnimatedProps(() => ({ opacity: seek.value }));

  // ---- orbit dot: only when both are in ----
  const spin = useSharedValue(0);
  useEffect(() => {
    if (both && !reduceMotion) {
      spin.value = 0;
      spin.value = withRepeat(withTiming(360, { duration: 9000, easing: Easing.linear }), -1, false);
    } else {
      spin.value = 0;
    }
  }, [both, reduceMotion]);

  const orbitStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value}deg` }]
  }));

  const rightIsDashed = !partnered && !finding;

  return (
    <View style={[styles.stage, { height: height * 1.4 }]} accessibilityRole="image">
      {/* Glow sits behind everything and is purely atmospheric. */}
      {glow > 0 ? (
        <Svg width={width * 1.6} height={width * 1.6} style={StyleSheet.absoluteFill as any}>
          <Defs>
            <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={ORANGE} stopOpacity={glow} />
              <Stop offset="68%" stopColor={ORANGE} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#glow)" />
        </Svg>
      ) : null}

      <Animated.View style={heartStyle}>
        <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`}>
          <Defs>
            <LinearGradient id="gL" x1="0" y1="1" x2="0.4" y2="0">
              <Stop offset="0%" stopColor={ORANGE_DEEP} />
              <Stop offset="100%" stopColor={ORANGE} />
            </LinearGradient>
            <LinearGradient id="gR" x1="1" y1="1" x2="0.6" y2="0">
              <Stop offset="0%" stopColor={ORANGE} />
              <Stop offset="100%" stopColor={ORANGE_SOFT} />
            </LinearGradient>
          </Defs>

          {/* Left — you */}
          <Path
            d={LEFT_PATH}
            fill={youCheckedIn ? 'url(#gL)' : 'none'}
            stroke={youCheckedIn ? 'none' : DIM}
            strokeWidth={2.4}
            strokeLinejoin="round"
          />

          {/* Right — your partner, or the shape of their absence */}
          {finding ? (
            <AnimatedPath
              d={RIGHT_PATH}
              fill="none"
              stroke={ORANGE}
              strokeWidth={2.2}
              strokeLinejoin="round"
              animatedProps={seekProps}
            />
          ) : (
            <Path
              d={RIGHT_PATH}
              fill={partnered && partnerCheckedIn ? 'url(#gR)' : 'none'}
              stroke={partnered && partnerCheckedIn ? 'none' : DIM}
              strokeWidth={rightIsDashed ? 2 : 2.4}
              strokeDasharray={rightIsDashed ? '5,5' : undefined}
              strokeLinejoin="round"
            />
          )}
        </Svg>
      </Animated.View>

      {/* Echoes the orbit in the logo. Earned, not decorative: it only appears
          when both people are in. */}
      {both ? (
        <Animated.View style={[styles.orbit, { width, height: width }, orbitStyle]}>
          <Svg width={width} height={width}>
            <Circle cx={width * 0.9} cy={width * 0.24} r={4.5} fill={ORANGE_SOFT} />
          </Svg>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stage: { alignItems: 'center', justifyContent: 'center', width: '100%' },
  orbit: { position: 'absolute', alignItems: 'center', justifyContent: 'center' }
});
