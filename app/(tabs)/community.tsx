import { RefreshControl, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { InviteCard } from '@/components/community/InviteCard';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { useSession } from '@/providers/session-provider';
import { useGroups, usePosts } from '@/features/community/hooks';
import { theme } from '@/constants/theme';

export default function CommunityScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const myGroupsQ = useGroups({ mineOnly: true, userId });
  const discoverQ = useGroups();
  const feedQ = usePosts(null);

  const refreshing = myGroupsQ.isRefetching || feedQ.isRefetching;
  const onRefresh = () => {
    myGroupsQ.refetch();
    discoverQ.refetch();
    feedQ.refetch();
  };

  return (
    <Screen scroll={false}>
      <ScrollView
        contentContainerStyle={{ gap: theme.spacing(2), paddingBottom: theme.spacing(4) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        <SectionHeader title="Community" subtitle="Support, accountability, and shared momentum" />

        <InviteCard onPress={() => router.push('/group/invite')} />

        <View style={{ gap: theme.spacing(1) }}>
          <SectionHeader title="Your groups" />
          {myGroupsQ.isLoading ? (
            <LoadingState />
          ) : myGroupsQ.isError ? (
            <ErrorState message={(myGroupsQ.error as Error)?.message} onRetry={() => myGroupsQ.refetch()} />
          ) : (myGroupsQ.data ?? []).length === 0 ? (
            <EmptyState
              title="No groups yet"
              body="Create one or join a public group below."
              actionLabel="Create group"
              onAction={() => router.push('/group/new')}
            />
          ) : (
            (myGroupsQ.data ?? []).map((g: any) => (
              <Card
                key={g.id}
                onPress={() => router.push({ pathname: '/group/[id]', params: { id: g.id } })}
              >
                <AppText variant="subtitle">{g.title}</AppText>
                {g.description ? <AppText muted>{g.description}</AppText> : null}
              </Card>
            ))
          )}
          <Button label="Create new group" variant="secondary" onPress={() => router.push('/group/new')} />
        </View>

        <View style={{ gap: theme.spacing(1) }}>
          <SectionHeader title="Discover" />
          {(discoverQ.data ?? [])
            .filter((g: any) => !(myGroupsQ.data ?? []).some((mg: any) => mg.id === g.id))
            .slice(0, 5)
            .map((g: any) => (
              <Card
                key={g.id}
                onPress={() => router.push({ pathname: '/group/[id]', params: { id: g.id } })}
              >
                <AppText variant="subtitle">{g.title}</AppText>
                {g.description ? <AppText muted>{g.description}</AppText> : null}
              </Card>
            ))}
        </View>

        <View style={{ gap: theme.spacing(1) }}>
          <SectionHeader title="Recent momentum" subtitle="Activity from your groups" />
          {feedQ.isLoading ? (
            <LoadingState />
          ) : feedQ.isError ? (
            <ErrorState message={(feedQ.error as Error)?.message} onRetry={() => feedQ.refetch()} />
          ) : (feedQ.data ?? []).length === 0 ? (
            <EmptyState title="No posts yet" body="Be the first to share progress in one of your groups." />
          ) : (
            (feedQ.data ?? []).slice(0, 10).map((p: any) => (
              <Card
                key={p.id}
                onPress={() => router.push({ pathname: '/post/[id]', params: { id: p.id } })}
              >
                <AppText variant="label">{p.profiles?.full_name ?? 'Someone'}</AppText>
                <AppText muted numberOfLines={3}>{p.body}</AppText>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
