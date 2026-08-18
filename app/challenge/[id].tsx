import { useMemo } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { Alert, ScrollView, View } from 'react-native';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { ChallengeTaskItem } from '@/components/challenges/ChallengeTaskItem';
import { LoadingState, ErrorState } from '@/components/ui/StateViews';
import { useSession } from '@/providers/session-provider';
import {
  useMyChallenge,
  useChallengeTemplate,
  useCompleteTask,
  useUndoTaskCheckin,
  useStartChallenge,
  useAbandonChallenge,
} from '@/features/challenges/hooks';
import { useIsPremium } from '@/features/billing/hooks';
import { captureProofPhoto, resolveProofType } from '@/features/challenges/capture';
import { features } from '@/constants/features';
import { theme } from '@/constants/theme';

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export default function ChallengeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const userId = session?.user.id;

  const templateQ = useChallengeTemplate(id);
  const activeQ = useMyChallenge(userId);
  const { isPremium } = useIsPremium();

  const startMut = useStartChallenge();
  const abandonMut = useAbandonChallenge();
  const completeMut = useCompleteTask();
  const undoMut = useUndoTaskCheckin();

  // Is the user's active challenge for this template?
  const activeChallenge = activeQ.data as any;
  const isActiveForThisTemplate =
    activeChallenge?.challenge_template_id === id || activeChallenge?.challenge_templates?.id === id;

  const tasks = useMemo(() => {
    if (!isActiveForThisTemplate) return [];
    return ((activeChallenge?.challenge_tasks ?? []) as any[]).sort(
      (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
    );
  }, [activeChallenge, isActiveForThisTemplate]);

  const today = todayString();
  const checkinFor = (task: any) =>
    (task.task_checkins ?? []).find((c: any) => (c.completed_at ?? '').slice(0, 10) === today);

  const onStart = () => {
    if (!userId || !id) return;
    if (features.pro && templateQ.data?.is_premium && !isPremium) {
      Alert.alert('Premium challenge', 'Upgrade to unlock this challenge.', [
        { text: 'Cancel' },
        { text: 'See plans', onPress: () => router.push('/modals/premium') },
      ]);
      return;
    }
    if (activeChallenge && !isActiveForThisTemplate) {
      Alert.alert(
        'You have an active challenge',
        'Starting a new one will abandon your current challenge. Continue?',
        [
          { text: 'Cancel' },
          {
            text: 'Replace it',
            style: 'destructive',
            onPress: async () => {
              await abandonMut.mutateAsync(activeChallenge.id);
              startMut.mutate({
                userId,
                templateId: id,
                accountabilityMode: 'solo',
              });
            },
          },
        ]
      );
      return;
    }
    startMut.mutate({ userId, templateId: id, accountabilityMode: 'solo' });
  };

  const onAbandon = () => {
    if (!activeChallenge) return;
    Alert.alert('End this challenge?', 'Your progress will be saved in history.', [
      { text: 'Keep going' },
      {
        text: 'End challenge',
        style: 'destructive',
        onPress: () => abandonMut.mutate(activeChallenge.id),
      },
    ]);
  };

  if (templateQ.isLoading) {
    return (
      <Screen>
        <ScreenHeader title="Challenge" onBack={() => router.back()} />
        <LoadingState />
      </Screen>
    );
  }
  if (templateQ.isError || !templateQ.data) {
    return (
      <Screen>
        <ScreenHeader title="Challenge" onBack={() => router.back()} />
        <ErrorState message={(templateQ.error as Error)?.message} onRetry={() => templateQ.refetch()} />
      </Screen>
    );
  }

  const t = templateQ.data;

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={{ gap: theme.spacing(2), paddingBottom: theme.spacing(4) }}>
        <ScreenHeader title={t.title} onBack={() => router.back()} />

        <Card style={{ marginTop: theme.spacing(1), gap: theme.spacing(1) }}>
          <AppText muted>{t.description ?? (t as any).summary ?? ''}</AppText>
          <AppText variant="caption" muted>
            {t.duration_days} days • {t.difficulty}
            {t.is_premium ? ' • Premium' : ''}
          </AppText>
        </Card>

        {isActiveForThisTemplate ? (
          <>
            <View style={{ marginTop: theme.spacing(2), marginBottom: theme.spacing(1) }}>
              <AppText variant="label" muted style={{ paddingLeft: theme.spacing(1) }}>Today's tasks</AppText>
            </View>
            {tasks.length === 0 ? (
              <Card><AppText muted>No tasks for this challenge yet.</AppText></Card>
            ) : (
              tasks.map((task) => {
                const checkin = checkinFor(task);
                return (
                  <ChallengeTaskItem
                    key={task.id}
                    title={task.title}
                    meta={`${task.task_type} • ${task.due_window ?? 'anytime'}`}
                    completed={Boolean(checkin)}
                    onPress={async () => {
                      if (checkin) {
                        undoMut.mutate({ checkinId: checkin.id, photoPath: checkin.photo_path });
                        return;
                      }
                      if (!userId) return;
                      let photoBase64: string | undefined;
                      if (resolveProofType(task, activeChallenge) === 'photo') {
                        const shot = await captureProofPhoto();
                        if (shot.status === 'cancelled') return;
                        if (shot.status === 'captured') photoBase64 = shot.base64;
                      }
                      completeMut.mutate({
                        taskId: task.id,
                        userChallengeId: activeChallenge.id,
                        userId,
                        photoBase64
                      });
                    }}
                  />
                );
              })
            )}
            <Button label="End this challenge" variant="ghost" onPress={onAbandon} />
          </>
        ) : (
          <Button
            label={startMut.isPending ? 'Starting...' : 'Start this challenge'}
            onPress={onStart}
            disabled={startMut.isPending}
          />
        )}
      </ScrollView>
    </Screen>
  );
}
