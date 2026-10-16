import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AppTopBar, useTopBar } from '@/components/navigation/AppTopBar';
import { useTabBarClearance } from '@/components/navigation/CustomTabBar';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { PressableScale } from '@/components/ui/PressableScale';
import { LoadingState } from '@/components/ui/StateViews';
import { Radar } from '@/components/challenges/Radar';
import { Icon } from '@/components/ui/Icon';
import { activityIcon } from '@/components/home/activityIcons';
import { MatchOffer } from '@/components/find/MatchOffer';
import { MatchedCard } from '@/components/find/MatchedCard';
import { challengeHabitTitle, partnerStateOf, setPartnerState } from '@/features/challenges/api';
import { consumeDeclineNotice, DECLINE_NOTICE } from '@/features/challenges/decline-notice';
import {
  useLeaveMatchPool,
  useMyChallenge,
  useMyMatch,
  useMyPartner
} from '@/features/challenges/hooks';
import { MATCH_EXPIRED_BODY, MATCH_EXPIRED_TITLE } from '@/features/challenges/match-clock';
import { usePendingInvites } from '@/features/community/hooks';
import { useProfile } from '@/features/profile/hooks';
import { shareInviteLink } from '@/lib/invite-link';
import { useSession } from '@/providers/session-provider';
import { theme } from '@/constants/theme';
import { notify } from '@/lib/alert';
import { usePullRefresh } from '@/lib/use-pull-refresh';

// The Find tab owns every partner path: the search, the invite, the match
// offer, and the match itself for as long as it lasts. Home and Challenges
// hand off to it and start none of these themselves.
//
// What it shows is decided by the server, in this order:
//   a partnership         the matched card (it outlives the challenge)
//   a match offer         offered / you accepted / expired, on one 24h clock
//   searching             the radar, awake
//   an invite sent        waiting for them to join
//   otherwise             the landing: the radar, and the doors next to it
export default function FindScreen() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const tabBarClearance = useTabBarClearance();
  const topBar = useTopBar();
  const userId = session?.user.id;
  // Poll while this screen is the one waiting on the matcher. The state it
  // renders comes from partner_state, which the matcher changes server-side, so
  // without this the Searching screen depends entirely on a realtime frame
  // arriving.
  const [watchForMatch, setWatchForMatch] = useState(false);
  const challengeQ = useMyChallenge(userId, watchForMatch);
  // Carries the no-match flag, the expired flag and the day's remaining
  // searches, not just the match itself: this one call answers every state
  // this screen can be in.
  const matchQ = useMyMatch(userId, watchForMatch);
  const searchState = matchQ.data;
  const profileQ = useProfile(userId);
  const leavePool = useLeaveMatchPool();

  const challenge = challengeQ.data ?? null;
  const partnerState = partnerStateOf(challenge);
  // The partnership, not the challenge: someone who has just ended their
  // challenge is still matched, and Find must show that rather than a radar.
  const partnerQ = useMyPartner(userId);
  const myPartner = partnerQ.data?.partnered ? partnerQ.data : null;

  // Derived after the fact rather than passed in, because the value it depends
  // on comes out of the very query it controls.
  useEffect(() => {
    setWatchForMatch(partnerState === 'finding' || partnerState === 'matched');
  }, [partnerState]);
  const habit = challengeHabitTitle(challenge);

  // A habit someone invented has nobody else in the pool doing it, so the
  // search cannot help. Stated here rather than failing at the RPC.
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

  const onStopSearch = async () => {
    if (!challenge?.id) return;
    try {
      await leavePool.mutateAsync(challenge.id);
    } catch (error: any) {
      notify('Could not stop', error.message);
    }
  };

  const { refreshing, onRefresh } = usePullRefresh(() =>
    Promise.all([
      challengeQ.refetch(),
      matchQ.refetch(),
      partnerQ.refetch(),
      queryClient.invalidateQueries({ queryKey: ['pending-invites'] })
    ])
  );

  if (challengeQ.isLoading) {
    return (
      <View style={[styles.root, { paddingTop: topBar.clearance }]}>
        <AppTopBar />
        <LoadingState />
      </View>
    );
  }

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
            tintColor={theme.colors.primary}
          />
        }
      >
        <AppText style={styles.pageTitle}>Find</AppText>

        {myPartner ? (
          // Matched: what Find shows for as long as the pairing lasts. Decided
          // from the partnership, so it holds between challenges too.
          <MatchedCard
            myName={profileQ.data?.full_name ?? null}
            myAvatarUrl={profileQ.data?.avatar_url ?? null}
            partnerName={myPartner.first_name}
            partnerAvatarUrl={myPartner.avatar_url}
            pairedOn={myPartner.paired_on}
            since={myPartner.since}
            challengeId={myPartner.my_challenge_id}
          />
        ) : searchState?.matched ? (
          <MatchOffer match={searchState} challengeId={challenge?.id ?? null} onRefresh={onRefresh} />
        ) : partnerState === 'finding' || partnerState === 'matched' ? (
          // 'matched' with no offer in hand is the moment between the matcher
          // writing the state and the offer arriving: still the search.
          <SearchingState
            onStop={onStopSearch}
            stopping={leavePool.isPending}
            noMatch={Boolean(searchState?.matched === false && searchState.no_match)}
            expired={Boolean(searchState?.matched === false && searchState.expired)}
            searchesLeft={searchState?.matched === false ? searchState.searches_left ?? null : null}
            dailyLimit={searchState?.matched === false ? searchState.daily_limit ?? null : null}
          />
        ) : partnerState === 'invited' && challenge ? (
          <InvitedState
            userId={userId}
            challengeId={challenge.id}
            inviterName={profileQ.data?.full_name ?? null}
          />
        ) : (
          <LandingState
            isCustomHabit={isCustomHabit}
            hasChallenge={Boolean(challenge)}
            habit={habit}
            activityKey={(challenge?.challenge_templates?.activity_key as string | null) ?? null}
            onStart={onFind}
          />
        )}
      </ScrollView>
    </View>
  );
}

