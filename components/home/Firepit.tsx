import { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Path, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { theme } from '@/constants/theme';
import { useReduceMotion } from '@/lib/motion';
import { haptics } from '@/lib/haptics';

const SCENE_H = 190;
const FLAME_W = 84;
const FLAME_H = 116;

type FireMode = 'solo' | 'partner';

interface FirepitProps {
  streak: number;
  completedToday: number;
  totalTasks: number;
  isEvening: boolean;
  timeLeftLabel: string;
  aiPriority?: string;
  userName?: string | null;
  userAvatarUri?: string | null;
  waitingPartnerEmail?: string;
  // When set, the header shows a Solo/Partner badge and the seats around the
  // fire reflect the mode (one seat for solo, two for partner).
  mode?: FireMode;
  partnerName?: string | null;
  partnerAvatarUri?: string | null;
}

// Static flame shape — a teardrop with a lighter inner core. All motion is
// applied by the wrapping Animated.View's transform, so nothing here depends
// on animating SVG props (which render unreliably across platforms).
function FlameShape() {
  return (
    <Svg width={FLAME_W} height={FLAME_H} viewBox="0 0 84 116">
      <Defs>
        <SvgGradient id="flameBody" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FF4E81" />
          <Stop offset="0.55" stopColor="#FF8A1F" />
          <Stop offset="1" stopColor="#FFB566" />
        </SvgGradient>
        <SvgGradient id="flameCore" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFD2A2" />
          <Stop offset="1" stopColor="#FFF3E0" />
        </SvgGradient>
      </Defs>
      <Path
        d="M42 6 C62 42 74 58 74 82 A32 32 0 0 1 10 82 C10 58 22 42 42 6 Z"
        fill="url(#flameBody)"
      />
      <Path
        d="M42 48 C53 66 57 74 57 86 A15 15 0 0 1 27 86 C27 74 31 66 42 48 Z"
        fill="url(#flameCore)"
      />
    </Svg>
  );
}

function Flame({ intensity, celebrateKey }: { intensity: number; celebrateKey: number }) {
  const reduceMotion = useReduceMotion();
  const grow = useSharedValue(intensity);
  const flicker = useSharedValue(0);
  const pop = useSharedValue(0);

  useEffect(() => {
    grow.value = reduceMotion ? intensity : withSpring(intensity, theme.motion.spring.gentle);
  }, [intensity, reduceMotion]);

  useEffect(() => {
    if (reduceMotion) return;
    flicker.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 520, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 520, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [reduceMotion]);

  useEffect(() => {
    if (celebrateKey === 0 || reduceMotion) return;
    pop.value = withSequence(
      withTiming(1, { duration: 180, easing: Easing.out(Easing.back(2)) }),
      withTiming(0, { duration: 260 })
    );
  }, [celebrateKey, reduceMotion]);

  const style = useAnimatedStyle(() => {
    const scale = 0.45 + grow.value * 0.75 + pop.value * 0.12;
    const flick = flicker.value * 0.06 * grow.value;
    return {
      opacity: 0.5 + grow.value * 0.5,
      transform: [
        { translateY: -grow.value * 8 },
        { scaleX: scale + flick * 0.4 },
        { scaleY: scale + flick }
      ]
    };
  });

  const glowStyle = useAnimatedStyle(() => ({
    opacity: 0.12 + grow.value * 0.4,
    transform: [{ scale: 0.7 + grow.value * 0.6 + pop.value * 0.2 }]
  }));

  return (
    <>
      <Animated.View style={[styles.glow, glowStyle]} pointerEvents="none" />
      <Animated.View style={[styles.flameWrap, style]} pointerEvents="none">
        <FlameShape />
      </Animated.View>
    </>
  );
}

function SmokeWisp() {
  const reduceMotion = useReduceMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    t.value = withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.ease) }), -1, false);
  }, [reduceMotion]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.28 * (1 - t.value),
    transform: [{ translateY: -t.value * 34 }, { translateX: t.value * 8 }, { scale: 0.6 + t.value * 0.8 }]
  }));

  return <Animated.View style={[styles.smoke, style]} pointerEvents="none" />;
}

function statusLine({
  completedToday,
  totalTasks,
  isEvening,
  timeLeftLabel
}: {
  completedToday: number;
  totalTasks: number;
  isEvening: boolean;
  timeLeftLabel: string;
}) {
  if (totalTasks === 0) return 'Add your first log to light it up';
  if (completedToday >= totalTasks) return "Fire's roaring. Well done today.";
  if (completedToday === 0 && isEvening) return `The fire's going out — ${timeLeftLabel}`;
  if (completedToday === 0) return 'Add your first log to light it up';
  const remaining = totalTasks - completedToday;
  if (isEvening) return `${remaining} more log${remaining === 1 ? '' : 's'} — ${timeLeftLabel}`;
  return `${completedToday}/${totalTasks} logs placed`;
}

function ModeBadge({
  mode,
  partnerName,
  pending
}: {
  mode: FireMode;
  partnerName?: string | null;
  pending?: boolean;
}) {
  const isSolo = mode === 'solo';
  const sub = isSolo
    ? 'just you'
    : pending
    ? 'pending'
    : partnerName
    ? `with ${partnerName}`
    : 'with your partner';
  return (
    <View style={styles.modeBadge}>
      <Ionicons
        name={isSolo ? 'person-outline' : 'people-outline'}
        size={13}
        color={theme.colors.primary2}
      />
      <AppText variant="caption" style={{ color: theme.colors.text, fontFamily: theme.fonts.bodyBold }}>
        {isSolo ? 'Solo' : 'Partner'}
      </AppText>
      <AppText variant="caption" style={{ color: theme.colors.secondary }}>
        {`· ${sub}`}
      </AppText>
    </View>
  );
}

