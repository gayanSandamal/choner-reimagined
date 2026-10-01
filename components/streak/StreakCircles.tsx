import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { cadenceLabel } from '@/features/plans/cadence';
import { circleDay, circleLabel, streakScore } from '@/features/plans/streak';
import type { Streak, StreakCircle } from '@/features/plans/types';
import { theme } from '@/constants/theme';

// The streak: the only standing number on the Challenges tab.
//
// `target` circles, always exactly that many. A miss does not add one and a
// repair fills the circle it repairs, so the row never grows.
//
//   solid orange     done: both showed up (or it was made up)
//   marked outline   missed, day passed
//   orange outline   planned and still ahead
//   plain            not planned yet
//
// A circle is a SESSION and is labelled with its day. Nothing here resets,
// ever: a miss costs the circle and one session owed, never the streak.
export function StreakCircles({ streak }: { streak: Streak }) {
  if (!streak.target) return null;
  const score = streakScore(streak);
  const cadence = cadenceLabel(streak.cadence);

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <AppText style={styles.eyebrow}>YOUR STREAK</AppText>
        {score ? <AppText style={styles.score}>{score}</AppText> : null}
      </View>

      <View style={styles.row} accessibilityRole="list">
        {streak.circles.map((c, i) => (
          <Circle key={i} circle={c} index={i} />
        ))}
      </View>

      <AppText muted style={styles.foot}>
        {streak.complete
          ? `Streak complete. ${score} sessions.`
          : [`${streak.target} session streak`, cadence].filter(Boolean).join(' · ')}
      </AppText>

      {/* The heart: a different number from the streak, measuring a different
          thing. It is with THIS partner; the streak survives a partner change. */}
      {streak.with_partner > 0 ? (
        <AppText muted style={styles.foot}>
          {streak.with_partner} {streak.with_partner === 1 ? 'session' : 'sessions'} together
        </AppText>
      ) : null}
    </View>
  );
}

function Circle({ circle, index }: { circle: StreakCircle; index: number }) {
  const day = circleDay(circle);
  return (
    <View style={styles.cell} accessible accessibilityLabel={circleLabel(circle, index)}>
      <View
        style={[
          styles.circle,
          circle.state === 'done' && styles.done,
          circle.state === 'missed' && styles.missed,
          circle.state === 'planned' && styles.planned
        ]}
      >
        {circle.state === 'missed' ? <View style={styles.missMark} /> : null}
      </View>
      <AppText style={styles.day}>{day ?? ' '}</AppText>
    </View>
  );
}

const SIZE = 22;

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 10
  },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, color: theme.colors.muted },
  score: { fontSize: 17, color: theme.colors.text, fontFamily: theme.fonts.bodyBold },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  cell: { alignItems: 'center', width: SIZE + 8, gap: 2 },
  circle: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    borderWidth: 1.5,
    borderColor: '#D8D2CC',
    alignItems: 'center',
    justifyContent: 'center'
  },
  done: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  planned: { borderColor: theme.colors.primary },
  missed: { borderColor: theme.colors.muted, borderStyle: 'dashed' },
  // A short bar through a missed circle, so it reads as marked without colour.
  missMark: { width: SIZE - 10, height: 1.5, backgroundColor: theme.colors.muted },
  day: { fontSize: 9, color: theme.colors.muted, height: 12 },
  foot: { fontSize: 12 }
});
