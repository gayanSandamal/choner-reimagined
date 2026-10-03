import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppTopBar, useTopBar } from '@/components/navigation/AppTopBar';
import { useTabBarClearance } from '@/components/navigation/CustomTabBar';
import { AppText } from '@/components/ui/AppText';
import { LoadingState, ErrorState } from '@/components/ui/StateViews';
import { Heart } from '@/components/challenges/Heart';
import { MilestoneRow } from '@/components/community/MilestoneRow';
import { challengeHabitTitle, partnerStateOf } from '@/features/challenges/api';
import { useMyChallenge, useMyPartner } from '@/features/challenges/hooks';
import { useCityFeed, useToggleMilestoneReaction } from '@/features/community/hooks';
import { heartCopy } from '@/features/home/hero';
import { useSession } from '@/providers/session-provider';
import { theme } from '@/constants/theme';
import { usePullRefresh } from '@/lib/use-pull-refresh';

const ORANGE = '#FD8302';
const DIM = '#D8D2CC';

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
  const challengeQ = useMyChallenge(userId);
  // The pair comes from the partnership, which outlives a challenge, and the
  // number is sessions both of you completed. Nothing here is a daily
  // check-in: there is no such thing any more.
  const partnerQ = useMyPartner(userId);
  const feedQ = useCityFeed();
  const react = useToggleMilestoneReaction();

  const challenge = challengeQ.data ?? null;
  const partner = partnerQ.data?.partnered ? partnerQ.data : null;
  const partnerState = partner ? 'partnered' : partnerStateOf(challenge);
  const together = partner?.sessions_together ?? 0;
  const pair = heartCopy({
    partnerName: partner?.first_name ?? null,
    partnerState,
    sessionsTogether: together
  });
  const city = feedQ.data?.city ?? null;
  const items = feedQ.data?.items ?? [];

  const { refreshing, onRefresh } = usePullRefresh(() =>
    Promise.all([feedQ.refetch(), challengeQ.refetch(), partnerQ.refetch()])
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
        <View style={styles.head}>
          <AppText style={styles.pageTitle}>Community</AppText>
          {city ? (
            <View style={styles.cityPill}>
              <Ionicons name="location-outline" size={11} color={theme.colors.muted} />
              <AppText style={styles.cityText}>{city}</AppText>
            </View>
          ) : null}
        </View>

        {/* Pinned first, always. This tab is never fully blank — even with no
            feed, you can see your own pair. */}
        <Animated.View entering={FadeInDown.duration(320)} style={styles.pinned}>
          <View style={styles.pinnedHeart}>
            {/* Your half is always lit; theirs lights once there is a them. */}
            <Heart youCheckedIn partnerCheckedIn={Boolean(partner)} partnerState={partnerState} width={62} />
          </View>
          <View style={styles.pinnedBody}>
            <AppText style={styles.pinnedTitle}>{pair.title}</AppText>
            <AppText style={styles.pinnedSub}>
              {pair.line ?? challengeHabitTitle(challenge) ?? 'Nothing picked yet'}
            </AppText>
          </View>
          {together > 0 ? (
            <View style={styles.streak}>
              <AppText style={styles.streakNum}>{together}</AppText>
              <AppText style={styles.streakLabel}>together</AppText>
            </View>
          ) : null}
        </Animated.View>

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
  head: { marginTop: theme.spacing(1.5), marginBottom: theme.spacing(2), gap: 8 },
  pageTitle: { fontFamily: theme.fonts.body, fontSize: 24, color: theme.colors.text },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 100,
    paddingHorizontal: 9,
    paddingVertical: 3
  },
  cityText: { color: theme.colors.muted, fontSize: 11 },
  pinned: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(28,43,51,0.04)',
    borderRadius: 18,
    padding: 14,
    marginBottom: theme.spacing(2)
  },
  pinnedHeart: { width: 62 },
  pinnedBody: { flexShrink: 1, flexGrow: 1, gap: 2 },
  pinnedTitle: { color: theme.colors.text, fontSize: 13.5, fontFamily: theme.fonts.bodyBold },
  pinnedSub: { color: theme.colors.muted, fontSize: 11.5 },
  streak: { alignItems: 'center' },
  streakNum: { fontFamily: theme.fonts.bodyBold, fontSize: 20, color: theme.colors.text },
  streakLabel: { fontSize: 10, color: theme.colors.muted },
  feed: { borderTopWidth: 1, borderTopColor: 'rgba(28,43,51,0.04)' },
  empty: { alignItems: 'center', paddingVertical: theme.spacing(5), gap: theme.spacing(1.5) },
  emptyText: { color: theme.colors.muted, fontSize: 12, textAlign: 'center', lineHeight: 19 }
});