export function Firepit({
  streak,
  completedToday,
  totalTasks,
  isEvening,
  timeLeftLabel,
  aiPriority,
  userName,
  userAvatarUri,
  waitingPartnerEmail,
  mode,
  partnerName,
  partnerAvatarUri
}: FirepitProps) {
  const [width, setWidth] = useState(0);
  const fraction = totalTasks === 0 ? 0 : completedToday / totalTasks;
  const intensity = completedToday === 0 ? (isEvening ? 0.08 : 0.22) : fraction;
  const isRoaring = totalTasks > 0 && completedToday >= totalTasks;
  const isEmber = intensity < 0.12;

  const [celebrateKey, setCelebrateKey] = useState(0);
  const wasRoaring = useRef(false);
  useEffect(() => {
    if (isRoaring && !wasRoaring.current) {
      setCelebrateKey((k) => k + 1);
      haptics.success();
    }
    wasRoaring.current = isRoaring;
  }, [isRoaring]);

  const litStones = Math.min(streak, 7);
  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        {mode ? (
          <ModeBadge mode={mode} partnerName={partnerName} pending={Boolean(waitingPartnerEmail)} />
        ) : (
          <AppText variant="label" style={{ color: theme.colors.primary2 }}>
            {streak > 0 ? `Day ${streak}` : 'The fire'}
          </AppText>
        )}
        {streak > 0 ? (
          <View style={styles.streakPill}>
            <Ionicons name="flame" size={12} color={theme.colors.ember} />
            <AppText variant="caption" style={{ color: theme.colors.text }}>
              {streak}-day streak
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.scene} onLayout={onLayout}>
        {width > 0 ? (
          <>
            <Flame intensity={intensity} celebrateKey={celebrateKey} />
            {isEmber ? <SmokeWisp /> : null}

            {/* Logs sit in front of the flame base so it appears to rise from them. */}
            <View style={[styles.log, styles.logBack]} />
            <View style={[styles.log, styles.logFront]} />

            <View style={[styles.seat, mode === 'solo' ? { left: width * 0.5 - 20 } : { left: width * 0.16 }]}>
              <Avatar name={userName} uri={userAvatarUri} size={40} ring={isRoaring} />
            </View>

            {mode === 'partner' ? (
              <View style={[styles.seat, { right: width * 0.16 }]}>
                {waitingPartnerEmail ? (
                  <View style={styles.ghostSeat}>
                    <Ionicons name="add" size={18} color={theme.colors.muted} />
                  </View>
                ) : partnerName || partnerAvatarUri ? (
                  <Avatar name={partnerName} uri={partnerAvatarUri} size={40} ring={isRoaring} />
                ) : (
                  <View style={styles.partnerSeat}>
                    <Ionicons name="person" size={20} color={theme.colors.accent} />
                  </View>
                )}
              </View>
            ) : waitingPartnerEmail ? (
              <View style={[styles.seat, { right: width * 0.16 }]}>
                <View style={styles.ghostSeat}>
                  <Ionicons name="add" size={18} color={theme.colors.muted} />
                </View>
              </View>
            ) : null}
          </>
        ) : null}
      </View>

      {waitingPartnerEmail ? (
        <AppText variant="caption" muted style={styles.centerText}>
          Waiting for {waitingPartnerEmail} to pull up a seat
        </AppText>
      ) : null}

      <AppText variant="subtitle" style={styles.centerText}>
        {statusLine({ completedToday, totalTasks, isEvening, timeLeftLabel })}
      </AppText>

      {totalTasks > 0 ? (
        <View style={styles.stonesRow}>
          {Array.from({ length: 7 }).map((_, i) => (
            <View key={i} style={[styles.stone, i < litStones ? styles.stoneLit : styles.stoneUnlit]} />
          ))}
        </View>
      ) : null}

      {aiPriority ? (
        <View style={styles.aiRow}>
          <Ionicons name="sparkles" size={14} color={theme.colors.primary2} />
          <AppText variant="caption" style={{ flex: 1, color: theme.colors.text }}>
            {aiPriority}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing(1.5), paddingVertical: theme.spacing(1) },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.chip,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start'
  },
  partnerSeat: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.surface3,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  streakPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.chip,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3
  },
  scene: { height: SCENE_H, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  glow: {
    position: 'absolute',
    bottom: 24,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: theme.colors.ember
  },
  flameWrap: {
    position: 'absolute',
    bottom: 44,
    width: FLAME_W,
    height: FLAME_H,
    alignItems: 'center',
    justifyContent: 'flex-end'
  },
  smoke: {
    position: 'absolute',
    bottom: 120,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.smoke
  },
  log: {
    position: 'absolute',
    bottom: 40,
    width: 66,
    height: 12,
    borderRadius: 6
  },
  logBack: { backgroundColor: theme.colors.logDark, transform: [{ rotate: '-9deg' }] },
  logFront: { backgroundColor: theme.colors.log, transform: [{ rotate: '11deg' }] },
  seat: { position: 'absolute', bottom: 8 },
  ghostSeat: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center'
  },
  centerText: { textAlign: 'center' },
  stonesRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  stone: { width: 8, height: 8, borderRadius: 4 },
  stoneLit: { backgroundColor: theme.colors.secondary },
  stoneUnlit: { backgroundColor: theme.colors.surface3 },
  aiRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 }
});
