import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { Badge } from '@/components/ui/Badge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { useChallengeTemplates } from '@/features/challenges/hooks';
import { useIsPremium } from '@/features/billing/hooks';
import { theme } from '@/constants/theme';

export default function ChallengesScreen() {
  const templatesQ = useChallengeTemplates();
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
          subtitle="Pick the challenge that fits your current energy and rhythm"
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
          filtered.map((t: any, i: number) => {
            const locked = t.is_premium && !isPremium;
            return (
              <Animated.View key={t.id} entering={FadeInDown.delay(i * 50).duration(300)}>
                <Card
                  onPress={() => router.push({ pathname: '/challenge/[id]', params: { id: t.id } })}
                  style={{ gap: 8 }}
                  variant={t.is_premium ? 'glow' : 'default'}
                >
                  <View style={styles.headerRow}>
                    <AppText variant="subtitle" style={{ flex: 1 }}>
                      {t.title}
                    </AppText>
                    {t.is_premium ? <Badge label="Pro" variant="gradient" gradient="warm" /> : null}
                  </View>
                  <AppText muted numberOfLines={2}>
                    {t.description ?? t.summary}
                  </AppText>
                  <View style={styles.metaRow}>
                    <Badge label={`${t.duration_days} days`} tone="neutral" variant="soft" />
                    <Badge label={t.difficulty} tone="primary" variant="soft" />
                  </View>
                  <AppText
                    variant="caption"
                    style={{
                      color: locked ? theme.colors.muted : theme.colors.primary2,
                      fontFamily: theme.fonts.bodyBold,
                      marginTop: 4
                    }}
                  >
                    {locked ? 'Premium required →' : 'Open quest →'}
                  </AppText>
                </Card>
              </Animated.View>
            );
          })
        )}
      </ScrollView>
    </Screen>
  );
}

function capitalize(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

const styles = StyleSheet.create({
  chipRow: { gap: 8, paddingRight: 12 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' }
});
