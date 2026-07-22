import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/StateViews';
import { Firepit } from '@/components/home/Firepit';
import { LogTaskItem } from '@/components/home/LogTaskItem';
import { useCompleteTask, useUndoTaskCheckin } from '@/features/challenges/hooks';
import { theme } from '@/constants/theme';

type Mode = 'solo' | 'partner';

type ChallengeTask = {
  id: string;
  title: string;
  due_window: string | null;
  task_type: string;
  task_checkins?: Array<{ id: string; completed_at: string | null }>;
};

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function sortedTasks(challenge: any): ChallengeTask[] {
  const list = (challenge?.challenge_tasks ?? []) as ChallengeTask[];
  return [...list].sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));
}

interface Props {
  mode: Mode;
  challenge: any;
  streak: number;
  isEvening: boolean;
  timeLeftLabel: string;
  userName?: string | null;
  userAvatarUri?: string | null;
  // Only meaningful for the partner card — the invite still awaiting a partner.
  waitingPartnerEmail?: string;
}

// One challenge's full block: the fire, its task-logging, and the pending state.
// Rendered once per track (solo + partner) so Home can show both without a toggle.
export function ChallengeCard({
  mode,
  challenge,
  streak,
  isEvening,
  timeLeftLabel,
  userName,
  userAvatarUri,
  waitingPartnerEmail
}: Props) {
  const completeTask = useCompleteTask();
  const undoTask = useUndoTaskCheckin();

  const isPending = mode === 'partner' && challenge?.status === 'pending';
  const tasks = useMemo(() => sortedTasks(challenge), [challenge]);

  const today = todayString();
  const todaysCheckinFor = (task: ChallengeTask) =>
    (task.task_checkins ?? []).find((c) => (c.completed_at ?? '').slice(0, 10) === today);

  const pendingTasks = tasks.filter((t) => !todaysCheckinFor(t));
  const burnedTasks = tasks.filter((t) => todaysCheckinFor(t));
  const completedToday = burnedTasks.length;

  const onFeedFire = (task: ChallengeTask) => {
    if (challenge) completeTask.mutate({ taskId: task.id, userChallengeId: challenge.id });
  };

  const onUndo = (task: ChallengeTask) => {
    const checkin = todaysCheckinFor(task);
    if (checkin) undoTask.mutate(checkin.id);
  };

  return (
    <View style={styles.card}>
      <Firepit
        mode={mode}
        streak={streak}
        completedToday={isPending ? 0 : completedToday}
        totalTasks={isPending ? 0 : tasks.length}
        isEvening={isEvening}
        timeLeftLabel={timeLeftLabel}
        userName={userName}
        userAvatarUri={userAvatarUri}
        waitingPartnerEmail={isPending ? (waitingPartnerEmail ?? 'a partner') : undefined}
        aiPriority={
          isPending || tasks.length === 0
            ? undefined
            : completedToday === 0
            ? 'A small win now sets the day. Start with the easiest log.'
            : completedToday < tasks.length
            ? "You're moving. One more log protects your streak."
            : 'Streak protected. Rest is part of recovery.'
        }
      />

      {isPending ? (
        <View style={styles.pendingBlock}>
          <AppText variant="caption" muted style={styles.centerText}>
            {waitingPartnerEmail
              ? `Your shared fire lights the moment ${waitingPartnerEmail} joins.`
              : 'Invite someone to keep this fire together — you hold each other to it.'}
          </AppText>
          <Button
            label={waitingPartnerEmail ? 'Invite someone else' : 'Invite a partner'}
            variant={waitingPartnerEmail ? 'ghost' : 'gradient'}
            onPress={() => router.push('/group/invite')}
          />
        </View>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No tasks set up yet"
          body="This challenge has no tasks — try restarting it from the challenge detail screen."
        />
      ) : (
        <>
          <View style={{ gap: theme.spacing(1) }}>
            {pendingTasks.map((task) => (
              <LogTaskItem
                key={task.id}
                title={task.title}
                taskType={task.task_type}
                dueWindow={task.due_window}
                onFeedFire={() => onFeedFire(task)}
              />
            ))}
          </View>

          {burnedTasks.length > 0 ? (
            <View style={styles.burnedRow}>
              {burnedTasks.map((task) => (
                <PressableScale
                  key={task.id}
                  style={styles.burnedChip}
                  onPress={() => onUndo(task)}
                  haptic="selection"
                >
                  <Ionicons name="checkmark" size={12} color={theme.colors.success} />
                  <AppText
                    variant="caption"
                    style={{ color: theme.colors.muted, textDecorationLine: 'line-through' }}
                  >
                    {task.title}
                  </AppText>
                </PressableScale>
              ))}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: theme.spacing(2),
    gap: theme.spacing(1.5)
  },
  pendingBlock: { gap: theme.spacing(1.5), alignItems: 'stretch' },
  centerText: { textAlign: 'center' },
  burnedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  burnedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.chip,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6
  }
});