// The prototype's .orl: a word with a rule either side (app_a.html:259-260).
function OrDivider() {
  return (
    <View style={styles.orl}>
      <View style={styles.orlRule} />
      <AppText style={styles.orlWord}>or</AppText>
      <View style={styles.orlRule} />
    </View>
  );
}

// The prototype's .dlink (app_a.html:300-302): a quiet card-coloured row with
// the icon left and a chevron right. NOT the orange outline Button this used
// to be — the directory is the last and least of the doors, under everything
// else, and an orange button made it read as the main thing to do (#125).
function DirectoryRow() {
  return (
    <PressableScale
      haptic="selection"
      accessibilityRole="button"
      accessibilityLabel="Already on the move"
      onPress={() => router.push('/find/who-else')}
      style={styles.dlink}
    >
      <Icon name="community" size={18} color={theme.colors.primary2} strokeWidth={1.8} />
      {/* No count on it. There is no real number, and a made-up one is the
          kind of thing nobody later remembers was made up. */}
      <AppText style={styles.dlinkLabel}>Already on the move</AppText>
      <Icon name="chev" size={16} color={theme.colors.dim} strokeWidth={2} />
    </PressableScale>
  );
}

// The prototype's .ccard2 (app_b.js:779): the commitment on Find is a COMPACT
// ROW — a 42px gradient icon tile, the activity, one line of lock copy, and a
// chevron. ~86pt.
//
// #125 reused the Challenges CommitmentCard here instead, which stacks the same
// information vertically at ~159pt. That single substitution put the landing
// ~73pt over the screen and is most of why it stopped fitting (#136).
//
// Tappable only while solo, same rule as the card it replaces: the activity is
// locked the moment a search starts.
function ActivityRow({
  activity,
  activityKey,
  locked,
  onPress
}: {
  activity: string;
  activityKey: string | null;
  locked: boolean;
  onPress: () => void;
}) {
  const icon = activityIcon(activityKey) ?? 'target';
  const body = (
    <>
      <LinearGradient
        colors={theme.gradients.warm as unknown as readonly [string, string]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.actIcon}
      >
        <Icon name={icon} size={22} color="#FFFFFF" strokeWidth={1.8} />
      </LinearGradient>
      <View style={styles.actText}>
        <AppText style={styles.actTitle}>{activity}</AppText>
        <AppText style={styles.actSub}>
          {locked
            ? "Locked while you're looking for a match"
            : 'You can change this until you start searching for a match'}
        </AppText>
      </View>
      {locked ? null : <Icon name="chev" size={16} color={theme.colors.dim} strokeWidth={2} />}
    </>
  );

  if (locked) return <View style={styles.actRow}>{body}</View>;
  return (
    <PressableScale
      haptic="selection"
      accessibilityRole="button"
      accessibilityLabel={`${activity}. Change your activity`}
      onPress={onPress}
      style={styles.actRow}
    >
      {body}
    </PressableScale>
  );
}

