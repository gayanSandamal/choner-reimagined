import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OptionCard } from '@/components/onboarding/OptionCard';
import { LoadingState, ErrorState } from '@/components/ui/StateViews';
import { useOnboarding } from '@/features/onboarding/context';
import { useIsInvitee } from '@/features/onboarding/invitee';
import { challengeOptionSlugs, goalToTemplateSlug } from '@/features/onboarding/mappings';
import { getTemplateBySlug } from '@/features/challenges/api';
import { useChallengeTemplates, useSetDefaultChallengesHabit } from '@/features/challenges/hooks';
import { useSession } from '@/providers/session-provider';
import { theme } from '@/constants/theme';

// The hidden template every "Create your own" habit is stored against — see
// the migration that seeds it.
const CUSTOM_TEMPLATE_SLUG = 'custom-habit';

const CATEGORY_ICONS: Record<string, string> = {
  movement: '🏃',
  sleep: '🌙',
  stress: '🌱',
  energy: '⚡'
};

export default function ChallengeScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const { goal, setChosenChallenge } = useOnboarding();
  const templatesQ = useChallengeTemplates();
  const applyHabit = useSetDefaultChallengesHabit();
  const { isInvitee, resolving } = useIsInvitee(userId);

  const customTemplateQ = useQuery({
    queryKey: ['challenge-template-slug', CUSTOM_TEMPLATE_SLUG],
    queryFn: () => getTemplateBySlug(CUSTOM_TEMPLATE_SLUG)
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customText, setCustomText] = useState('');

  // The habit is locked and shared, so an invitee never picks one — they go
  // straight to their own reflection.
  useEffect(() => {
    if (isInvitee) router.replace('/onboarding/why');
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

  const trimmedCustom = customText.trim();
  const canContinue = Boolean(trimmedCustom) || Boolean(selectedId);

  const onSelectTemplate = (id: string) => {
    setSelectedId(id);
    // One choice at a time — picking from the list drops what they typed.
    setCustomText('');
    setCustomOpen(false);
  };

  const onContinue = async () => {
    if (!userId || !canContinue) return;
    try {
      if (trimmedCustom) {
        const template = customTemplateQ.data;
        if (!template) {
          throw new Error('Custom habits aren’t available yet — pick one from the list.');
        }
        await applyHabit.mutateAsync({
          userId,
          templateId: template.id,
          customHabitTitle: trimmedCustom
        });
        setChosenChallenge({
          templateId: template.id,
          title: trimmedCustom,
          customTitle: trimmedCustom
        });
      } else {
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
      }
      router.push('/onboarding/why');
    } catch (error: any) {
      Alert.alert('Could not set your challenge', error.message);
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
        <AppText variant="title">Pick what you'll do every day</AppText>
        <AppText muted>Seven days, one habit. You can always start another later.</AppText>
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
                icon={CATEGORY_ICONS[t.category] ?? '🔥'}
                label={t.title}
                description={`${t.duration_days}-day challenge${
                  t.proof_type === 'photo' ? ' · Photo proof' : ''
                }`}
                badge={t.slug === recommendedSlug ? 'Recommended' : undefined}
                selected={!trimmedCustom && selectedId === t.id}
                onPress={() => onSelectTemplate(t.id)}
              />
            ))}

            {customOpen ? (
              <Animated.View entering={FadeInDown.duration(240)} style={styles.customBox}>
                <Input
                  label="Your habit"
                  placeholder="e.g. 30 sit-ups"
                  autoFocus
                  maxLength={80}
                  value={customText}
                  onChangeText={(text) => {
                    setCustomText(text);
                    if (text.trim()) setSelectedId(null);
                  }}
                />
                <AppText variant="caption" muted>
                  Same 7 days. Keep it small enough to do on your worst day.
                </AppText>
              </Animated.View>
            ) : (
              <Pressable
                onPress={() => setCustomOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="Create your own habit"
                style={styles.customCta}
              >
                <AppText variant="subtitle">+ Create your own</AppText>
                <AppText variant="caption" muted>
                  Already know exactly what you want to do
                </AppText>
              </Pressable>
            )}
          </Animated.View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label="Continue"
          disabled={!canContinue}
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
  customCta: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: theme.colors.border,
    padding: theme.spacing(2),
    gap: 2,
    alignItems: 'center'
  },
  customBox: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.primary2,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing(2),
    gap: theme.spacing(1)
  },
  footer: { padding: 20, paddingTop: theme.spacing(1), gap: theme.spacing(1) }
});
