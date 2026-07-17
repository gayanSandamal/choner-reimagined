import { useMemo } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { HeroCard } from '@/components/home/HeroCard';
import { ChallengeTaskItem } from '@/components/challenges/ChallengeTaskItem';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { useSession } from '@/providers/session-provider';
import { useActiveChallenge, useCompleteTask, useStreak, useUndoTaskCheckin } from '@/features/challenges/hooks';
import { usePendingInvites } from '@/features/community/hooks';
import { useProfile } from '@/features/profile/hooks';
import { theme } from '@/constants/theme';

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

export default function HomeScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const profileQ = useProfile(userId);
  const activeQ = useActiveChallenge(userId);
  const streakQ = useStreak(userId);
  const invitesQ = usePendingInvites(userId);
  const completeTask = useCompleteTask();
  const undoTask = useUndoTaskCheckin();

  // Newest pending invite for the active partner challenge — home keeps
  // the challenge visually alive while the partner hasn't joined yet.
  const waitingInvite =
    (activeQ.data as any)?.accountability_mode === 'partner'
      ? (invitesQ.data ?? []).find((i: any) => i.user_challenge_id === (activeQ.data as any).id)
      : undefined;

  const tasks = useMemo(() => {
    const challenge = activeQ.data as any;
    const list = (challenge?.challenge_tasks ?? []) as Array<{
      id: string;
      title: string;
      due_window: string | null;
      task_type: string;
      task_checkins?: Array<{ id: string; completed_at: string | null }>;
    }>;
    return [...list].sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));
  }, [activeQ.data]);

  const today = todayString();
  const todaysCheckinFor = (task: (typeof tasks)[number]) =>
    (task.task_checkins ?? []).find((c) => (c.completed_at ?? '').slice(0, 10) === today);

  const completedToday = tasks.filter((t) => todaysCheckinFor(t)).length;
  const progressPct = tasks.length === 0 ? 0 : Math.round((completedToday / tasks.length) * 100);

  const onToggleTask = (task: (typeof tasks)[number]) => {
    const checkin = todaysCheckinFor(task);
    if (checkin) {
      undoTask.mutate(checkin.id);
    } else if (activeQ.data) {
      completeTask.mutate({ taskId: task.id, userChallengeId: (activeQ.data as any).id });
    }
  };

  const refreshing = activeQ.isRefetching || profileQ.isRefetching;
  const onRefresh = () => {
    activeQ.refetch();
    streakQ.refetch();
    profileQ.refetch();
  };

  return (
    <Screen scroll={false}>
      <ScrollView
        contentContainerStyle={{ gap: theme.spacing(2), paddingBottom: theme.spacing(4) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <View style={{ gap: 6 }}>
          <AppText variant="caption" muted>{greetingFor()}</AppText>
          <AppText variant="title">
            {streakQ.data && streakQ.data > 0
              ? `You're on a ${streakQ.data}-day streak`
              : 'Let’s build your momentum'}
          </AppText>
          {profileQ.data?.full_name ? (
            <AppText muted>Welcome back, {profileQ.data.full_name.split(' ')[0]}.</AppText>
          ) : null}
        </View>

        {activeQ.isLoading ? (
          <LoadingState />
        ) : activeQ.isError ? (
          <ErrorState message={(activeQ.error as Error).message} onRetry={() => activeQ.refetch()} />
        ) : !activeQ.data ? (
          <EmptyState
            title="Ready when you are"
            body="Choner works best with two. Invite a partner to start your first challenge."
            actionLabel="Invite a partner"
            onAction={() => router.push('/group/invite')}
          />
        ) : (
          <>
            {waitingInvite ? (
              <Card variant="glow">
                <AppText variant="subtitle">Waiting for {waitingInvite.email} to join</AppText>
                <AppText variant="caption" muted>
                  Your challenge starts the moment they're in.
                </AppText>
              </Card>
            ) : null}
            <HeroCard
              title={(activeQ.data as any).challenge_templates?.title ?? 'Your challenge'}
              subtitle={`${completedToday}/${tasks.length} tasks done today`}
              progress={progressPct}
              streak={streakQ.data ?? 0}
              aiPriority={
                completedToday === 0
                  ? 'A small win now sets the day. Start with the easiest task.'
                  : completedToday < tasks.length
                  ? 'You\'re moving. One more check-in protects your streak.'
                  : 'Streak protected. Rest is part of recovery.'
              }
            />

            <SectionHeader title="Today's tasks" subtitle="The minimum actions that keep your streak alive" />
            {tasks.length === 0 ? (
              <EmptyState title="No tasks set up yet" body="Your challenge has no tasks — try restarting it from the challenge detail screen." />
            ) : (
              tasks.map((task) => (
                <ChallengeTaskItem
                  key={task.id}
                  title={task.title}
                  meta={`${task.task_type} • ${task.due_window ?? 'anytime'}`}
                  completed={Boolean(todaysCheckinFor(task))}
                  onPress={() => onToggleTask(task)}
                />
              ))
            )}
          </>
        )}

        <Card>
          <AppText variant="label">Quick actions</AppText>
          <View style={{ gap: theme.spacing(1), marginTop: theme.spacing(1) }}>
            <AppText onPress={() => router.push('/modals/ai-coach')}>• Open AI coach</AppText>
            <AppText onPress={() => router.push('/modals/notifications')}>• Review notifications</AppText>
            <AppText onPress={() => router.push('/modals/premium')}>• See premium plan</AppText>
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}
