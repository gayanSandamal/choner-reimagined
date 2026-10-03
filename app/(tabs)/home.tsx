import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AppTopBar, useTopBar } from '@/components/navigation/AppTopBar';
import { activityIcon } from '@/components/home/activityIcons';
import { useTabBarClearance } from '@/components/navigation/CustomTabBar';
import { AppText } from '@/components/ui/AppText';
import { LoadingState, ErrorState } from '@/components/ui/StateViews';
import { HomeHeart } from '@/components/home/HomeHeart';
import { HomeHeroCard } from '@/components/home/HomeHeroCard';
import { JustHappened, PulseCard } from '@/components/home/PulseCard';
import { challengeHabitTitle, partnerStateOf } from '@/features/challenges/api';
import { useMyChallenge, useMyPartner } from '@/features/challenges/hooks';
import { useHomePulse } from '@/features/home/api';
import { homeHero } from '@/features/home/hero';
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

function greetingFor(date = new Date()) {
  const h = date.getHours();
  if (h < 5) return 'Up late';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 21) return 'Good evening';
  return 'Good night';
}

// Home: a living view of your commitment.
//
// Greeting, the shared heart, the commitment with its single next action, then
// Choner Pulse and Just Happened. Rebuilt on the weekly model on 3 October.
// The daily screen it replaces is gone: no check-in, no task list, no "log it
// before 8pm", no reason line, no share prompt.
//
// HOME NEVER DOES ANOTHER TAB'S WORK. Its one button either switches tab
// (Find for anything about a partner, Challenges for anything about the
// challenge) or opens a sheet about the commitment already on screen: the
// plan. It starts no search, sends no invite, and picks no challenge.
export default function HomeScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const tabBarClearance = useTabBarClearance();
  const topBar = useTopBar();
  const profileQ = useProfile(userId);
  const challengeQ = useMyChallenge(userId);
  const partnerQ = useMyPartner(userId);
  const pulseQ = useHomePulse(userId);

  const challenge = challengeQ.data ?? null;
  // The partner comes from the partnership, which outlives a challenge.
  const partner = partnerQ.data?.partnered ? partnerQ.data : null;
  const planQ = usePairPlan(partner && challenge ? challenge.id : undefined);
  const streakQ = useSessionStreak(challenge?.id);
  const repairQ = useRepairDebt(partner && challenge ? challenge.id : undefined);
  const startSession = useStartMeetupPlan();

  const hero = homeHero({
    activity: challenge ? challengeHabitTitle(challenge) ?? 'Your challenge' : null,
    activityKey: (challenge?.challenge_templates?.activity_key ?? null) as string | null,
    partnerState: partnerStateOf(challenge),
    partnerName: partner?.first_name ?? null,
    plan: planQ.data ?? null,
    agreedBefore: (streakQ.data?.circles.length ?? 0) > 0,
    repairOwed: Boolean(repairQ.data && repairQ.data.owed && repairQ.data.state === 'owed')
  });

  const openPlan = () => {
    if (challenge?.id) router.push({ pathname: '/plan/[challengeId]', params: { challengeId: challenge.id } });
  };

  const onAction = async () => {
    const action = hero.action;
    if (!action) return;
    if (action.to === 'find') return router.push('/(tabs)/find');
    if (action.to === 'challenges') return router.push('/(tabs)/challenges');
    if (action.to === 'plan') return openPlan();
    // start_session: open the next plan, then show it.
    if (!challenge?.id) return;
    try {
      const res = (await startSession.mutateAsync(challenge.id)) as { ok?: boolean; reason?: string };
      if (res?.ok === false && res.reason === 'partner_no_challenge') {
        notify('Not yet', `${partner?.first_name ?? 'Your partner'} is choosing a new activity. You can plan once they have.`);
        return;
      }
      if (res?.ok === false && res.reason !== 'already_planning') {
        notify('Could not start that', 'Please try again.');
        return;
      }
      openPlan();
    } catch (error: any) {
      notify('Could not start that', error.message);
    }
  };

  const { refreshing, onRefresh } = usePullRefresh(() =>
    Promise.all([
      challengeQ.refetch(),
      profileQ.refetch(),
      partnerQ.refetch(),
      planQ.refetch(),
      streakQ.refetch(),
      repairQ.refetch(),
      pulseQ.refetch()
    ])
  );

  const firstName = profileQ.data?.full_name?.split(' ')[0];

  return (
    <View style={styles.root}>
      <View style={styles.safe}>
        <AppTopBar />
        <ScrollView
          {...topBar.scrollProps}
          contentContainerStyle={[styles.content, { paddingTop: topBar.contentTop, paddingBottom: tabBarClearance }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} progressViewOffset={topBar.progressViewOffset} tintColor={theme.colors.primary} />}
        >
          {/* The prototype's .greet1: one line, the name carries the weight. */}
          <AppText style={styles.greeting}>
            {greetingFor()}
            {firstName ? (
              <>
                {', '}
                <AppText style={styles.name}>{firstName}</AppText>
              </>
            ) : null}
          </AppText>

          {challengeQ.isLoading || partnerQ.isLoading ? (
            <LoadingState />
          ) : challengeQ.isError ? (
            <ErrorState message={(challengeQ.error as Error).message} onRetry={() => challengeQ.refetch()} />
          ) : (
            <>
              <HomeHeart
                partnerName={partner?.first_name ?? null}
                partnerState={partnerStateOf(challenge)}
                sessionsTogether={partner?.sessions_together ?? 0}
              />
              <HomeHeroCard
                hero={hero}
                icon={challenge ? activityIcon(challenge.challenge_templates?.activity_key as string | undefined) : null}
                busy={startSession.isPending}
                onAction={onAction}
                onOpenFind={() => router.push('/(tabs)/find')}
              />
            </>
          )}

          {/* Decorative: Home is complete without it, so it never blocks or errors the screen. */}
          {pulseQ.data ? (
            <>
              <PulseCard pulse={pulseQ.data} onOpenDirectory={() => router.push('/find/who-else')} />
              <JustHappened pulse={pulseQ.data} />
            </>
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  safe: { flex: 1 },
  content: { padding: 20, paddingTop: 0, paddingBottom: theme.spacing(4), gap: theme.spacing(2) },
  greeting: { fontSize: 15, lineHeight: 26, color: theme.colors.muted },
  name: { fontFamily: theme.fonts.bodyMedium, fontSize: 19, color: theme.colors.text }
});