// Everything below the radar, in the prototype's order (app_b.js:773-775):
// the "or" divider, a full-width outline INVITE, then the small code link.
// The directory is not here — it goes last, after all of it.
function Doors({ invite = true }: { invite?: boolean }) {
  return (
    <View style={styles.doors}>
      {invite ? (
        <>
          <OrDivider />
          <Button
            label="Invite someone you know"
            variant="outline"
            onPress={() => router.push('/group/invite')}
          />
        </>
      ) : null}
      <View style={styles.links}>
        <PressableScale
          haptic="selection"
          hitSlop={8}
          accessibilityRole="button"
          onPress={() => router.push('/invite/code')}
        >
          <AppText style={styles.link}>Have an invite code?</AppText>
        </PressableScale>
      </View>
    </View>
  );
}

// The landing. Almost no UI on purpose: one tappable object and one line of
// copy. Find's only job here is to make someone WANT a partner.
function LandingState({
  isCustomHabit,
  hasChallenge,
  habit,
  activityKey,
  onStart
}: {
  isCustomHabit: boolean;
  hasChallenge: boolean;
  habit: string | null;
  activityKey: string | null;
  onStart: () => void;
}) {
  if (!hasChallenge) {
    return (
      <Animated.View entering={FadeInDown.duration(360)} style={styles.block}>
        <AppText style={styles.sub}>Pick what you want to do first, then we can look for someone.</AppText>
        <Button label="Create a commitment" onPress={() => router.push('/challenge/browse')} />
        <Doors invite={false} />
        <DirectoryRow />
      </Animated.View>
    );
  }

  if (isCustomHabit) {
    return (
      <Animated.View entering={FadeInDown.duration(360)} style={styles.block}>
        <AppText style={styles.sub}>
          The search works on the six set activities, and yours is one you wrote yourself. Change
          your activity, or invite someone you know.
        </AppText>
        <Button label="Change your activity" onPress={() => router.push('/challenge/browse')} />
        <Doors />
        <DirectoryRow />
      </Animated.View>
    );
  }

  // The prototype's order (app_b.js:784) is
  //   sub -> commitment card -> radar -> "Tap to find a match" -> or ->
  //   invite -> code link -> "Already on the move"
  // The directory used to be FIRST, as an orange outline button, which read
  // as the main thing to do on the screen (#125).
  return (
    <Animated.View entering={FadeInDown.duration(360)}>
      {/* Deliberately no area or amount: before a search has run, naming
          them is a claim about the pool the app can't back up. */}
      <AppText style={styles.sub}>Someone else is looking for you too.</AppText>

      {/* Activity only: how much and how often are agreed with a partner at
          the first plan. A compact row, not the Challenges card — see
          ActivityRow. */}
      <ActivityRow
        activity={habit ?? 'Your commitment'}
        activityKey={activityKey}
        locked={false}
        onPress={() => router.push('/challenge/browse')}
      />

      <Radar searching={false} onPress={onStart} />
      <AppText style={styles.tap}>Tap to find a match</AppText>

      <Doors />
      <DirectoryRow />
    </Animated.View>
  );
}

