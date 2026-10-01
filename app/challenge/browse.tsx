import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { IconName } from '@/components/ui/Icon';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { LoadingState, ErrorState } from '@/components/ui/StateViews';
import { OptionCard } from '@/components/onboarding/OptionCard';
import { ExercisePicker } from '@/components/challenges/ExercisePicker';
import {
  useChallengeTemplates,
  useMyChallenge,
  useSetMyChallengeHabit
} from '@/features/challenges/hooks';
import { getMyChallenge, partnerStateOf, setChallengeExercises } from '@/features/challenges/api';
import { ACTIVITY_SLUGS, WORKOUTS_SLUG } from '@/features/onboarding/mappings';
import { useSession } from '@/providers/session-provider';
import { useQueryClient } from '@tanstack/react-query';
import { theme } from '@/constants/theme';
import { notify } from '@/lib/alert';

const ACTIVITY_ICONS: Record<string, IconName> = {
  running: 'run',
  jogging: 'run',
  walking: 'walk',
  cycling: 'bike',
  yoga: 'leaf',
  home_workouts: 'dumb'
};

// Create a commitment, and change it.
//
// This screen asks THE ACTIVITY, AND NOTHING ELSE. Not how much, not how
// often: those are agreed with a partner at the first plan, and asking here
// would ask the same question twice. Workouts also asks for up to four
// exercises, because they are part of WHAT the activity is rather than a
// negotiation. They are descriptive and never reach matching.
//
// One screen for both jobs, because they are the same question. With no
// challenge it creates one; with a challenge it changes the activity, which is
// allowed until a search starts and locked from then on.
export default function CreateCommitmentScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const qc = useQueryClient();
  const templatesQ = useChallengeTemplates();
  const challengeQ = useMyChallenge(userId);
  const applyHabit = useSetMyChallengeHabit();

  const challenge = challengeQ.data ?? null;
  const editing = Boolean(challenge);
  // Anything but solo: searching, invited, matched or partnered.
  const locked = editing && partnerStateOf(challenge) !== 'solo';

  // The six, in their standard order, whatever order the query returned.
  const activities = useMemo(() => {
    const bySlug = new Map((templatesQ.data ?? []).map((t: any) => [t.slug, t]));
    return ACTIVITY_SLUGS.map((slug) => bySlug.get(slug)).filter(Boolean) as any[];
  }, [templatesQ.data]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exercises, setExercises] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Start from what they already have. Once, so a refetch cannot undo a tap.
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (seeded || challengeQ.isLoading) return;
    if (challenge) {
      setSelectedId(challenge.challenge_template_id ?? null);
      setExercises(((challenge as any).exercises as string[] | null) ?? []);
    }
    setSeeded(true);
  }, [seeded, challengeQ.isLoading, challenge]);

  const selected = activities.find((t) => t.id === selectedId);
  const isWorkouts = selected?.slug === WORKOUTS_SLUG;
  // On a retired habit the current template is not one of the six, so nothing
  // is preselected and any pick is a change.
  const unchanged =
    editing &&
    selectedId === challenge?.challenge_template_id &&
    (!isWorkouts ||
      JSON.stringify(exercises) === JSON.stringify(((challenge as any).exercises as string[] | null) ?? []));

  const onSave = async () => {
    if (!userId || !selected || locked) return;
    try {
      setSaving(true);
      await applyHabit.mutateAsync({ userId, templateId: selected.id, customHabitTitle: null });
      if (isWorkouts) {
        // Read the id back: creating does not return it.
        const mine = await getMyChallenge(userId);
        if (mine?.id) await setChallengeExercises(mine.id, exercises);
      }
      await qc.invalidateQueries({ queryKey: ['my-challenge'] });
      // Creating a commitment is a setup action, and setup actions finish on
      // Home, the same way onboarding does. Changing one goes back where it
      // was opened from.
      if (editing && router.canGoBack()) router.back();
      else router.replace('/(tabs)/home');
    } catch (error: any) {
      notify(editing ? 'Could not change that' : 'Could not create that', error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll={false}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          title={editing ? 'Change your activity' : 'Create a commitment'}
          onBack={() => router.back()}
        />

        <AppText muted>
          {locked
            ? "Locked while you're looking for a match."
            : 'Pick what you will do. How much and how often are agreed with your partner, at your first plan.'}
        </AppText>

        {templatesQ.isLoading || challengeQ.isLoading ? (
          <LoadingState />
        ) : templatesQ.isError ? (
          <ErrorState
            icon="flash-off-outline"
            title="Activities are catching their breath"
            message={(templatesQ.error as Error).message}
            onRetry={() => templatesQ.refetch()}
          />
        ) : (
          <View style={[styles.options, locked && styles.locked]} pointerEvents={locked ? 'none' : 'auto'}>
            {activities.map((t) => (
              <OptionCard
                key={t.id}
                icon={ACTIVITY_ICONS[t.activity_key] ?? 'target'}
                label={t.title}
                description={t.summary}
                selected={selectedId === t.id}
                onPress={() => setSelectedId(t.id)}
              />
            ))}
            {isWorkouts ? <ExercisePicker value={exercises} onChange={setExercises} /> : null}
          </View>
        )}

        {locked ? null : (
          <>
            <Button
              label={editing ? 'Save' : 'Create'}
              disabled={!selected || unchanged}
              loading={saving}
              onPress={onSave}
            />
            <AppText muted style={styles.note}>
              You can change this until you start searching for a match.
            </AppText>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { gap: theme.spacing(2), paddingBottom: theme.spacing(4) },
  options: { gap: theme.spacing(1.5) },
  locked: { opacity: 0.5 },
  note: { fontSize: 12, textAlign: 'center' }
});
