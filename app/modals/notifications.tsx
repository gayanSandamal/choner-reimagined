import { useMemo } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/ui/screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { ListItem } from '@/components/ui/ListItem';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { useSession } from '@/providers/session-provider';
import { useMarkAllRead, useMarkRead, useNotifications } from '@/features/notifications/hooks';
import { theme } from '@/constants/theme';

const ICON_BY_KIND: Record<string, keyof typeof Ionicons.glyphMap> = {
  partner_activity: 'people',
  partner_nudge: 'hand-left',
  partner_matched: 'heart',
  streak_risk: 'flame',
  ai_suggestion: 'sparkles',
  group_post: 'chatbubbles',
  challenge_milestone: 'trophy',
  invite_accepted: 'mail-open',
};

function groupByDay(items: { created_at: string }[]) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yest = new Date(today); yest.setDate(today.getDate() - 1);
  const groups: Record<string, typeof items> = { Today: [], Yesterday: [], Earlier: [] };
  items.forEach((it) => {
    const d = new Date(it.created_at);
    if (d >= today) groups.Today.push(it);
    else if (d >= yest) groups.Yesterday.push(it);
    else groups.Earlier.push(it);
  });
  return groups;
}

export default function NotificationsModal() {
  const { session } = useSession();
  const userId = session?.user.id;
  const q = useNotifications(userId);
  const markRead = useMarkRead(userId);
  const markAllRead = useMarkAllRead();

  const groups = useMemo(() => groupByDay((q.data ?? []) as any[]), [q.data]);

  return (
    <Screen scroll={false}>
      <ScrollView
        contentContainerStyle={{ gap: theme.spacing(1), paddingBottom: theme.spacing(4) }}
        refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={theme.colors.primary} />}
      >
        <ScreenHeader title="Notifications" onClose={() => router.back()} />

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: theme.spacing(1) }}>
          <Button label="Preferences" variant="ghost" onPress={() => router.push('/settings/notifications')} />
          {userId && (q.data ?? []).some((n: any) => !n.read_at) ? (
            <Button label="Mark all read" variant="ghost" onPress={() => markAllRead.mutate(userId)} />
          ) : null}
        </View>

        {q.isLoading ? (
          <LoadingState />
        ) : q.isError ? (
          <ErrorState message={(q.error as Error).message} onRetry={() => q.refetch()} />
        ) : (q.data ?? []).length === 0 ? (
          <EmptyState title="You're all caught up" body="We'll let you know about partner activity, streaks at risk, and AI suggestions." />
        ) : (
          (Object.entries(groups) as [string, any[]][]).map(([label, items]) =>
            items.length === 0 ? null : (
              <View key={label}>
                <View style={{ marginTop: theme.spacing(2), marginBottom: theme.spacing(1) }}>
                  <AppText variant="label" muted style={{ paddingLeft: theme.spacing(1) }}>{label}</AppText>
                </View>
                {items.map((n) => (
                  <ListItem
                    key={n.id}
                    title={n.title}
                    subtitle={n.body ?? undefined}
                    icon={ICON_BY_KIND[n.kind] ?? 'notifications'}
                    onPress={() => {
                      if (!n.read_at) markRead.mutate(n.id);
                    }}
                    rightElement={!n.read_at ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary }} /> : null}
                  />
                ))}
              </View>
            )
          )
        )}
      </ScrollView>
    </Screen>
  );
}
