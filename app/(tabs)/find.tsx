import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppTopBar } from '@/components/navigation/AppTopBar';
import { useTabBarClearance } from '@/components/navigation/CustomTabBar';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/StateViews';
import { Heart } from '@/components/challenges/Heart';
import { Avatar } from '@/components/ui/Avatar';
import { Radar } from '@/components/challenges/Radar';
import { PressableScale } from '@/components/ui/PressableScale';
import { MatchCard } from '@/components/challenges/MatchCard';
import { PairSafetyMenu } from '@/components/safety/PairSafetyMenu';
import { MatchReportLink } from '@/components/safety/MatchReportLink';
import { challengeHabitTitle, isDailySearchLimit, partnerStateOf } from '@/features/challenges/api';
import {
  useMyChallenge,
  useJoinMatchPool,
  useDeclineMatch,
  useLeaveMatchPool,
  useLocations,
  useMyMatch
} from '@/features/challenges/hooks';
import { usePartnerStatus } from '@/features/community/hooks';
import { useProfile } from '@/features/profile/hooks';
import { useSession } from '@/providers/session-provider';
import { theme } from '@/constants/theme';
import { consumeDeclineNotice, DECLINE_NOTICE, raiseDeclineNotice } from '@/features/challenges/decline-notice';
import { confirmAction, notify } from '@/lib/alert';

const ORANGE = '#FD8302';
const ORANGE_SOFT = '#FDA340';
const GREEN = '#2E9E6B';
const DIM = '#D8D2CC';
const BORDER = '#F4F2EF';

function firstName(name?: string | null) {
  return (name ?? '').trim().split(/\s+/)[0] || 'your partner';
}

