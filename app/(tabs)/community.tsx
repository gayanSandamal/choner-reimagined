import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppTopBar, useTopBar } from '@/components/navigation/AppTopBar';
import { useTabBarClearance } from '@/components/navigation/CustomTabBar';
import { AppText } from '@/components/ui/AppText';
import { LoadingState, ErrorState } from '@/components/ui/StateViews';
import { MilestoneRow } from '@/components/community/MilestoneRow';
import { useCityFeed, useToggleMilestoneReaction } from '@/features/community/hooks';
import { useSession } from '@/providers/session-provider';
import { theme } from '@/constants/theme';
import { usePullRefresh } from '@/lib/use-pull-refresh';

const ORANGE = '#FD8302';

// Community: ambient social proof, local and opt-in.
//
// Not a directory and not a feed to act on. Find is where you decide to get
// matched; this is where you see that the whole thing actually works, including
// for people who were matched as strangers. There is deliberately no post
// button here: the prompt to share lives on Home/Challenges, right after a real
// milestone, so nothing is published without a specific choice.
export default function CommunityScreen() {
  const { session } = useSession();
  const tabBarClearance = useTabBarClearance();
  const topBar = useTopBar();
  const userId = session?.user.id;
  const feedQ = useCityFeed();
  const react = useToggleMilestoneReaction();

  const city = feedQ.data?.city ?? null;
  const items = feedQ.data?.items ?? [];

  const { refreshing, onRefresh } = usePullRefresh(() =>
    feedQ.refetch()
  );

  const onReact = (id: string, reacted: boolean) => {
    if (!userId) return;
    react.mutate({ milestoneId: id, userId, reacted });
  };

  return (
    <View style={styles.root}>
      <AppTopBar />
      <ScrollView
        {...topBar.scrollProps}
          contentContainerStyle={[styles.content, { paddingTop: topBar.contentTop, paddingBottom: tabBarClearance }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={topBar.progressViewOffset}
            tintColor={ORANGE}
          />
        }
      >
        {/* The prototype's T3 (#116): a title, where you are, then the posts.
            The pinned "You + ?" card is gone: your own pair lives on Home. */}
        <AppText style={styles.pageTitle}>Community</AppText>
        <AppText style={styles.sub}>{city ? `${city}, showing up together.` : 'Showing up together.'}</AppText>

        {feedQ.isLoading ? (
          <LoadingState />
        ) : feedQ.isError ? (
          <ErrorState
            message={(feedQ.error as Error).message}
            onRetry={() => feedQ.refetch()}
          />
        ) : items.length === 0 ? (
          // Early-launch emptiness is expected, not an error. Say so warmly.
          <View style={styles.empty}>
            <Ionicons name="leaf-outline" size={24} color={theme.colors.muted} />
            <AppText style={styles.emptyText}>
              {city ? `${city} is just getting started.` : 'Your city is just getting started.'}
              {'\n'}Be one of the first to share a session.
            </AppText>
          </View>
        ) : (
          <View style={styles.feed}>
            {items.map((item) => (
              <MilestoneRow
                key={item.id}
                item={item}
                onReact={() => onReact(item.id, item.i_reacted)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  content: { paddingHorizontal: 22, paddingBottom: theme.spacing(5) },
  pageTitle: { fontFamily: theme.fonts.body, fontSize: 24, lineHeight: 31, letterSpacing: -0.5, color: theme.colors.text },
  sub: { fontSize: 13, lineHeight: 20, color: theme.colors.muted, marginTop: 4, marginBottom: 20 },
  feed: { gap: 12 },
  empty: { alignItems: 'center', paddingVertical: theme.spacing(5), gap: theme.spacing(1.5) },
  emptyText: { color: theme.colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 19 }
});
