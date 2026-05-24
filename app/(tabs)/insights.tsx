import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { LoadingState, ErrorState } from '@/components/ui/StateViews';
import { useSession } from '@/providers/session-provider';
import { useInsights, useInsightsSeries } from '@/features/insights/hooks';
import { theme } from '@/constants/theme';

const RANGES: { label: string; days: number }[] = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

export default function InsightsScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const [range, setRange] = useState(RANGES[1]);
  const insightsQ = useInsights(userId);
  const seriesQ = useInsightsSeries(userId, range.days);

  const refreshing = insightsQ.isRefetching || seriesQ.isRefetching;
  const onRefresh = () => {
    insightsQ.refetch();
    seriesQ.refetch();
  };

  return (
    <Screen scroll={false}>
      <ScrollView
        contentContainerStyle={{ gap: theme.spacing(2), paddingBottom: theme.spacing(4) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <SectionHeader title="Insights" subtitle="Where your consistency is strong and where it drops" />

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {RANGES.map((r) => {
            const active = r.days === range.days;
            return (
              <Card
                key={r.label}
                onPress={() => setRange(r)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 14,
                  backgroundColor: active ? theme.colors.primary : theme.colors.surface,
                  borderColor: active ? theme.colors.primary : theme.colors.border,
                }}
              >
                <AppText variant="caption" style={{ color: active ? '#000' : theme.colors.text, fontWeight: active ? '700' : '400' }}>
                  {r.label}
                </AppText>
              </Card>
            );
          })}
        </View>

        {insightsQ.isLoading ? (
          <LoadingState />
        ) : insightsQ.isError ? (
          <ErrorState message={(insightsQ.error as Error).message} onRetry={() => insightsQ.refetch()} />
        ) : (
          <View style={{ gap: theme.spacing(2) }}>
            <Card>
              <AppText variant="label">Consistency score</AppText>
              <AppText variant="title">{insightsQ.data?.consistency_score ?? 0}</AppText>
              <AppText muted>
                {insightsQ.data?.best_time_of_day
                  ? `${capitalize(insightsQ.data.best_time_of_day)} is when you check in the most.`
                  : 'Complete a few tasks to see your best time of day.'}
              </AppText>
            </Card>

            <Card>
              <AppText variant="label">Current streak</AppText>
              <AppText variant="title">{insightsQ.data?.streak_days ?? 0} days</AppText>
              <AppText muted>Completion rate: {insightsQ.data?.completion_rate ?? 0}%</AppText>
            </Card>

            <Card>
              <AppText variant="label">Activity over last {range.label}</AppText>
              <View style={{ marginTop: theme.spacing(1) }}>
                <ActivityChart series={seriesQ.data ?? []} />
              </View>
            </Card>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function ActivityChart({ series }: { series: { day: string; completions: number }[] }) {
  const W = 320;
  const H = 100;
  const padding = 4;
  const max = useMemo(() => Math.max(1, ...series.map((d) => d.completions)), [series]);

  if (series.length === 0) {
    return <AppText muted variant="caption">No activity yet.</AppText>;
  }

  const barWidth = Math.max(2, (W - padding * 2) / series.length - 2);
  return (
    <Svg width={W} height={H}>
      {series.map((d, i) => {
        const h = (d.completions / max) * (H - padding * 2);
        const x = padding + i * (barWidth + 2);
        const y = H - padding - h;
        return (
          <Rect
            key={d.day}
            x={x}
            y={y}
            width={barWidth}
            height={h}
            rx={2}
            fill={theme.colors.primary}
            opacity={d.completions === 0 ? 0.2 : 1}
          />
        );
      })}
    </Svg>
  );
}

function capitalize(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}