// Searching. Same radar, visually escalated so it reads as the search waking
// up rather than a different screen.
function SearchingState({
  onStop,
  stopping,
  noMatch,
  expired,
  searchesLeft,
  dailyLimit
}: {
  onStop: () => void;
  stopping: boolean;
  // We looked and nobody cleared the bar. Not the same as "give it a second":
  // with nobody suitable doing this activity, waiting may never resolve.
  noMatch: boolean;
  // The last offer ran out of time and both people came back here.
  expired: boolean;
  searchesLeft: number | null;
  dailyLimit: number | null;
}) {
  const [declined] = useState(consumeDeclineNotice);

  return (
    <Animated.View entering={FadeInDown.duration(360)}>
      {declined ? <AppText style={styles.declined}>{DECLINE_NOTICE}</AppText> : null}
      {expired && !declined ? (
        <View style={styles.expired}>
          <AppText style={styles.expiredTitle}>{MATCH_EXPIRED_TITLE}</AppText>
          <AppText style={styles.expiredBody}>{MATCH_EXPIRED_BODY}</AppText>
        </View>
      ) : null}

      <Radar searching />

      <View style={styles.searchStatus}>
        <AppText style={styles.searchStatusTitle}>Searching…</AppText>
        {/* Notify, don't ask people to keep checking. The switch keys off the
            matcher's own "looked and found nobody" record, not a timer. */}
        <AppText style={styles.searchStatusBody}>
          {noMatch
            ? "No luck yet. You can close the app, and we'll notify you the moment we find someone."
            : "We'll notify you the moment we find a match."}
        </AppText>
      </View>

      {searchesLeft != null && dailyLimit != null ? (
        <AppText style={styles.note}>
          {searchesLeft} of {dailyLimit} searches left today.
        </AppText>
      ) : null}

      {/* Searching is a tab root rendered from server state, so "back to the
          form" means editing your answers while staying in the pool: the form
          prefills them, and re-submitting doesn't spend a search. */}
      <Button label="Edit answers" variant="ghost" onPress={() => router.push('/find/form')} />
      <Button label="Stop searching" variant="ghost" loading={stopping} onPress={onStop} />
    </Animated.View>
  );
}

