import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient as SvgGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  FadeInDown,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withSpring
} from 'react-native-reanimated';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { AppText } from '@/components/ui/AppText';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { useSession } from '@/providers/session-provider';
import { useInsights, useInsightsSeries } from '@/features/insights/hooks';
import { theme } from '@/constants/theme';
import { useReduceMotion } from '@/lib/motion';

const RANGES: { label: string; days: number }[] = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 }
];

export default function InsightsScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const [range, setRange] = useState(RANGES[1]!);
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <SectionHeader title="Insights" subtitle="See where your consistency lifts you, and where it drops" />

        <View style={{ flexDirection: 'row', gap: 8 }}>
          {RANGES.map((r) => (
            <Chip
              key={r.label}
              label={r.label}
              active={r.days === range.days}
              onPress={() => setRange(r)}
            />
          ))}
        </View>

        {insightsQ.isLoading ? (
          <LoadingState />
        ) : insightsQ.isError ? (
          <ErrorState
            icon="analytics-outline"
            title="Insights couldn't load"
            message={(insightsQ.error as Error).message}
            onRetry={() => insightsQ.refetch()}
          />
        ) : !insightsQ.data ? (
          <EmptyState
            icon="leaf-outline"
            title="No insights yet"
            body="Complete a few check-ins and your trends will show up here."
          />
        ) : (
          <View style={{ gap: theme.spacing(2) }}>
            <Animated.View entering={FadeInDown.delay(80).duration(320)}>
              <Card>
                <AppText variant="label">Consistency score</AppText>
                <AppText variant="display" style={{ marginTop: 4 }}>
                  {insightsQ.data?.consistency_score ?? 0}
                </AppText>
                <AppText muted>
                  {insightsQ.data?.best_time_of_day
                    ? `${capitalize(insightsQ.data.best_time_of_day)} is when you check in the most.`
                    : 'Complete a few tasks to see your best time of day.'}
                </AppText>
              </Card>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(160).duration(320)}>
              <Card>
                <AppText variant="label">Current streak</AppText>
                <AppText variant="display" style={{ marginTop: 4 }}>
                  {insightsQ.data?.streak_days ?? 0} days
                </AppText>
                <AppText muted>Completion rate: {insightsQ.data?.completion_rate ?? 0}%</AppText>
              </Card>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(240).duration(320)}>
              <Card>
                <AppText variant="label">Activity over last {range.label}</AppText>
                <View style={{ marginTop: theme.spacing(1) }}>
                  <ActivityChart series={seriesQ.data ?? []} />
                </View>
              </Card>
            </Animated.View>
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

const AnimatedRect = Animated.createAnimatedComponent(Rect);

function AnimatedBar({
  x,
  y,
  width,
  height,
  delay,
  faded
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  delay: number;
  faded: boolean;
}) {
  const reduceMotion = useReduceMotion();
  const t = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    t.value = reduceMotion ? 1 : withDelay(delay, withSpring(1, theme.motion.spring.gentle));
  }, [delay, reduceMotion]);

  const props = useAnimatedProps(() => ({
    height: height * t.value,
    y: y + height * (1 - t.value)
  }));

  return (
    <AnimatedRect
      x={x}
      width={width}
      animatedProps={props}
      rx={3}
      fill={faded ? `${theme.colors.primary}33` : 'url(#barGrad)'}
    />
  );
}

function ActivityChart({ series }: { series: { day: string; completions: number }[] }) {
  const W = 320;
  const H = 120;
  const padding = 4;
  const max = useMemo(() => Math.max(1, ...series.map((d) => d.completions)), [series]);

  if (series.length === 0) {
    return (
      <AppText muted variant="caption">
        No activity yet.
      </AppText>
    );
  }

  const barWidth = Math.max(2, (W - padding * 2) / series.length - 2);
  return (
    <Svg width={W} height={H}>
      <Defs>
        <SvgGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={theme.gradients.warm[0]} />
          <Stop offset="1" stopColor={theme.gradients.warm[1]} />
        </SvgGradient>
      </Defs>
      {series.map((d, i) => {
        const h = (d.completions / max) * (H - padding * 2);
        const x = padding + i * (barWidth + 2);
        const y = H - padding - h;
        return (
          <AnimatedBar
            key={d.day}
            x={x}
            y={y}
            width={barWidth}
            height={h}
            delay={i * 22}
            faded={d.completions === 0}
          />
        );
      })}
    </Svg>
  );
}

function capitalize(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

const _styles = StyleSheet.create({});
