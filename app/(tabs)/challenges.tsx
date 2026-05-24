import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
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
        refreshControl={<RefreshControl refreshing={templatesQ.isRefetching} onRefresh={() => templatesQ.refetch()} tintColor={theme.colors.primary} />}
      >
        <SectionHeader title="Challenges" subtitle="Choose a challenge that fits your current energy and lifestyle" />

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {categories.map((item) => {
            const isActive = selectedCategory === item;
            return (
              <Card
                key={item}
                onPress={() => setSelectedCategory(item)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  backgroundColor: isActive ? theme.colors.primary : theme.colors.surface,
                  borderColor: isActive ? theme.colors.primary : theme.colors.border,
                }}
              >
                <AppText
                  variant="caption"
                  style={{
                    fontWeight: isActive ? '700' : '400',
                    color: isActive ? '#000' : theme.colors.text,
                  }}
                >
                  {item}
                </AppText>
              </Card>
            );
          })}
        </View>

        {templatesQ.isLoading ? (
          <LoadingState />
        ) : templatesQ.isError ? (
          <ErrorState message={(templatesQ.error as Error).message} onRetry={() => templatesQ.refetch()} />
        ) : filtered.length === 0 ? (
          <EmptyState title="No challenges in this category" body="Try another category, or check back soon." />
        ) : (
          filtered.map((t: any) => {
            const locked = t.is_premium && !isPremium;
            return (
              <Card
                key={t.id}
                onPress={() => router.push({ pathname: '/challenge/[id]', params: { id: t.id } })}
                style={{ gap: 6 }}
                variant={t.is_premium ? 'glow' : 'default'}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <AppText variant="subtitle">{t.title}</AppText>
                  {t.is_premium ? (
                    <AppText variant="caption" style={{ color: theme.colors.primary2 }}>PRO</AppText>
                  ) : null}
                </View>
                <AppText muted>{t.description ?? t.summary}</AppText>
                <AppText variant="caption" muted>
                  {t.duration_days} days • {t.difficulty}
                </AppText>
                <AppText
                  variant="caption"
                  style={{ color: locked ? theme.colors.muted : theme.colors.primary2, fontWeight: '600', marginTop: 4 }}
                >
                  {locked ? 'Premium required →' : 'Open challenge →'}
                </AppText>
              </Card>
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
