import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppTopBar, useTopBar } from '@/components/navigation/AppTopBar';
import { useTabBarClearance } from '@/components/navigation/CustomTabBar';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState } from '@/components/ui/StateViews';
import { CommitmentCard } from '@/components/challenges/CommitmentCard';
import { PlanGateCard } from '@/components/plans/PlanGateCard';
import { RepairCard } from '@/components/plans/RepairCard';
import { StreakCircles } from '@/components/streak/StreakCircles';
import { challengeHabitTitle, partnerStateOf } from '@/features/challenges/api';
import { historyLine } from '@/features/challenges/history';
import { useChallengeHistoryScores, useMyChallenge, useMyPartner } from '@/features/challenges/hooks';
import { activityNoun } from '@/features/plans/activity';
import { amountLine } from '@/features/plans/amounts';
import { cadenceLabel } from '@/features/plans/cadence';
import {
  usePairPlan,
  useRepairDebt,
  useSessionStreak,
  useStartMeetupPlan
} from '@/features/plans/hooks';
import { useProfile } from '@/features/profile/hooks';
import { useSession } from '@/providers/session-provider';
import { theme } from '@/constants/theme';
import { notify } from '@/lib/alert';
import { usePullRefresh } from '@/lib/use-pull-refresh';

// The six that can plan a session. A challenge still on a retired habit has
// no activity, so there is nothing to plan and no button is offered.
const SESSION_ACTIVITIES = ['running', 'jogging', 'walking', 'cycling', 'yoga', 'home_workouts'];

function firstName(name?: string | null) {
  return (name ?? '').trim().split(/\s+/)[0] || null;
}

