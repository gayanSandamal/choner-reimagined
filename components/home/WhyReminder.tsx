import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { useReflections } from '@/features/challenges/hooks';
import { challengeDayIndex, dailyReminder, isAtRisk } from '@/features/challenges/why-rotation';
import { theme } from '@/constants/theme';

interface Props {
  userId: string | undefined;
  // The user's own track, read only for its start date and today's check-ins.
  challenge: any | null;
  // profiles.daily_deadline, 'HH:MM:SS'.
  dailyDeadline?: string | null;
}

function loggedToday(challenge: any): boolean {
  const today = new Date().toISOString().slice(0, 10);
  const tasks = (challenge?.challenge_tasks ?? []) as Array<{
    task_checkins?: Array<{ completed_at: string | null }>;
  }>;
  return tasks.some((t) =>
    (t.task_checkins ?? []).some((c) => (c.completed_at ?? '').slice(0, 10) === today)
  );
}

function deadlineHourFrom(deadline?: string | null): number | null {
  if (!deadline) return null;
  const hour = Number(deadline.slice(0, 2));
  return Number.isFinite(hour) ? hour : null;
}

// Step 5 — one of the user's own "Why" answers, rotated daily.
//
// Rendered once per user rather than once per track: this is personal
// motivation, not a property of either half of the heart, and seeing the same
// line twice on one screen would undo the point of rotating it.
export function WhyReminder({ userId, challenge, dailyDeadline }: Props) {
  const reflectionsQ = useReflections(userId);

  const line = useMemo(() => {
    const answers = reflectionsQ.data ?? [];
    if (!answers.length) return null;
    return dailyReminder({
      dayIndex: challengeDayIndex(challenge?.started_at),
      atRisk: isAtRisk({
        completedToday: loggedToday(challenge),
        deadlineHour: deadlineHourFrom(dailyDeadline)
      }),
      answers
    });
  }, [reflectionsQ.data, challenge, dailyDeadline]);

  // Nothing to say yet while the answers load — better a beat of silence than
  // a prompt that flashes and is replaced by the user's own words.
  if (reflectionsQ.isLoading) return null;

  const empty = !line;

  return (
    <PressableScale
      onPress={() => router.push('/modals/edit-why')}
      scaleTo="subtle"
      haptic="selection"
      accessibilityRole="button"
      accessibilityLabel={empty ? 'Add your why' : `Your why: ${line}. Tap to edit.`}
    >
      <View style={styles.card}>
        <Ionicons
          name={empty ? 'add-circle-outline' : 'heart-outline'}
          size={16}
          color={theme.colors.primary2}
        />
        <AppText variant="caption" style={[styles.line, empty && styles.prompt]}>
          {empty ? "Add why you're doing this" : line}
        </AppText>
        <Ionicons name="chevron-forward" size={14} color={theme.colors.muted} />
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1),
    paddingHorizontal: theme.spacing(2),
    paddingVertical: theme.spacing(1.5),
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface
  },
  // No `flex: 0` anywhere here — it collapses to zero height on RN web.
  line: { flex: 1, color: theme.colors.text },
  prompt: { color: theme.colors.muted }
});
