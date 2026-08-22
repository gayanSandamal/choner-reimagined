import { useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppTopBar } from '@/components/navigation/AppTopBar';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/StateViews';
import { Heart } from '@/components/challenges/Heart';
import { MatchCard } from '@/components/challenges/MatchCard';
import { challengeHabitTitle, isDailySearchLimit, partnerStateOf } from '@/features/challenges/api';
import {
  useMyChallenge,
  useJoinMatchPool,
  useLeaveMatchPool,
  useMyMatch
} from '@/features/challenges/hooks';
import { usePartnerStatus } from '@/features/community/hooks';
import { useProfile } from '@/features/profile/hooks';
import { useSession } from '@/providers/session-provider';
import { MATCHING_PROOF } from '@/constants/proof';
import { theme } from '@/constants/theme';
import { notify } from '@/lib/alert';

const ORANGE = '#FE8C00';
const ORANGE_SOFT = '#ffb355';
const GREEN = '#4fc98a';
const DIM = '#2c4759';
const BORDER = '#0e3448';

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

  // A habit someone invented has nobody else in the pool doing it, so Find
  // cannot help — the same rule Step 3 enforces, stated here rather than
  // failing at the RPC.
  const isCustomHabit = Boolean(challenge?.custom_habit_title);

  const onFind = async () => {
    if (!challenge?.id) {
      router.push('/challenge/browse');
      return;
    }
    try {
      await joinPool.mutateAsync({ userChallengeId: challenge.id });
    } catch (error: any) {
      // The limit is an ordinary answer, not a failure — the raw Postgres
      // exception text is no use to anybody reading it on a phone.
      if (isDailySearchLimit(error)) {
        notify(
          "That's today's searches",
          'You get three partner searches a day. Try again tomorrow, or invite someone you know.'
        );
        return;
      }
      notify('Could not start looking', error.message);
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
    <SafeAreaView style={styles.root}>
      <AppTopBar />
      <ScrollView
        contentContainerStyle={styles.content}
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
          <MatchCard city={city} watch />
        ) : partnerState === 'partnered' ? (
          <PairedState
            partnerName={firstName(partnerStatusQ.data?.name)}
            habit={habit}
          />
        ) : partnerState === 'finding' ? (
          <SearchingState
            habit={habit}
            city={city}
            totalDays={totalDays}
            onCancel={onCancel}
            cancelling={leavePool.isPending}
            noMatch={Boolean(searchState?.matched === false && searchState.no_match)}
            searchesLeft={
              searchState?.matched === false ? searchState.searches_left ?? null : null
            }
            dailyLimit={searchState?.matched === false ? searchState.daily_limit ?? null : null}
          />
        ) : (
          <NoRequestState
            isCustomHabit={isCustomHabit}
            hasChallenge={Boolean(challenge)}
            busy={joinPool.isPending}
            onFind={onFind}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// State 1 — the real landing page for this tab, and for many people the first
// real exposure to the whole mechanic.
function NoRequestState({
  isCustomHabit,
  hasChallenge,
  busy,
  onFind
}: {
  isCustomHabit: boolean;
  hasChallenge: boolean;
  busy: boolean;
  onFind: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(360)}>
      <View style={styles.hero}>
        <Heart youCheckedIn={false} partnerCheckedIn={false} partnerState="solo" width={150} />
      </View>

      <AppText style={styles.headline}>
        Not everyone has a partner.{'\n'}
        <AppText style={styles.headlineAccent}>That's the point.</AppText>
      </AppText>
      <AppText style={styles.sub}>
        If you don't know someone chasing the same habit, we'll help you find them.
      </AppText>

      <View style={styles.proof}>
        <AppText style={styles.proofNum}>{MATCHING_PROOF.ratio}</AppText>
        <AppText style={styles.proofText}>
          <AppText style={styles.proofTextStrong}>{MATCHING_PROOF.lead}</AppText>{' '}
          {MATCHING_PROOF.tail}
        </AppText>
      </View>

      <View style={styles.steps}>
        <Step n="1" title="Pick your habit" detail="Same one you're already committed to." />
        <Step n="2" title="We look for a match" detail="Someone nearby, same habit, same goal." />
        <Step n="3" title="You both confirm" detail="Nothing starts until you both say yes." />
      </View>

      {isCustomHabit ? (
        <View style={styles.customNote}>
          <AppText style={styles.customNoteText}>
            Finding a partner works best with our suggested challenges — since you picked your own,
            try inviting someone you know.
          </AppText>
          <Button
            label="Invite someone"
            variant="secondary"
            onPress={() => router.push('/group/invite')}
          />
        </View>
      ) : (
        <>
          <Button
            label={hasChallenge ? 'Find my partner' : 'Pick a challenge first'}
            loading={busy}
            onPress={onFind}
          />
          {/* Honesty: matching is a person reading a list, not an algorithm. */}
          <AppText style={styles.note}>
            We look as soon as you ask, and keep looking every few minutes after that.
          </AppText>
        </>
      )}
    </Animated.View>
  );
}

function Step({ n, title, detail }: { n: string; title: string; detail: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <AppText style={styles.stepNumText}>{n}</AppText>
      </View>
      <View style={styles.stepBody}>
        <AppText style={styles.stepTitle}>{title}</AppText>
        <AppText style={styles.stepDetail}>{detail}</AppText>
      </View>
    </View>
  );
}

// State 2 — the search itself, now this tab's primary content rather than a
// sub-state of somewhere else.
function SearchingState({
  habit,
  city,
  totalDays,
  onCancel,
  cancelling,
  noMatch,
  searchesLeft,
  dailyLimit
}: {
  habit: string | null;
  city: string | null;
  totalDays: number;
  onCancel: () => void;
  cancelling: boolean;
  // We looked and nobody cleared the bar. Not the same as "give it a second":
  // with nobody suitable doing this habit, waiting may never resolve at all.
  noMatch: boolean;
  searchesLeft: number | null;
  dailyLimit: number | null;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(360)}>
      <Heart youCheckedIn={false} partnerCheckedIn={false} partnerState="finding" />

      <View style={styles.searchStatus}>
        {noMatch ? (
          <>
            <AppText style={styles.searchHead}>Nobody free right now</AppText>
            <AppText style={styles.searchDetail}>
              We looked, and no one doing{' '}
              <AppText style={styles.searchHabit}>{habit ?? 'your habit'}</AppText> is available to
              pair with today.{'\n'}You'll stay in the queue and we'll keep checking — or invite
              someone you know.
            </AppText>
          </>
        ) : (
          <>
            <AppText style={styles.searchHead}>Looking for your partner</AppText>
            <AppText style={styles.searchDetail}>
              Matching people doing{' '}
              <AppText style={styles.searchHabit}>{habit ?? 'your habit'}</AppText> right now.
              {'\n'}Usually within a minute or two.
            </AppText>
          </>
        )}
        {searchesLeft !== null && dailyLimit !== null ? (
          <AppText style={styles.searchQuota}>
            {searchesLeft} of {dailyLimit} searches left today
          </AppText>
        ) : null}
      </View>

      <View style={styles.card}>
        <AppText style={styles.cardLabel}>YOUR REQUEST</AppText>
        <AppText style={styles.cardHabit}>{habit ?? 'Your habit'}</AppText>
        <AppText style={styles.cardSub}>
          {[`${totalDays}-day challenge`, city].filter(Boolean).join(' · ')}
        </AppText>
      </View>

      <View style={styles.linkRow}>
        <Pressable onPress={() => router.push('/group/invite')}>
          <AppText style={styles.link}>Invite someone instead</AppText>
        </Pressable>
        <Pressable onPress={onCancel} disabled={cancelling}>
          <AppText style={styles.linkQuiet}>{cancelling ? 'Cancelling…' : 'Cancel search'}</AppText>
        </Pressable>
      </View>
    </Animated.View>
  );
}