// An invite is out. The same wait as a search, for a person you named.
function InvitedState({
  userId,
  challengeId,
  inviterName
}: {
  userId: string | undefined;
  challengeId: string;
  inviterName: string | null;
}) {
  const queryClient = useQueryClient();
  const invitesQ = usePendingInvites(userId);
  const [busy, setBusy] = useState(false);
  const invite: any = (invitesQ.data ?? []).find((i: any) => i.user_challenge_id === challengeId) ?? invitesQ.data?.[0];
  // An invite that has run out is NOT quietly hidden and the state is NOT
  // changed on the person's behalf. The screen says what happened and leaves
  // the next move to them: look for a match, invite someone else, or see who
  // is already on the move. Until they choose, they stay out of the match pool
  // by their own decision rather than by an accident nobody told them about.
  const expired: boolean = !!invite?.expired;

  const onShare = async () => {
    if (!invite?.token) return;
    const how = await shareInviteLink(invite.token, inviterName, invite.code ?? null);
    if (how === 'copied') notify('Link copied', 'Paste it to your partner to bring them in.');
    if (how === 'failed') notify('Could not share', 'Send them the code instead.');
  };

  // Back to the landing. The invite itself stays valid until it expires, so
  // nothing is taken away from the person who was invited.
  const onSearchInstead = async () => {
    setBusy(true);
    try {
      await setPartnerState(challengeId, 'solo');
      await queryClient.invalidateQueries({ queryKey: ['my-challenge'] });
    } catch (error: any) {
      notify('Could not do that', error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Animated.View entering={FadeInDown.duration(360)} style={styles.block}>
      <AppText style={styles.heading}>
        {expired ? 'That invite expired.' : 'Your invite is out.'}
      </AppText>
      <AppText style={styles.sub}>
        {expired
          ? `${invite?.email ? `${invite.email} didn't join in time.` : 'Nobody joined in time.'} Invites last 48 hours. You can send another, or look for a match.`
          : `${invite?.email ? `Waiting for ${invite.email} to join.` : 'Waiting for them to join.'} You'll be paired the moment they do.`}
      </AppText>
      {/* The code is gone once it is dead. Showing it under GOOD FOR 48 HOURS
          is what made this screen lie for a day. */}
      {invite?.code && !expired ? (
        <View style={styles.codeBox}>
          <AppText style={styles.codeLabel}>THEIR CODE · GOOD FOR 48 HOURS</AppText>
          <AppText style={styles.code} selectable>{invite.code}</AppText>
        </View>
      ) : null}
      {invite?.token && !expired ? <Button label="Share the invite link" onPress={onShare} /> : null}
      {expired ? <Button label="Search for a match" loading={busy} onPress={onSearchInstead} /> : null}
      <Button
        label={expired ? 'Invite someone' : 'Invite someone else'}
        variant="ghost"
        onPress={() => router.push('/group/invite')}
      />
      {expired ? null : (
        <Button label="Search for a match instead" variant="ghost" loading={busy} onPress={onSearchInstead} />
      )}
      {/* The third door, exactly as the landing offers it. */}
      <DirectoryRow />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  content: { paddingHorizontal: 22, paddingBottom: theme.spacing(5) },
  // The prototype's .p-h1 with its inline override: no top margin at all, and
  // 4 below (app_b.js:784). The 12 that used to sit on top is exactly the
  // "Find sits further down from the top bar than the prototype" in #136 —
  // the 22pt gap under the bar is already the specified one.
  pageTitle: {
    fontFamily: theme.fonts.body,
    fontSize: 24,
    color: theme.colors.text,
    marginBottom: 4
  },
  block: { gap: theme.spacing(1.5) },
  heading: { fontSize: 20, color: theme.colors.text, textAlign: 'center' },
  sub: {
    textAlign: 'center',
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 16,
    paddingHorizontal: 6
  },
  // .tap: centred, --g2, 11.5 / 600 (choner-find-flow.html:184)
  tap: {
    textAlign: 'center',
    marginTop: 2,
    fontSize: 11.5,
    fontFamily: theme.fonts.bodyBold,
    color: theme.colors.primary2
  },
  // .orl: a word with a 1px rule either side (app_a.html:259-260)
  orl: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, marginBottom: 10 },
  orlRule: { flex: 1, height: 1, backgroundColor: theme.colors.border },
  orlWord: { fontSize: 12, color: theme.colors.muted },
  // .dlink (app_a.html:300-302)
  // The prototype's .ccard2: a 42px gradient tile, the activity, one line of
  // lock copy, a chevron. padding 14/16, radius 18, 16 below. ~86pt all in.
  actRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    ...theme.shadow.sm
  },
  actIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  actText: { flex: 1, minWidth: 0 },
  actTitle: {
    fontFamily: theme.fonts.bodyMedium,
    fontSize: 15,
    color: theme.colors.text
  },
  actSub: {
    fontFamily: theme.fonts.bodyRegular,
    fontSize: 12.5,
    lineHeight: 17,
    color: theme.colors.muted,
    marginTop: 3
  },
  dlink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    width: '100%',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 16
  },
  dlinkLabel: {
    flex: 1,
    textAlign: 'left',
    fontSize: 13.5,
    fontFamily: theme.fonts.bodyMedium,
    color: theme.colors.text
  },
  // No top margin: the "or" divider inside already carries its own 14 (#136).
  doors: {},
  links: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', columnGap: 22, rowGap: 10 },
  link: { color: theme.colors.primary2, fontSize: 13, fontFamily: theme.fonts.bodyMedium },
  searchStatus: { alignItems: 'center', marginTop: 6, marginBottom: 22 },
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
  note: { textAlign: 'center', color: theme.colors.muted, fontSize: 11, marginBottom: 14, lineHeight: 17 },
  declined: {
    textAlign: 'center',
    color: theme.colors.text,
    fontSize: 12.5,
    lineHeight: 19,
    marginBottom: 12
  },
  expired: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    gap: 4,
    marginBottom: 12
  },
  expiredTitle: { fontSize: 15, color: theme.colors.text, fontFamily: theme.fonts.bodyMedium },
  expiredBody: { fontSize: 12.5, lineHeight: 19, color: theme.colors.muted },
  codeBox: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16,
    alignItems: 'center',
    gap: 6
  },
  codeLabel: { fontSize: 10, letterSpacing: 1.2, color: theme.colors.muted },
  code: { fontSize: 26, letterSpacing: 4, color: theme.colors.text, fontFamily: theme.fonts.bodyBold }
});