// The Find tab.
//
// Every other tab assumes a partner already exists or is being managed. This
// one has to sell the idea of getting one in the first place — which is why it
// is allowed to be persuasive rather than purely functional, and why the
// objection ("why not just text a friend?") is named in the headline instead of
// being left for the user to raise.
export default function FindScreen() {
  const { session } = useSession();
  const tabBarClearance = useTabBarClearance();
  const userId = session?.user.id;
  // Poll while this screen is the one waiting on the matcher. The state it
  // renders comes from partner_state, which the matcher changes server-side, so
  // without this the Searching screen depends entirely on a realtime frame
  // arriving.
  const [watchForMatch, setWatchForMatch] = useState(false);
  const challengeQ = useMyChallenge(userId, watchForMatch);
  // Carries the no-match flag and the day's remaining searches, not just the
  // match itself — this one call answers every state this screen can be in.
  const searchState = useMyMatch(userId, watchForMatch).data;
  const profileQ = useProfile(userId);
  const partnerStatusQ = usePartnerStatus(userId);
  const joinPool = useJoinMatchPool();
  const leavePool = useLeaveMatchPool();
  const declineMatch = useDeclineMatch();

  const challenge = challengeQ.data ?? null;
  const partnerState = partnerStateOf(challenge);

  // Derived after the fact rather than passed in, because the value it depends
  // on comes out of the very query it controls.
  useEffect(() => {
    setWatchForMatch(partnerState === 'finding' || partnerState === 'matched');
  }, [partnerState]);
  const habit = challengeHabitTitle(challenge);
  const city = profileQ.data?.city ?? null;
  const totalDays = challenge?.challenge_templates?.duration_days ?? 7;
  // The template carries the unit and activity the copy is built from.
  const template = challenge?.challenge_templates ?? null;
  // Real suburb once they've set one; the timezone-derived city is a poor
  // stand-in (it is 'Colombo' for everyone here) so it is only a fallback.
  const locationsQ = useLocations();
  const suburbLabel =
    locationsQ.data?.find((l) => l.value === (challenge as any)?.preferred_location)?.label ?? null;

  // A habit someone invented has nobody else in the pool doing it, so Find
  // cannot help — the same rule Step 3 enforces, stated here rather than
  // failing at the RPC.
  const isCustomHabit = Boolean(challenge?.custom_habit_title);

  // The tap is intent, not submission: it opens the form, and the pool join
  // happens there once the matching questions are answered.
  const onFind = () => {
    if (!challenge?.id) {
      router.push('/challenge/browse');
      return;
    }
    router.push('/find/form');
  };

  // Back out of THIS pairing but stay in the pool — the spec's "keep looking":
  // the request stays open and the form doesn't need re-filling. Declining
  // (rather than just withdrawing the yes) matters because leaving it pending
  // with nobody committed would strand the other person too.
  const onFindSomeoneElse = async () => {
    const matchId = searchState?.matched ? searchState.match_id : null;
    if (!matchId) return;
    const ok = await confirmAction({
      title: 'Find someone else?',
      message:
        "You'll go back to looking, and so will they. This pairing won't be suggested again.",
      confirmLabel: 'Find someone else',
      cancelLabel: 'Keep waiting'
    });
    if (!ok) return;
    try {
      await declineMatch.mutateAsync(matchId);
      raiseDeclineNotice();
    } catch (error: any) {
      notify('Could not do that', error.message);
    }
  };

  // Out of the pool altogether. Declining first so the other person is
  // released rather than left waiting on a match that can never complete.
  const onStopLooking = async () => {
    const matchId = searchState?.matched ? searchState.match_id : null;
    if (!challenge?.id) return;
    const ok = await confirmAction({
      title: 'Stop looking?',
      message:
        "We'll take you out of the pool. Your challenge carries on solo, and you can start looking again whenever you want.",
      confirmLabel: 'Stop looking',
      cancelLabel: 'Keep waiting',
      destructive: true
    });
    if (!ok) return;
    try {
      if (matchId) await declineMatch.mutateAsync(matchId);
      await leavePool.mutateAsync(challenge.id);
    } catch (error: any) {
      notify('Could not stop', error.message);
    }
  };

  const onCancel = async () => {
    if (!challenge?.id) return;
    try {
      await leavePool.mutateAsync(challenge.id);
    } catch (error: any) {
      notify('Could not cancel', error.message);
    }
  };

  const onRefresh = () => {
    challengeQ.refetch();
    partnerStatusQ.refetch();
  };

  if (challengeQ.isLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <AppTopBar />
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <AppTopBar
        accessory={
          partnerState === 'partnered' && challenge?.id ? (
            <PairSafetyMenu
              userChallengeId={challenge.id}
              partnerFirstName={firstName(partnerStatusQ.data?.name)}
            />
          ) : null
        }
      />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: tabBarClearance }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={challengeQ.isRefetching}
            onRefresh={onRefresh}
            tintColor={ORANGE}
          />
        }
      >
        <AppText style={styles.pageTitle}>Find</AppText>

        {partnerState === 'matched' ? (
          // One-sided confirmation gets its own holding state rather than
          // jumping straight to Paired.
          searchState?.matched && searchState.i_confirmed && !searchState.they_confirmed ? (
            <WaitingConfirmState
              matchId={searchState.match_id}
              partnerName={searchState.partner_first_name ?? 'them'}
              onFindSomeoneElse={onFindSomeoneElse}
              onStopLooking={onStopLooking}
              busy={declineMatch.isPending || leavePool.isPending}
            />
          ) : (
            <MatchCard city={suburbLabel ?? city} watch />
          )
        ) : partnerState === 'partnered' ? (
          <PairedState
            partnerName={firstName(partnerStatusQ.data?.name)}
            partnerAvatarUrl={partnerStatusQ.data?.avatar_url ?? null}
            habit={habit}
          />
        ) : partnerState === 'finding' ? (
          <SearchingState
            habit={habit}
            suburb={suburbLabel}
            commitment={challenge?.commitment_value ?? null}
            unit={template?.unit ?? null}
            onCancel={onCancel}
            cancelling={leavePool.isPending}
            noMatch={Boolean(searchState?.matched === false && searchState.no_match)}
            searchesLeft={
              searchState?.matched === false ? searchState.searches_left ?? null : null
            }
            dailyLimit={searchState?.matched === false ? searchState.daily_limit ?? null : null}
          />
        ) : (
          <LandingState
            isCustomHabit={isCustomHabit}
            hasChallenge={Boolean(challenge)}
            habit={habit}
            commitment={challenge?.commitment_value ?? null}
            unit={template?.unit ?? null}
            cadence={challenge?.days_per_week ?? null}
            suburb={suburbLabel}
            onStart={onFind}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// State 1 — the real landing page for this tab, and for many people the first
// real exposure to the whole mechanic.
// State 1 — Landing. Almost no UI on purpose: one tappable object and one
// line of copy. Find's only job here is to make someone WANT a partner, and
// it gets one shot at that.
function LandingState({
  isCustomHabit,
  hasChallenge,
  habit,
  commitment,
  unit,
  cadence,
  suburb,
  onStart
}: {
  isCustomHabit: boolean;
  hasChallenge: boolean;
  habit: string | null;
  commitment: number | null;
  unit: string | null;
  cadence: number | null;
  suburb: string | null;
  onStart: () => void;
}) {
  if (isCustomHabit) {
    return (
      <Animated.View entering={FadeInDown.duration(360)}>
        <AppText style={styles.sub}>
          Find can't help with a habit you wrote yourself — nobody else in the pool picked it.
          Swap to one of the set habits, or invite someone you know.
        </AppText>
        <Button label="Invite someone instead" onPress={() => router.push('/onboarding/invite')} />
      </Animated.View>
    );
  }

  if (!hasChallenge) {
    return (
      <Animated.View entering={FadeInDown.duration(360)}>
        <AppText style={styles.sub}>Pick a challenge first, then we can look for someone.</AppText>
        <Button label="Browse challenges" onPress={() => router.push('/challenge/browse')} />
      </Animated.View>
    );
  }

  const amount = commitment ? `${commitment}${unit ? ` ${unit}` : ''}` : null;

  return (
    <Animated.View entering={FadeInDown.duration(360)}>
      {/* Deliberately no area or amount: before a search has run, naming
          them is a claim about the pool the app can't back up. */}
      <AppText style={styles.sub}>Someone else is looking for you too.</AppText>

      <Radar searching={false} onPress={onStart} />

      <View style={styles.radarActivity}>
        <AppText style={styles.radarName}>{habit ?? 'Your challenge'}</AppText>
        <AppText style={styles.radarMeta}>
          {[amount, cadence === 7 ? 'every day' : cadence ? `${cadence}× a week` : null]
            .filter(Boolean)
            .join(' · ')}
        </AppText>
      </View>
    </Animated.View>
  );
}

// State 2 — the search itself, now this tab's primary content rather than a
// sub-state of somewhere else.
// State 3 — Searching. Same radar, visually escalated so it reads as the
// search waking up rather than a different screen.
function SearchingState({
  habit,
  suburb,
  commitment,
  unit,
  onCancel,
  cancelling,
  noMatch,
  searchesLeft,
  dailyLimit
}: {
  habit: string | null;
  suburb: string | null;
  commitment: number | null;
  unit: string | null;
  onCancel: () => void;
  cancelling: boolean;
  // We looked and nobody cleared the bar. Not the same as "give it a second":
  // with nobody suitable doing this habit, waiting may never resolve at all.
  noMatch: boolean;
  searchesLeft: number | null;
  dailyLimit: number | null;
}) {
  const [declined] = useState(consumeDeclineNotice);

  return (
    <Animated.View entering={FadeInDown.duration(360)}>
      {declined ? <AppText style={styles.declined}>{DECLINE_NOTICE}</AppText> : null}

      <Radar searching />

      <View style={styles.searchStatus}>
        <AppText style={styles.searchStatusTitle}>Looking…</AppText>
        {/* Notify, don't ask people to keep checking. The switch keys off the
            matcher's own "looked and found nobody" record, not a timer. */}
        <AppText style={styles.searchStatusBody}>
          {noMatch
            ? "No luck yet. You can close the app — we'll notify you the moment we find someone."
            : "We'll notify you the moment we find a match."}
        </AppText>
      </View>

      {searchesLeft != null && dailyLimit != null ? (
        <AppText style={styles.note}>
          {searchesLeft} of {dailyLimit} searches left today.
        </AppText>
      ) : null}

      {/* The Back the handover asks for. Searching is a tab root rendered from
          server state, so "back to the form" means editing your answers while
          staying in the pool — the form prefills them, and re-submitting
          doesn't spend a search. Leaving the pool is "Stop looking". */}
      <Button label="Edit answers" variant="ghost" onPress={() => router.push('/find/form')} />
      <Button
        label="Stop looking"
        variant="ghost"
        loading={cancelling}
        onPress={onCancel}
      />
    </Animated.View>
  );
}

// State 4b — one side has confirmed, the other hasn't. Without this the
// button appears to do nothing until the partner acts.
function WaitingConfirmState({
  matchId,
  partnerName,
  onFindSomeoneElse,
  onStopLooking,
  busy
}: {
  matchId: string;
  partnerName: string;
  onFindSomeoneElse: () => void;
  onStopLooking: () => void;
  busy: boolean;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(360)} style={styles.paired}>
      <View style={styles.pairedIcon}>
        <Ionicons name="hourglass-outline" size={22} color={theme.colors.primary} />
      </View>
      <AppText style={styles.pairedBody}>
        You're in. Waiting for {partnerName} to accept. Saying hi unlocks once you both have
        accepted.
      </AppText>

      {/* Two distinct intents, stated separately. A single "cancel" conflated
          them: backing out of THIS pairing and leaving the pool entirely are
          different things, and the word "cancel" reads as the second while
          declining a match actually does the first. */}
      <Button
        label="Find someone else"
        variant="ghost"
        disabled={busy}
        onPress={onFindSomeoneElse}
      />
      <Button label="Stop looking" variant="ghost" disabled={busy} onPress={onStopLooking} />
      <MatchReportLink matchId={matchId} partnerFirstName={partnerName} />
    </Animated.View>
  );
}

// State 5 — Paired. Hands off to Challenges rather than repeating what
// Challenges already owns.
function PairedState({
  partnerName,
  partnerAvatarUrl
}: {
  partnerName: string;
  partnerAvatarUrl: string | null;
  habit: string | null;
}) {
  // What Find shows every time it's opened while the pairing lasts — never the
  // radar again. The old one-liner ("partners on X. Track it from
  // Challenges.") is gone: the button below already says it.
  return (
    <Animated.View entering={FadeInDown.duration(360)}>
      <View style={styles.paired}>
        <Avatar uri={partnerAvatarUrl} name={partnerName} size={88} ring />
        <AppText style={styles.pairedTitle}>You and {partnerName}</AppText>
        <Button label="Go to Challenges" onPress={() => router.push('/(tabs)/challenges')} />
      </View>

      {/* Social proof, never a candidate list (handover §2.6). */}
      <View style={styles.anotherCard}>
        <AppText style={styles.anotherTitle}>Who else is here</AppText>
        <Button
          label="See Who Else Is Here"
          variant="ghost"
          onPress={() => router.push('/find/who-else')}
        />
      </View>

      {/* Find works per-challenge, not per-user — without this the tab becomes
          a dead end the moment someone matches once. */}
      <View style={styles.anotherCard}>
        <AppText style={styles.anotherTitle}>Starting another habit?</AppText>
        <AppText style={styles.anotherBody}>
          You can find a different partner for each challenge.
        </AppText>
        <PressableScale
          onPress={() => router.push('/challenge/browse')}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Find another partner"
        >
          <AppText style={styles.anotherLink}>Find another partner</AppText>
        </PressableScale>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  subStrong: { color: theme.colors.text, fontFamily: theme.fonts.bodyMedium },
  radarActivity: { alignItems: 'center', marginTop: 6 },
  radarName: { fontSize: 15, color: theme.colors.text, fontFamily: theme.fonts.bodyMedium },
  radarMeta: { fontSize: 12, color: theme.colors.muted, marginTop: 2 },
  searchStatusTitle: {
    fontSize: 14.5,
    color: theme.colors.primary2,
    fontFamily: theme.fonts.bodyMedium,
    textAlign: 'center'
  },
  searchStatusBody: {
    fontSize: 12,
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18
  },
  anotherCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.sm,
    padding: theme.spacing(2),
    alignItems: 'center',
    marginTop: theme.spacing(3),
    ...theme.shadow.sm
  },
  anotherTitle: { fontSize: 13, color: theme.colors.text, fontFamily: theme.fonts.bodyMedium },
  anotherBody: {
    fontSize: 11.5,
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 17
  },
  anotherLink: { fontSize: 13, color: theme.colors.primary2, fontFamily: theme.fonts.bodyMedium },
  content: { paddingHorizontal: 22, paddingBottom: theme.spacing(5) },
  pageTitle: {
    fontFamily: theme.fonts.body,
    fontSize: 24,
    color: theme.colors.text,
    marginTop: theme.spacing(1.5),
    marginBottom: theme.spacing(2.5)
  },
  hero: { marginBottom: theme.spacing(1) },
  headline: {
    textAlign: 'center',
    color: theme.colors.text,
    fontSize: 19,
    lineHeight: 27,
    marginBottom: 8
  },
  headlineAccent: { color: ORANGE_SOFT, fontFamily: theme.fonts.bodyBold },
  sub: {
    textAlign: 'center',
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 19,
    marginBottom: 24,
    paddingHorizontal: 6
  },
  proof: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'rgba(253,131,2,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(253,131,2,0.2)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 22
  },
  proofNum: { fontFamily: theme.fonts.bodyBold, fontSize: 26, color: ORANGE, lineHeight: 30 },
  // flexShrink rather than flex:0 — the latter maps to flex-basis:0% on RN web
  // and collapses the text to zero height.
  proofText: { flexShrink: 1, fontSize: 11, color: theme.colors.muted, lineHeight: 17 },
  proofTextStrong: { color: theme.colors.text, fontFamily: theme.fonts.bodyBold },
  steps: { marginBottom: 24, gap: 16 },
  step: { flexDirection: 'row', gap: 13 },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(253,131,2,0.4)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  stepNumText: { fontSize: 11, color: ORANGE, fontFamily: theme.fonts.bodyBold },
  stepBody: { flexShrink: 1, gap: 2 },
  stepTitle: { color: theme.colors.text, fontSize: 12.5, fontFamily: theme.fonts.bodyBold },
  stepDetail: { color: theme.colors.muted, fontSize: 11, lineHeight: 17 },
  note: { textAlign: 'center', color: DIM, fontSize: 10.5, marginTop: 14, lineHeight: 17 },
  customNote: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: BORDER,
    borderRadius: 16,
    padding: 16,
    gap: theme.spacing(1.5)
  },
  customNoteText: { color: theme.colors.muted, fontSize: 11.5, lineHeight: 18 },
  searchQuota: { fontSize: 10.5, color: DIM, marginTop: 10, textAlign: 'center' },
  searchStatus: { alignItems: 'center', marginTop: 6, marginBottom: 22 },
  searchHead: { color: ORANGE_SOFT, fontSize: 14, marginBottom: 6 },
  searchDetail: { color: theme.colors.muted, fontSize: 11.5, lineHeight: 18, textAlign: 'center' },
  searchHabit: { color: theme.colors.text, fontFamily: theme.fonts.bodyBold },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(28,43,51,0.04)',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16
  },
  cardLabel: { fontSize: 9.5, letterSpacing: 1.6, color: theme.colors.muted, marginBottom: 8 },
  cardHabit: { color: theme.colors.text, fontSize: 16, marginBottom: 4 },
  cardSub: { color: theme.colors.muted, fontSize: 11 },
  linkRow: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 6 },
  link: { color: ORANGE, fontSize: 12 },
  linkQuiet: { color: theme.colors.muted, fontSize: 12 },
  paired: { alignItems: 'center', paddingTop: 16, gap: theme.spacing(1) },
  pairedIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(79,201,138,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(79,201,138,0.25)',
    marginBottom: theme.spacing(1)
  },
  pairedTitle: { color: theme.colors.text, fontSize: 16 },
  pairedBody: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'center',
    maxWidth: 240,
    marginBottom: theme.spacing(1.5)
  },
  declined: {
    textAlign: 'center',
    color: theme.colors.text,
    fontSize: 12.5,
    lineHeight: 19,
    marginBottom: 12
  },
  pairedStrong: { color: theme.colors.text, fontFamily: theme.fonts.bodyBold }
});