// The Challenges tab owns the CHALLENGE LIFECYCLE and nothing else: the
// commitment, planning a session, the day of, misses and repair, the streak,
// and history. Rebuilt on the weekly model on 2 October; the daily screen it
// replaces (TODAY, "Mark as done", "Day 5 of 7", the nudge, the solo panel) is
// gone, not hidden.
//
// Deliberately NOT here, so do not add them back:
//   - partner search, invites and match banners. Find owns every partner path;
//     the commitment card hands off to it with a button
//   - a "this week" card or a weekly counter. A circle carries its own day
//   - the partner's why. The why is private
//   - anything that resets. A miss costs the circle and one session owed
export default function ChallengesScreen() {
  const { session } = useSession();
  const tabBarClearance = useTabBarClearance();
  const topBar = useTopBar();
  const userId = session?.user.id;
  const challengeQ = useMyChallenge(userId);
  const profileQ = useProfile(userId);
  // The partner comes from the partnership, not the challenge row: ending a
  // challenge does not end the match, so "You + Gayan" has to survive having
  // no challenge at all.
  const partnerQ = useMyPartner(userId);
  const historyQ = useChallengeHistoryScores(userId);

  const challenge = challengeQ.data ?? null;
  const myPartner = partnerQ.data?.partnered ? partnerQ.data : null;
  const partnered = Boolean(myPartner);
  const partnerState = partnered ? 'partnered' : partnerStateOf(challenge);
  const partnerName = myPartner?.first_name ?? null;
  const activityKey = (challenge?.challenge_templates?.activity_key ?? null) as string | null;
  const canPlan = SESSION_ACTIVITIES.includes(activityKey ?? '');

  const planQ = usePairPlan(partnered ? challenge?.id : undefined);
  const startSession = useStartMeetupPlan();
  // The streak belongs to the challenge, not the partnership: it is read for
  // any challenge and survives a partner leaving. The debt needs the partner.
  const streakQ = useSessionStreak(challenge?.id);
  const repairQ = useRepairDebt(partnered ? challenge?.id : undefined);
  const plan = planQ.data ?? null;
  const streak = streakQ.data;
  const repairDebt = repairQ.data && repairQ.data.owed ? repairQ.data : null;

  // "How long a streak?" is asked once the first plan has been accepted, or as
  // soon as there is a session to show. Never before a plan exists.
  const askStreakTarget =
    Boolean(challenge?.id) &&
    streak != null &&
    streak.target == null &&
    (streak.circles.length > 0 || (plan != null && plan.status !== 'planning'));

  const openFind = () => router.push('/(tabs)/find');
  const openPlan = (id: string) => router.push({ pathname: '/plan/[challengeId]', params: { challengeId: id } });
  const openStreakTarget = (id: string) =>
    router.push({ pathname: '/modals/streak-target', params: { challengeId: id } } as never);

  const onPlanSession = async () => {
    if (!challenge?.id) return;
    try {
      const res = (await startSession.mutateAsync(challenge.id)) as { ok?: boolean; reason?: string };
      // Still partners, but they have ended their challenge and not picked the
      // next activity yet, so there is nothing of theirs to plan toward.
      if (res?.ok === false && res.reason === 'partner_no_challenge') {
        notify('Not yet', `${partnerName ?? 'Your partner'} is choosing a new activity. You can plan once they have.`);
        return;
      }
      // "already_planning" is not a failure: there is a plan, so open it.
      if (res?.ok === false && res.reason !== 'already_planning') {
        notify('Could not start that', 'Please try again.');
        return;
      }
      openPlan(challenge.id);
    } catch (error: any) {
      notify('Could not start that', error.message);
    }
  };

  const { refreshing, onRefresh } = usePullRefresh(() =>
    Promise.all([
      challengeQ.refetch(),
      partnerQ.refetch(),
      planQ.refetch(),
      streakQ.refetch(),
      repairQ.refetch(),
      historyQ.refetch()
    ])
  );

  // Both of these used to drop AppTopBar entirely, so the bar vanished while
  // the screen loaded and reappeared when it settled (#121). They carry it
  // now, with the same clearance the loaded branch leaves.
  if (challengeQ.isLoading) {
    return (
      <View style={styles.root}>
        <AppTopBar />
        <View style={{ paddingTop: topBar.clearance }}>
          <LoadingState />
        </View>
      </View>
    );
  }

  if (challengeQ.isError) {
    return (
      <View style={styles.root}>
        <AppTopBar />
        <View style={{ paddingTop: topBar.clearance }}>
          <ErrorState message={(challengeQ.error as Error).message} onRetry={() => challengeQ.refetch()} />
        </View>
      </View>
    );
  }

  const history = historyQ.data ?? [];

  return (
    <View style={styles.root}>
      {/* No partner menu here any more: End match, Report and Block all live
          on Find's matched card, which is where every partner action belongs. */}
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
            tintColor={theme.colors.primary}
          />
        }
      >
        <AppText style={styles.pageTitle}>Challenges</AppText>

        {!challenge ? (
          <Animated.View entering={FadeInDown.duration(360)} style={styles.empty}>
            {/* No challenge, still a partner. This is the state the partnerships
                table exists for: the match did not end with the challenge. */}
            {partnerName ? <AppText style={styles.emptyPair}>You + {partnerName}</AppText> : null}
            <AppText style={styles.emptyTitle}>Start something together</AppText>
            <AppText style={styles.emptyBody}>
              {partnerName
                ? `Pick what you and ${partnerName} will do next.`
                : 'Pick what you want to do with your partner.'}
            </AppText>
            <Button label="Let's do this" onPress={() => router.push('/challenge/browse')} />
          </Animated.View>
        ) : (
          <>
            <CommitmentCard
              activity={challengeHabitTitle(challenge) ?? 'Your commitment'}
              exercises={
                activityKey === 'home_workouts' ? (((challenge as any).exercises as string[] | null) ?? []) : []
              }
              // Both come from the plan, where they were agreed. With no
              // partner there is no plan and so neither is shown.
              amounts={plan ? amountLine(plan) : null}
              cadence={cadenceLabel(plan?.cadence ?? streak?.cadence ?? null)}
              partnerState={partnerState}
              partnerFirstName={partnerName}
              agreed={(streak?.circles.length ?? 0) > 0 || (plan != null && plan.status !== 'planning')}
              onChangeActivity={() => router.push('/challenge/browse')}
              onOpenFind={openFind}
            />

            {/* A missed session, and when to make it up. While a debt is open
                it is the next thing to decide, so it sits above the plan. */}
            {repairDebt ? (
              <RepairCard
                debt={repairDebt}
                userChallengeId={challenge.id}
                partnerFirstName={partnerName ?? 'your partner'}
              />
            ) : null}

            {/* The session: the plan while there is one, otherwise the way to
                start the next. One at a time. */}
            {partnered && plan ? (
              <PlanGateCard
                plan={plan}
                userChallengeId={challenge.id}
                myName={firstName(profileQ.data?.full_name) ?? 'You'}
                myAvatarUrl={profileQ.data?.avatar_url ?? null}
              />
            ) : partnered && canPlan && planQ.isSuccess ? (
              <View style={styles.next}>
                <AppText style={styles.nextHeading}>Nothing planned yet.</AppText>
                <AppText style={styles.nextBody}>
                  Sessions are planned one at a time. {partnerName ?? 'Your partner'} agrees each one.
                </AppText>
                <Button
                  label={`Plan your next ${activityNoun(activityKey)}`}
                  loading={startSession.isPending}
                  onPress={onPlanSession}
                />
              </View>
            ) : null}

            {/* The streak: the only standing number on this tab. */}
            {streak?.target ? <StreakCircles streak={streak} /> : null}
            {askStreakTarget ? (
              <View style={styles.next}>
                <AppText style={styles.nextHeading}>How long a streak?</AppText>
                <AppText style={styles.nextBody}>
                  Pick a number of sessions to aim for. It is yours, not the pair's.
                </AppText>
                <Button label="Pick your streak" onPress={() => openStreakTarget(challenge.id)} />
              </View>
            ) : null}
            {/* All N circles resolved: offer the next length straight away. */}
            {streak?.complete ? (
              <Button label="Extend your streak" variant="ghost" onPress={() => openStreakTarget(challenge.id)} />
            ) : null}

            {/* No "End this challenge" here (#123). Ending still exists, on
                the challenge detail screen's menu, just not on the tab. */}
          </>
        )}

        {/* History: finished challenges. Not tappable. */}
        {history.length ? (
          <View style={styles.history}>
            <AppText style={styles.historyTitle}>History</AppText>
            {history.map((h) => (
              <View key={h.id} style={styles.historyRow}>
                <AppText style={styles.historyActivity}>{h.title ?? 'A challenge'}</AppText>
                <AppText style={styles.historyMeta}>{historyLine(h)}</AppText>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 22, paddingBottom: theme.spacing(5) },
  // .p-h1: 24 / 300 / ls -.5 / lh 1.28 (choner-challenges-tab.html:117). The
  // size and weight were right; the tracking and leading were missing.
  pageTitle: {
    fontFamily: theme.fonts.body,
    fontSize: 24,
    letterSpacing: -0.5,
    lineHeight: 31,
    color: theme.colors.text,
    marginBottom: theme.spacing(2)
  },
  empty: { gap: theme.spacing(1.5), paddingVertical: theme.spacing(4) },
  emptyPair: { fontSize: 15, color: theme.colors.primary2, fontFamily: theme.fonts.bodyMedium },
  emptyTitle: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 20,
    letterSpacing: -0.3,
    lineHeight: 25,
    color: theme.colors.text
  },
  emptyBody: {
    fontFamily: theme.fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.muted
  },
  next: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(253,131,2,0.28)',
    gap: 8
  },
  nextHeading: { fontFamily: theme.fonts.bodyMedium, fontSize: 19, color: theme.colors.text },
  nextBody: {
    fontFamily: theme.fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
    color: theme.colors.muted
  },
  history: {
    marginTop: theme.spacing(2),
    paddingTop: theme.spacing(2),
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    gap: theme.spacing(1.5)
  },
  historyTitle: {
    fontFamily: theme.fonts.bodyBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: theme.colors.muted
  },
  historyRow: { gap: 2 },
  historyActivity: { fontFamily: theme.fonts.bodyMedium, fontSize: 15, color: theme.colors.text },
  historyMeta: { fontFamily: theme.fonts.bodyRegular, fontSize: 12, color: theme.colors.muted }
});
