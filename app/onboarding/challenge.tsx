import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { IconName } from '@/components/ui/Icon';
import { OptionCard } from '@/components/onboarding/OptionCard';
import { LoadingState, ErrorState } from '@/components/ui/StateViews';
import { useOnboarding } from '@/features/onboarding/context';
import { useIsInvitee } from '@/features/onboarding/invitee';
import { challengeOptionSlugs, goalToTemplateSlug } from '@/features/onboarding/mappings';
import { useChallengeTemplates, useSetMyChallengeHabit } from '@/features/challenges/hooks';
import { useSession } from '@/providers/session-provider';
import { theme } from '@/constants/theme';
import { notify } from '@/lib/alert';

const CATEGORY_ICONS: Record<string, IconName> = {
  movement: 'run',
  sleep: 'sleep',
  stress: 'leaf',
  energy: 'bolt'
};

export default function ChallengeScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { goal, setChosenChallenge } = useOnboarding();
  const templatesQ = useChallengeTemplates();
  const applyHabit = useSetMyChallengeHabit();
  const { isInvitee, resolving } = useIsInvitee(userId);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  // The habit is locked and shared, so an invitee never picks one — they go
  // straight to their own reflection.
  useEffect(() => {
    if (isInvitee) router.replace('/challenge/why');
  }, [isInvitee]);

  const recommendedSlug = goalToTemplateSlug(goal);

  const options = useMemo(() => {
    const all = templatesQ.data ?? [];
    const bySlug = new Map(all.map((t: any) => [t.slug, t]));
    const curated = challengeOptionSlugs(goal)
      .map((slug) => bySlug.get(slug))
      .filter(Boolean);
    // A database that hasn't been seeded yet must still offer something
    // rather than an empty screen.
    return curated.length ? curated : all;
  }, [templatesQ.data, goal]);

  const onContinue = async () => {
    if (!userId || !selectedId) return;
    try {
      const template = options.find((t: any) => t.id === selectedId);
      if (!template) return;
      await applyHabit.mutateAsync({
        userId,
        templateId: template.id,
        customHabitTitle: null
      });
      setChosenChallenge({
        templateId: template.id,
        title: template.title,
        customTitle: null
      });
      router.push('/onboarding/partner');
    } catch (error: any) {
      notify('Could not set your challenge', error.message);
    }
  };

  // Hold the frame while we find out, rather than showing a habit picker to
  // someone who was invited into a habit already.
  if (resolving || isInvitee) {
    return (
      <SafeAreaView style={styles.root}>
        <LoadingState label="Setting up your challenge…" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <AppText variant="label" muted>
          Your first challenge
        </AppText>
        <AppText variant="title">Pick what you'll start with</AppText>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {templatesQ.isLoading ? (
          <LoadingState />
        ) : templatesQ.isError ? (
          <ErrorState
            icon="flash-off-outline"
            title="Challenges are catching their breath"
            message={(templatesQ.error as Error).message}
            onRetry={() => templatesQ.refetch()}
          />
        ) : (
          <Animated.View entering={FadeInDown.duration(360)} style={styles.options}>
            {options.map((t: any) => (
              <OptionCard
                key={t.id}
                icon={CATEGORY_ICONS[t.category] ?? 'fire'}
                label={t.title}
                // Not "7-day challenge": a challenge is a rolling weekly
                // commitment now, and how it is done is the pair's to agree.
                description="Together or separately"
                badge={t.slug === recommendedSlug ? 'Recommended' : undefined}
                selected={selectedId === t.id}
                onPress={() => setSelectedId(t.id)}
              />
            ))}
          </Animated.View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Continue"
          disabled={!selectedId}
          loading={applyHabit.isPending}
          onPress={onContinue}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  header: { paddingHorizontal: 20, paddingTop: theme.spacing(2), gap: theme.spacing(1) },
  content: { padding: 20, gap: theme.spacing(2), flexGrow: 1 },
  options: { gap: theme.spacing(1.5) },
  footer: { padding: 20, paddingTop: theme.spacing(1), gap: theme.spacing(1) }
});
