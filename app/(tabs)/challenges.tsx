import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/AppText';
import { Chip } from '@/components/ui/Chip';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { QuestCard, type FireState } from '@/components/challenges/QuestCard';
import { useChallengeTemplates, useMyChallenge, useStreak } from '@/features/challenges/hooks';
import { challengeHabitTitle, partnerStateOf } from '@/features/challenges/api';
import { useIsPremium } from '@/features/billing/hooks';
import { useSession } from '@/providers/session-provider';
import { features } from '@/constants/features';
import { theme } from '@/constants/theme';

type GlyphName = keyof typeof Ionicons.glyphMap;

const CATEGORY_CHIP_ICONS: Record<string, GlyphName> = {
  All: 'flame',
  Movement: 'walk-outline',
  Sleep: 'moon-outline',
  Stress: 'leaf-outline',
  Energy: 'flash-outline'
};

export default function ChallengesScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const templatesQ = useChallengeTemplates();
  const challengesQ = useMyChallenge(userId);
  const streakQ = useStreak(userId);
  const { isPremium } = useIsPremium();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    (templatesQ.data ?? []).forEach((t: any) => t.category && set.add(capitalize(t.category)));
    return Array.from(set);
  }, [templatesQ.data]);

  const filtered = useMemo(() => {
    // With Pro gated off, premium quests can't be unlocked — hide them rather
    // than show dead "Unlock" cards.
    const all = (templatesQ.data ?? []).filter((t: any) => features.pro || !t.is_premium);
    return selectedCategory === 'All'
      ? all
      : all.filter((t: any) => capitalize(t.category) === selectedCategory);
  }, [templatesQ.data, selectedCategory]);

  const challenge = challengesQ.data ?? null;
  const streak = streakQ.data ?? 0;

  // A live challenge can point at a template this list never shows: a custom
  // habit (hidden by design so one user's text doesn't reach everyone else's
  // Quests) or one that has since been retired. Either way the user's own fire
  // would be missing from the list entirely, so it gets rendered from the
  // challenge row instead of the template.
  //
  const offListTracks = useMemo(() => {
    const visible = new Set((filtered as any[]).map((t) => t.id));
    const templateId = challenge?.challenge_template_id;
    if (!challenge || !templateId || visible.has(templateId)) return [];
    return [
      {
        mode: (partnerStateOf(challenge) === 'partnered' ? 'partner' : 'solo') as 'solo' | 'partner',
        challenge
      }
    ];
  }, [filtered, challenge]);

  // Their category ('custom', or a retired habit's) has no chip, so they only
  // belong under "All" — a category filter is an explicit narrowing.
  const showOffList = selectedCategory === 'All' && offListTracks.length > 0;

  const fireStateFor = (templateId: string): FireState | undefined => {
    if (challenge?.challenge_template_id !== templateId) return undefined;
    return {
      mode: partnerStateOf(challenge) === 'partnered' ? 'partner' : 'solo',
      status: challenge.status,
      streak
    };
  };

  const onOpenQuest = (templateId: string, fireState: FireState | undefined) => {
    // The partner track is only manageable from Home (the Solo|Partner
    // toggle over the fire) — the template-detail screen only understands
    // the solo track, so routing a partner-owned card there would silently
    // let the user spin up an unrelated duplicate solo challenge.
    if (fireState?.mode === 'partner') {
      router.push('/(tabs)/home');
      return;
    }
    router.push({ pathname: '/challenge/[id]', params: { id: templateId } });
  };

  return (
    <Screen scroll={false}>
      <ScrollView
        contentContainerStyle={{ gap: theme.spacing(2), paddingBottom: theme.spacing(4) }}
        refreshControl={
          <RefreshControl
            refreshing={templatesQ.isRefetching}
            onRefresh={() => templatesQ.refetch()}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <SectionHeader
          title="Quests"
          subtitle="Pick what you'll build your next fire around"
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {categories.map((item) => (
            <Chip
              key={item}
              label={item}
              active={selectedCategory === item}
              onPress={() => setSelectedCategory(item)}
              icon={
                <Ionicons
                  name={CATEGORY_CHIP_ICONS[item] ?? 'flame-outline'}
                  size={14}
                  color={theme.colors.text}
                />
              }
            />
          ))}
        </ScrollView>

        {templatesQ.isLoading ? (
          <LoadingState />
        ) : templatesQ.isError ? (
          <ErrorState
            icon="flash-off-outline"
            title="Quests are catching their breath"
            message={(templatesQ.error as Error).message}
            onRetry={() => templatesQ.refetch()}
          />
        ) : filtered.length === 0 && !showOffList ? (
          <EmptyState
            icon="compass-outline"
            title="Nothing in this category yet"
            body="Try a different one, or check back soon."
            actionLabel="See all"
            onAction={() => setSelectedCategory('All')}
          />
        ) : (
          <View style={{ gap: theme.spacing(1.5) }}>
            {showOffList
              ? offListTracks.map(({ mode, challenge }, i) => {
                  const template = challenge.challenge_templates as any;
                  return (
                    <QuestCard
                      key={challenge.id}
                      title={challengeHabitTitle(challenge) ?? 'Your habit'}
                      description={template?.description ?? template?.summary}
                      category={template?.category ?? 'custom'}
                      durationDays={template?.duration_days ?? 7}
                      difficulty={template?.difficulty ?? 'beginner'}
                      fireState={{ mode, status: challenge.status, streak }}
                      // Home, never the template detail screen: that screen
                      // reads the template, so a custom habit would open under
                      // the placeholder title and offer to start it fresh.
                      onPress={() => router.push('/(tabs)/home')}
                      delay={i * 50}
                    />
                  );
                })
              : null}
            {filtered.map((t: any, i: number) => {
              const fireState = fireStateFor(t.id);
              return (
                <QuestCard
                  key={t.id}
                  title={t.title}
                  description={t.description ?? t.summary}
                  category={t.category}
                  durationDays={t.duration_days}
                  difficulty={t.difficulty}
                  locked={features.pro && t.is_premium && !isPremium}
                  fireState={fireState}
                  onPress={() => onOpenQuest(t.id, fireState)}
                  delay={i * 50}
                />
              );
            })}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function capitalize(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

const styles = StyleSheet.create({
  chipRow: { gap: 8, paddingRight: 12 }
});
