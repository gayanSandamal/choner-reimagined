import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Screen } from '@/components/ui/screen';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { PressableScale } from '@/components/ui/PressableScale';
import { InviteCard } from '@/components/community/InviteCard';
import { LoadingState, ErrorState, EmptyState } from '@/components/ui/StateViews';
import { useSession } from '@/providers/session-provider';
import { useGroups, usePosts } from '@/features/community/hooks';
import { theme } from '@/constants/theme';

type GlyphName = keyof typeof Ionicons.glyphMap;

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
        contentContainerStyle={{ gap: theme.spacing(2.5), paddingBottom: theme.spacing(4) }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      >
        <View style={{ gap: 4 }}>
          <AppText variant="title">Community</AppText>
          <AppText variant="caption" muted>Gather round other fires</AppText>
        </View>

        <InviteCard onPress={() => router.push('/group/invite')} />

        <View style={styles.section}>
          <SectionHead
            icon="bonfire-outline"
            title="Your circles"
            actionLabel="New"
            onAction={() => router.push('/group/new')}
          />
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
              title="No circles yet"
              body="Find your people — create a circle or join a public one below."
              actionLabel="Create a circle"
              onAction={() => router.push('/group/new')}
            />
          ) : (
            (myGroupsQ.data ?? []).map((g: any, i: number) => (
              <GroupRow key={g.id} group={g} tint={theme.colors.primary2} delay={i * 50} />
            ))
          )}
        </View>

        <View style={styles.section}>
          <SectionHead icon="telescope-outline" title="Discover" />
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
              title="No public circles yet"
              body="When new circles go public, they'll show up here."
            />
          ) : (
            otherGroups.slice(0, 5).map((g: any, i: number) => (
              <GroupRow key={g.id} group={g} tint={theme.colors.link} delay={i * 50} />
            ))
          )}
        </View>

        <View style={styles.section}>
          <SectionHead icon="flame-outline" title="Round the fire" subtitle="Wins and wobbles from your circles" />
          {feedQ.isLoading ? (
            <LoadingState />
          ) : feedQ.isError ? (
            <ErrorState
              icon="megaphone-outline"
              title="The feed needs a moment"
              message={(feedQ.error as Error)?.message ?? "We couldn't reach the feed — try again."}
              onRetry={() => feedQ.refetch()}
            />
          ) : (feedQ.data ?? []).length === 0 ? (
            <EmptyState
              icon="chatbubbles-outline"
              title="Quiet by the fire"
              body="Be the first to share a win or a wobble — your circle will love it."
              actionLabel="Open a circle"
              onAction={() => {
                const first = (myGroupsQ.data ?? [])[0];
                if (first) router.push({ pathname: '/group/[id]', params: { id: first.id } });
              }}
            />
          ) : (
            (feedQ.data ?? []).slice(0, 10).map((p: any, i: number) => (
              <Animated.View key={p.id} entering={FadeInDown.delay(i * 40).duration(280)}>
                <PressableScale
                  onPress={() => router.push({ pathname: '/post/[id]', params: { id: p.id } })}
                  haptic="light"
                  scaleTo="subtle"
                  style={styles.postCard}
                >
                  <Avatar name={p.profiles?.full_name ?? 'Someone'} uri={p.profiles?.avatar_url} size={40} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <AppText style={{ fontFamily: theme.fonts.bodyBold }}>
                      {p.profiles?.full_name ?? 'Someone'}
                    </AppText>
                    <AppText muted numberOfLines={3}>{p.body}</AppText>
                  </View>
                </PressableScale>
              </Animated.View>
            ))
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

function SectionHead({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction
}: {
  icon: GlyphName;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHead}>
      <View style={styles.sectionHeadLeft}>
        <Ionicons name={icon} size={16} color={theme.colors.primary2} />
        <View>
          <AppText variant="subtitle">{title}</AppText>
          {subtitle ? <AppText variant="caption" muted>{subtitle}</AppText> : null}
        </View>
      </View>
      {actionLabel && onAction ? (
        <PressableScale onPress={onAction} haptic="light" scaleTo="subtle" style={styles.sectionAction}>
          <AppText variant="caption" style={styles.sectionActionText}>{actionLabel}</AppText>
          <Ionicons name="add" size={13} color={theme.colors.primary2} />
        </PressableScale>
      ) : null}
    </View>
  );
}

function GroupRow({ group, tint, delay }: { group: any; tint: string; delay: number }) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).duration(280)}>
      <PressableScale
        onPress={() => router.push({ pathname: '/group/[id]', params: { id: group.id } })}
        haptic="light"
        scaleTo="subtle"
        style={styles.groupCard}
      >
        <View style={[styles.groupIcon, { backgroundColor: `${tint}22` }]}>
          <Ionicons name="people" size={19} color={tint} />
        </View>
        <View style={{ flex: 1 }}>
          <AppText style={{ fontFamily: theme.fonts.bodyBold }}>{group.title}</AppText>
          {group.description ? (
            <AppText variant="caption" muted numberOfLines={2}>{group.description}</AppText>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.muted} />
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  section: { gap: theme.spacing(1.25) },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  sectionActionText: { color: theme.colors.primary2, fontFamily: theme.fonts.bodyBold },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing(1.75)
  },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.sm,
    alignItems: 'center',
    justifyContent: 'center'
  },
  postCard: {
    flexDirection: 'row',
    gap: theme.spacing(1.5),
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing(1.75)
  }
});