// State 4 — where most returning users land. Deliberately hands off to
// Challenges rather than repeating what Challenges already owns.
function PairedState({ partnerName, habit }: { partnerName: string; habit: string | null }) {
  return (
    <Animated.View entering={FadeInDown.duration(360)} style={styles.paired}>
      <View style={styles.pairedIcon}>
        <Ionicons name="checkmark" size={24} color={GREEN} />
      </View>
      <AppText style={styles.pairedTitle}>You're all set</AppText>
      <AppText style={styles.pairedBody}>
        You and <AppText style={styles.pairedStrong}>{partnerName}</AppText> are already partners on{' '}
        <AppText style={styles.pairedStrong}>{habit ?? 'your challenge'}</AppText>. Manage your
        streak and check-ins from Challenges.
      </AppText>
      <Button label="Go to Challenges" onPress={() => router.push('/(tabs)/challenges')} />
      <AppText style={styles.note}>
        Starting a new habit later? You can find a partner for that one too.
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
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
    backgroundColor: 'rgba(254,140,0,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(254,140,0,0.2)',
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
    borderColor: 'rgba(254,140,0,0.4)',
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
    backgroundColor: '#04202f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
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
  pairedStrong: { color: theme.colors.text, fontFamily: theme.fonts.bodyBold }
});
