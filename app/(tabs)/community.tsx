import { RefreshControl, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '@/components/ui/screen';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Card } from '@/components/ui/Card';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/Avatar';
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

  const otherGroups = (discoverQ.data ?? []).filter(
    (g: any) => !(myGroupsQ.data ?? []).some((mg: any) => mg.id === g.id)
  );

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
        <SectionHeader title="Community" subtitle="Support, accountability, and shared momentum" />

        <InviteCard onPress={() => router.push('/group/invite')} />

        <View style={{ gap: theme.spacing(1) }}>
          <SectionHeader title="Your groups" />
          {myGroupsQ.isLoading ? (
            <LoadingState />
          ) : myGroupsQ.isError ? (
            <ErrorState
              icon="people-outline"
              title="We couldn't load your groups"
              message={(myGroupsQ.error as Error)?.message ?? 'Give it another shot.'}
              onRetry={() => myGroupsQ.refetch()}
            />
          ) : (myGroupsQ.data ?? []).length === 0 ? (
            <EmptyState
              icon="bonfire-outline"
              title="No groups yet"
              body="Find your people — create a group or join a public one below."
              actionLabel="Create a group"
              onAction={() => router.push('/group/new')}
            />
          ) : (
            (myGroupsQ.data ?? []).map((g: any, i: number) => (
              <Animated.View key={g.id} entering={FadeInDown.delay(i * 50).duration(280)}>
                <Card
                  onPress={() => router.push({ pathname: '/group/[id]', params: { id: g.id } })}
                  style={{ gap: 4 }}
                >
                  <AppText variant="subtitle">{g.title}</AppText>
                  {g.description ? (
                    <AppText muted numberOfLines={2}>
                      {g.description}
                    </AppText>
                  ) : null}
                </Card>
              </Animated.View>
            ))
          )}
          <Button label="Create new group" variant="secondary" onPress={() => router.push('/group/new')} />
        </View>

        <View style={{ gap: theme.spacing(1) }}>
          <SectionHeader title="Discover" />
          {discoverQ.isLoading ? (
            <LoadingState />
          ) : discoverQ.isError ? (
            <ErrorState
              icon="telescope-outline"
              title="Discover is hiding"
              message={(discoverQ.error as Error)?.message ?? 'Pull to refresh and try again.'}
              onRetry={() => discoverQ.refetch()}
            />
          ) : otherGroups.length === 0 ? (
            <EmptyState
              icon="telescope-outline"
              title="No public groups yet"
              body="When new groups go public, they'll show up here."
            />
          ) : (
            otherGroups.slice(0, 5).map((g: any, i: number) => (
              <Animated.View key={g.id} entering={FadeInDown.delay(i * 50).duration(280)}>
                <Card
                  onPress={() => router.push({ pathname: '/group/[id]', params: { id: g.id } })}
                  style={{ gap: 4 }}
                >
                  <AppText variant="subtitle">{g.title}</AppText>
                  {g.description ? (
                    <AppText muted numberOfLines={2}>
                      {g.description}
                    </AppText>
                  ) : null}
                </Card>
              </Animated.View>
            ))
          )}
        </View>

        <View style={{ gap: theme.spacing(1) }}>
          <SectionHeader title="Recent momentum" subtitle="Activity from your groups" />
          {feedQ.isLoading ? (
            <LoadingState />
          ) : feedQ.isError ? (
            <ErrorState
              icon="megaphone-outline"
              title="The feed needs a moment"
              message={(feedQ.error as Error)?.message ?? 'We couldn\'t reach the feed — try again.'}
              onRetry={() => feedQ.refetch()}
            />
          ) : (feedQ.data ?? []).length === 0 ? (
            <EmptyState
              icon="chatbubbles-outline"
              title="Nothing yet"
              body="Be the first to share a win or a wobble — your group will love it."
              actionLabel="Open a group"
              onAction={() => {
                const first = (myGroupsQ.data ?? [])[0];
                if (first) router.push({ pathname: '/group/[id]', params: { id: first.id } });
              }}
            />
          ) : (
            (feedQ.data ?? []).slice(0, 10).map((p: any, i: number) => (
              <Animated.View key={p.id} entering={FadeInDown.delay(i * 40).duration(280)}>
                <Card
                  onPress={() => router.push({ pathname: '/post/[id]', params: { id: p.id } })}
                  style={{ flexDirection: 'row', gap: 12 }}
                >
                  <Avatar name={p.profiles?.full_name ?? 'Someone'} uri={p.profiles?.avatar_url} size={40} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <AppText style={{ fontFamily: theme.fonts.bodyBold }}>
                      {p.profiles?.full_name ?? 'Someone'}
                    </AppText>
                    <AppText muted numberOfLines={3}>
                      {p.body}
                    </AppText>
                  </View>
                </Card>
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
