import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { SegmentedToggle } from '@/components/ui/SegmentedToggle';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { Firepit } from '@/components/home/Firepit';
import { LogTaskItem } from '@/components/home/LogTaskItem';
import { useSession } from '@/providers/session-provider';
import { useDefaultChallenges, useCompleteTask, useStreak, useUndoTaskCheckin } from '@/features/challenges/hooks';
import { usePendingInvites } from '@/features/community/hooks';
import { useProfile } from '@/features/profile/hooks';
import { theme } from '@/constants/theme';
import { useTimeOfDay } from '@/lib/time-of-day';

type Mode = 'solo' | 'partner';

function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

type ChallengeTask = {
  id: string;
  title: string;
  due_window: string | null;
  task_type: string;
  task_checkins?: Array<{ id: string; completed_at: string | null }>;
};

function sortedTasks(challenge: any): ChallengeTask[] {
  const list = (challenge?.challenge_tasks ?? []) as ChallengeTask[];
  return [...list].sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));
}

export default function HomeScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const profileQ = useProfile(userId);
  const challengesQ = useDefaultChallenges(userId);
  const streakQ = useStreak(userId);
  const invitesQ = usePendingInvites(userId);
  const completeTask = useCompleteTask();
  const undoTask = useUndoTaskCheckin();
  const { gradient: skyGradient, isEvening, timeLeftLabel } = useTimeOfDay();

  const [mode, setMode] = useState<Mode>('solo');

  const soloChallenge = challengesQ.data?.solo ?? null;
  const partnerChallenge = challengesQ.data?.partner ?? null;
  const selected = mode === 'solo' ? soloChallenge : partnerChallenge;
  const isPartnerPending = mode === 'partner' && partnerChallenge?.status === 'pending';

  const waitingInvite = partnerChallenge
    ? (invitesQ.data ?? []).find((i: any) => i.user_challenge_id === partnerChallenge.id)
    : undefined;

  const tasks = useMemo(() => sortedTasks(selected), [selected]);

  const today = todayString();
  const todaysCheckinFor = (task: ChallengeTask) =>
    (task.task_checkins ?? []).find((c) => (c.completed_at ?? '').slice(0, 10) === today);

  const pendingTasks = tasks.filter((t) => !todaysCheckinFor(t));
  const burnedTasks = tasks.filter((t) => todaysCheckinFor(t));
  const completedToday = burnedTasks.length;

  const onFeedFire = (task: ChallengeTask) => {
    if (selected) {
      completeTask.mutate({ taskId: task.id, userChallengeId: selected.id });
    }
  };

  const onUndo = (task: ChallengeTask) => {
    const checkin = todaysCheckinFor(task);
    if (checkin) undoTask.mutate(checkin.id);
  };

  const refreshing = challengesQ.isRefetching || profileQ.isRefetching;
  const onRefresh = () => {
    challengesQ.refetch();
    streakQ.refetch();
    profileQ.refetch();
    invitesQ.refetch();
  };

  const firstName = profileQ.data?.full_name?.split(' ')[0];

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={skyGradient as unknown as readonly [string, string, ...string[]]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.safe}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        >
          <AppText variant="title">
            {greetingFor()}{firstName ? `, ${firstName}` : ''}
          </AppText>

          {challengesQ.isLoading ? (
            <LoadingState />
          ) : challengesQ.isError ? (
            <ErrorState message={(challengesQ.error as Error).message} onRetry={() => challengesQ.refetch()} />
          ) : !soloChallenge && !partnerChallenge ? (
            <EmptyState
              title="Ready when you are"
              body="Choner works best with two. Invite a partner to start your first challenge."
              actionLabel="Invite a partner"
              onAction={() => router.push('/group/invite')}
            />
          ) : (
            <>
              <SegmentedToggle<Mode>
                value={mode}
                onChange={setMode}
                options={[
                  { value: 'solo', label: 'Solo', icon: 'person-outline' },
                  { value: 'partner', label: 'Partner', icon: 'people-outline' }
                ]}
              />

              <Firepit
                streak={streakQ.data ?? 0}
                completedToday={isPartnerPending ? 0 : completedToday}
                totalTasks={isPartnerPending ? 0 : tasks.length}
                isEvening={isEvening}
                timeLeftLabel={timeLeftLabel}
                userName={profileQ.data?.full_name}
                userAvatarUri={profileQ.data?.avatar_url}
                waitingPartnerEmail={isPartnerPending ? (waitingInvite?.email ?? 'a partner') : undefined}
                aiPriority={
                  isPartnerPending || tasks.length === 0
                    ? undefined
                    : completedToday === 0
                    ? 'A small win now sets the day. Start with the easiest log.'
                    : completedToday < tasks.length
                    ? "You're moving. One more log protects your streak."
                    : 'Streak protected. Rest is part of recovery.'
                }
              />

              {isPartnerPending ? (
                <View style={styles.pendingBlock}>
                  <AppText variant="caption" muted style={styles.centerText}>
                    {waitingInvite
                      ? `Your shared fire lights the moment ${waitingInvite.email} joins.`
                      : 'Invite someone to keep this fire together — you hold each other to it.'}
                  </AppText>
                  <Button
                    label={waitingInvite ? 'Invite someone else' : 'Invite a partner'}
                    variant={waitingInvite ? 'ghost' : 'gradient'}
                    onPress={() => router.push('/group/invite')}
                  />
                </View>
              ) : tasks.length === 0 ? (
                <EmptyState title="No tasks set up yet" body="This challenge has no tasks — try restarting it from the challenge detail screen." />
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
                        <PressableScale key={task.id} style={styles.burnedChip} onPress={() => onUndo(task)} haptic="selection">
                          <Ionicons name="checkmark" size={12} color={theme.colors.success} />
                          <AppText variant="caption" style={{ color: theme.colors.muted, textDecorationLine: 'line-through' }}>
                            {task.title}
                          </AppText>
                        </PressableScale>
                      ))}
                    </View>
                  ) : null}
                </>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: theme.spacing(4), gap: theme.spacing(2) },
  centerText: { textAlign: 'center' },
  pendingBlock: { gap: theme.spacing(1.5), alignItems: 'stretch' },
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
