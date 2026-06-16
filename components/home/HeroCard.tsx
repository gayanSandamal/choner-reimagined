import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Badge } from '@/components/ui/Badge';
import { theme } from '@/constants/theme';
import { useReduceMotion } from '@/lib/motion';

interface HeroCardProps {
  title: string;
  subtitle?: string;
  progress: number;
  aiPriority?: string;
  streak?: number;
}

function FlamePulse({ streak }: { streak: number }) {
  const reduceMotion = useReduceMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) return;
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [reduceMotion]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + t.value * 0.12 }, { rotate: `${(t.value - 0.5) * 6}deg` }]
  }));

  return (
    <View style={styles.streakRow}>
      <Animated.View style={[styles.flame, style]}>
        <LinearGradient
          colors={['#FFB566', '#FF4E81']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Ionicons name="flame" size={16} color="#FFF" />
      </Animated.View>
      <AppText style={styles.streakText}>
        {streak}-day streak
      </AppText>
    </View>
  );
}

export function HeroCard({ title, subtitle, progress, aiPriority, streak }: HeroCardProps) {
  return (
    <Card variant="glow" style={styles.card}>
      <Animated.View entering={FadeIn.duration(280)} style={styles.row}>
        <View style={styles.left}>
          <AppText variant="label" style={{ color: theme.colors.primary2 }}>
            Today
          </AppText>
          <AppText variant="title" style={{ marginTop: 4 }}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText muted variant="caption" style={{ marginTop: 4 }}>
              {subtitle}
            </AppText>
          ) : null}
          {streak && streak >= 1 ? <FlamePulse streak={streak} /> : null}
        </View>
        <ProgressRing progress={progress} label="Done" size={112} strokeWidth={12} />
      </Animated.View>

      {aiPriority ? (
        <Animated.View
          entering={FadeInDown.delay(120).duration(320)}
          style={styles.aiBox}
        >
          <LinearGradient
            colors={['rgba(255,138,31,0.16)', 'rgba(124,92,255,0.12)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.aiHeader}>
            <Badge label="AI" variant="gradient" gradient="paywall" />
            <AppText variant="label" style={{ color: theme.colors.primary2 }}>
              Today's focus
            </AppText>
          </View>
          <AppText style={{ marginTop: 6 }}>{aiPriority}</AppText>
        </Animated.View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: theme.spacing(2) },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: theme.spacing(1) },
  left: { flex: 1, gap: 2 },
  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  flame: {
    width: 26,
    height: 26,
    borderRadius: 13,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center'
  },
  streakText: {
    fontFamily: theme.fonts.bodyBold,
    color: theme.colors.text,
    fontSize: 13,
    letterSpacing: 0.3
  },
  aiBox: {
    borderRadius: theme.radius.md,
    padding: theme.spacing(2),
    borderWidth: 1,
    borderColor: theme.colors.glassBorder,
    overflow: 'hidden'
  },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 }
});
