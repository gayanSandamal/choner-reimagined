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
import { useChallengeTemplates, useDefaultChallenges, useStreak } from '@/features/challenges/hooks';
import { useIsPremium } from '@/features/billing/hooks';
import { useSession } from '@/providers/session-provider';
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
  const challengesQ = useDefaultChallenges(userId);
  const streakQ = useStreak(userId);
  const { isPremium } = useIsPremium();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = useMemo(() => {
    const set = new Set<string>(['All']);
    (templatesQ.data ?? []).forEach((t: any) => t.category && set.add(capitalize(t.category)));
    return Array.from(set);
  }, [templatesQ.data]);

  const filtered = useMemo(() => {
    const all = templatesQ.data ?? [];
    return selectedCategory === 'All'
      ? all
      : all.filter((t: any) => capitalize(t.category) === selectedCategory);
  }, [templatesQ.data, selectedCategory]);

  const solo = challengesQ.data?.solo ?? null;
  const partner = challengesQ.data?.partner ?? null;
  const streak = streakQ.data ?? 0;

  const fireStateFor = (templateId: string): FireState | undefined => {
    if (solo?.challenge_template_id === templateId) {
      return { mode: 'solo', status: solo.status, streak };
    }
    if (partner?.challenge_template_id === templateId) {
      return { mode: 'partner', status: partner.status, streak };
    }
    return undefined;
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
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="compass-outline"
            title="Nothing in this category yet"
            body="Try a different one, or check back soon."
            actionLabel="See all"
            onAction={() => setSelectedCategory('All')}
          />
        ) : (
          <View style={{ gap: theme.spacing(1.5) }}>
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
                  locked={t.is_premium && !isPremium}
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
