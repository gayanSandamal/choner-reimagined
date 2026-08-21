import { useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppTopBar } from '@/components/navigation/AppTopBar';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { LoadingState, ErrorState } from '@/components/ui/StateViews';
import { Heart } from '@/components/challenges/Heart';
import { PairRow } from '@/components/challenges/PairRow';
import { MatchBanner } from '@/components/challenges/MatchBanner';
import { SharePrompt } from '@/components/community/SharePrompt';
import { challengeHabitTitle, partnerStateOf, nudgeRefusalMessage } from '@/features/challenges/api';
import {
  useMyChallenge,
  useChallengeHistory,
  useCompleteTask,
  useNudgePartner,
  usePartnerReflections,
  useStreak
} from '@/features/challenges/hooks';
import { usePartnerStatus } from '@/features/community/hooks';
import { useProfile } from '@/features/profile/hooks';
import { captureProofPhoto, resolveProofType } from '@/features/challenges/capture';
import { challengeDayIndex } from '@/features/challenges/why-rotation';
import { reminderFor } from '@/features/challenges/reflections';
import { useSession } from '@/providers/session-provider';
import { theme } from '@/constants/theme';

const ORANGE = '#FE8C00';
const ORANGE_SOFT = '#ffb355';
const GREEN = '#4fc98a';
const DIM = '#2c4759';
const BORDER = '#0e3448';

function firstName(name?: string | null) {
  return (name ?? '').trim().split(/\s+/)[0] || 'your partner';
}

// The device's own calendar day. `toISOString()` reports UTC, so at UTC+5:30
// everything logged before 05:30 reads as yesterday — the tab would show an
// empty checkbox for a habit that is demonstrably done, and offer a nudge for
// a partner who already logged. Shifting by the local offset first makes the
// date part of the ISO string the local one.
function localDay(value: string | Date) {
  const d = typeof value === 'string' ? new Date(value) : value;
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

// The Challenges tab, per the v3 spec: one heart, and whichever of the eight
// states the user is actually in. The tab IS the challenge — browsing habits
// lives behind "Choose a challenge" rather than competing with it.
export default function ChallengesScreen() {
  const { session } = useSession();
  const userId = session?.user.id;
  const challengeQ = useMyChallenge(userId);
  const streakQ = useStreak(userId);
  const profileQ = useProfile(userId);
  const partnerStatusQ = usePartnerStatus(userId);
  const historyQ = useChallengeHistory(userId);
  const completeTask = useCompleteTask();
  const nudgeMut = useNudgePartner(userId);
  const [pastOpen, setPastOpen] = useState(false);
  // The outcome line under the button. Kept local rather than derived, because
  // "Nudged Dinesh." and "Dinesh already logged today." are both answers to a
  // tap and neither is a state the server reports back on its own.
  const [nudgeNote, setNudgeNote] = useState<string | null>(null);

  const challenge = challengeQ.data ?? null;
  const partnerState = partnerStateOf(challenge);
  const partnered = partnerState === 'partnered';
  const streak = streakQ.data ?? 0;
  const partnerStatus = partnerStatusQ.data;

  const partnerReflectionsQ = usePartnerReflections(
    partnered ? partnerStatus?.partner_id : undefined
  );

  const tasks = (challenge?.challenge_tasks ?? []) as any[];
  const today = localDay(new Date());
  const checkinFor = (task: any) =>
    (task.task_checkins ?? []).find(
      (c: any) => c.completed_at && localDay(c.completed_at) === today
    );
  const youCheckedIn = tasks.length > 0 && tasks.every((t) => checkinFor(t));
  const partnerCheckedIn = Boolean(partnerStatus?.checked_in_today);
  const nudgedToday = Boolean((partnerStatus as any)?.nudged_today);

  const dayIndex = challengeDayIndex(challenge?.started_at);
  const totalDays = challenge?.challenge_templates?.duration_days ?? 7;
  const habit = challengeHabitTitle(challenge) ?? 'Your habit';
  const completed = challenge?.status === 'completed';
  // Only an unaccepted INVITE is genuinely not started. Someone in the
  // matching pool keeps logging today — pairing is usually a minute or two but
  // is not instant, and freezing their habit meanwhile punishes them for asking.
  const notStarted = partnerState === 'invited';

  // One line of the partner's own reasoning, now that a confirmed pairing can
  // read it. Attributed to them by name — an unattributed quote reads as the
  // app talking, which is the opposite of the point.
  const partnerWhy = useMemo(() => {
    const answers = partnerReflectionsQ.data ?? [];
    for (const key of ['purpose', 'matters', 'gain'] as const) {
      const line = reminderFor(answers.find((a) => a.question_key === key));
      if (line) return line;
    }
    return null;
  }, [partnerReflectionsQ.data]);

  const pageMeta = completed
    ? 'Complete'
    : !challenge
    ? ''
    : partnerState === 'finding'
    ? 'Matching'
    : partnerState === 'invited'
    ? 'Invited'
    : partnered
    ? `Day ${Math.min(dayIndex, totalDays)} of ${totalDays}`
    : 'Solo';

  const onMarkDone = async () => {
    const task = tasks.find((t) => !checkinFor(t));
    if (!task || !challenge || !userId) return;
    let photoBase64: string | undefined;
    if (resolveProofType(task, challenge) === 'photo') {
      const shot = await captureProofPhoto();
      // Backing out of the camera must not silently log the habit anyway.
      if (shot.status === 'cancelled') return;
      if (shot.status === 'captured') photoBase64 = shot.base64;
    }
    completeTask.mutate({ taskId: task.id, userChallengeId: challenge.id, userId, photoBase64 });
  };

  // Every refusal is a sentence, not a red error: "already logged" and "it's
  // 1am where they are" are the system working, and the person who tapped
  // deserves to know which one happened.
  const onNudge = async () => {
    setNudgeNote(null);
    try {
      const res = await nudgeMut.mutateAsync();
      setNudgeNote(
        res.sent
          ? `Nudged ${firstName(partnerStatus?.name)}.`
          : nudgeRefusalMessage(res.reason, partnerStatus?.name)
      );
    } catch {
      setNudgeNote(nudgeRefusalMessage('unknown', partnerStatus?.name));
    }
  };

  const onRefresh = () => {
    challengeQ.refetch();
    streakQ.refetch();
    partnerStatusQ.refetch();
  };

  const statusLine = () => {
    if (!partnered) {
      if (partnerState === 'finding') {
        return (
          <>
            <AppText style={styles.statusWarm}>Looking for your partner</AppText>
            {'\n'}Usually within a minute or two.
          </>
        );
      }
      if (partnerState === 'invited') {
        return <>Waiting for them to join{'\n'}Your challenge starts the moment they do.</>;
      }
      return <>Half a heart is still a start.</>;
    }
    if (youCheckedIn && partnerCheckedIn) {
      return (
        <>
          You're <AppText style={styles.statusStrong}>both in</AppText> today. Streak alive.
        </>
      );
    }
    if (youCheckedIn) {
      return (
        <>
          You're in. <AppText style={styles.statusStrong}>{firstName(partnerStatus?.name)}</AppText>{' '}
          hasn't checked in yet.
        </>
      );
    }
    return <>Neither of you has checked in today.</>;
  };

  if (challengeQ.isLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (challengeQ.isError) {
    return (
      <SafeAreaView style={styles.root}>
        <ErrorState
          message={(challengeQ.error as Error).message}
          onRetry={() => challengeQ.refetch()}
        />
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
        <View style={styles.pageHead}>
          <AppText style={styles.pageTitle}>Challenges</AppText>
          <AppText style={styles.pageMeta}>{pageMeta}</AppText>
        </View>

        {/* A match landing while you're mid-challenge shouldn't blow the whole
            screen away — it arrives as a banner above whatever you were
            already looking at. */}
        <MatchBanner
          city={profileQ.data?.city}
          watch={partnerState === 'finding' || partnerState === 'matched'}
        />

        {/* Community has no post button; sharing is offered here, right after
            the moment it refers to. */}
        <SharePrompt userId={userId} challenge={challenge} streak={streak} />

        {!challenge ? (
          <Animated.View entering={FadeInDown.duration(360)} style={styles.empty}>
            <AppText style={styles.emptyTitle}>Ready when you are.</AppText>
            <AppText style={styles.emptyBody}>
              Pick a challenge, then find someone to do it with.
            </AppText>
            <Button label="Choose a challenge" onPress={() => router.push('/challenge/browse')} />
          </Animated.View>
        ) : completed ? (
          <Animated.View entering={FadeInDown.duration(360)} style={styles.empty}>
            <PairRow
              youName={profileQ.data?.full_name}
              youCheckedIn
              partner={
                partnered ? { kind: 'person', name: partnerStatus?.name, on: true } : { kind: 'open' }
              }
            />
            <AppText style={styles.emptyTitle}>
              {partnered ? `You and ${firstName(partnerStatus?.name)} did it.` : 'You did it.'}
            </AppText>
            <AppText style={styles.emptyBody}>
              {totalDays} of {totalDays} days. Not one missed.
            </AppText>
            <Button
              label="Start another challenge"
              onPress={() => router.push('/challenge/browse')}
            />
          </Animated.View>
        ) : (
          <>
            <Heart
              youCheckedIn={youCheckedIn}
              partnerCheckedIn={partnerCheckedIn}
              partnerState={partnerState}
            />

            <PairRow
              youName={profileQ.data?.full_name}
              youCheckedIn={youCheckedIn}
              streak={partnered || partnerState === 'solo' ? streak : undefined}
              partner={
                partnerState === 'finding'
                  ? { kind: 'seeking' }
                  : partnerState === 'invited'
                  ? { kind: 'person', name: partnerStatus?.name ?? '?', on: false }
                  : partnered
                  ? { kind: 'person', name: partnerStatus?.name, on: partnerCheckedIn }
                  : { kind: 'open' }
              }
            />

            <AppText style={styles.status}>{statusLine()}</AppText>

            {/* Not started yet: the habit is shown dimmed, so it's visible
                without pretending today counts toward anything. */}
            <View style={[styles.card, notStarted && styles.cardDim]}>
              <AppText style={styles.cardLabel}>
                {notStarted ? 'WAITING TO START' : 'TODAY'}
              </AppText>
              <AppText style={styles.cardHabit}>{habit}</AppText>
              <AppText style={styles.cardSub}>
                {notStarted
                  ? `${totalDays}-day challenge · not started`
                  : `Day ${Math.min(dayIndex, totalDays)} of ${totalDays}${
                      partnered
                        ? ` · with ${firstName(partnerStatus?.name)}`
                        : partnerState === 'finding'
                        ? ' · going solo until then'
                        : ''
                    }`}
              </AppText>
              {notStarted ? null : youCheckedIn ? (
                <View style={styles.done}>
                  <Ionicons name="checkmark" size={16} color={GREEN} />
                  <AppText style={styles.doneText}>Done today</AppText>
                </View>
              ) : (
                <Button label="Mark as done" loading={completeTask.isPending} onPress={onMarkDone} />
              )}
            </View>

            {/* The action the missed-day push has been asking for since July.
                Only while there is something to nudge about: once they log,
                this disappears rather than going grey. */}
            {partnered && !partnerCheckedIn && !notStarted ? (
              <View style={styles.nudge}>
                {nudgedToday ? (
                  <AppText style={styles.nudgeDone}>
                    You nudged {firstName(partnerStatus?.name)} today.
                  </AppText>
                ) : (
                  <Pressable
                    style={styles.nudgeBtn}
                    disabled={nudgeMut.isPending}
                    onPress={onNudge}
                  >
                    <Ionicons name="hand-left-outline" size={15} color={ORANGE} />
                    <AppText style={styles.nudgeBtnText}>
                      {nudgeMut.isPending
                        ? 'Sending…'
                        : `Nudge ${firstName(partnerStatus?.name)}`}
                    </AppText>
                  </Pressable>
                )}
                {nudgeNote ? <AppText style={styles.nudgeNote}>{nudgeNote}</AppText> : null}
              </View>
            ) : null}

            {/* Solo: calm and complete, never urgent. Two equal options, and
                nothing on this screen moves or glows — that stillness is what
                makes a partnered heart feel like something. */}
            {partnerState === 'solo' ? (
              <View style={styles.soloPanel}>
                <AppText style={styles.soloText}>You're doing this alone right now.</AppText>
                <View style={styles.soloOpts}>
                  <Pressable style={styles.opt} onPress={() => router.push('/group/invite')}>
                    <AppText style={styles.optText}>Invite someone</AppText>
                  </Pressable>
                  <Pressable style={styles.opt} onPress={() => router.push('/onboarding/invite')}>
                    <AppText style={styles.optText}>Find a partner</AppText>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {partnerState === 'finding' ? (
              <Pressable style={styles.escape} onPress={() => router.push('/group/invite')}>
                <AppText style={styles.linkQuiet}>Invite someone you know instead</AppText>
              </Pressable>
            ) : null}

            {partnerState === 'invited' ? (
              <View style={styles.inviteLinks}>
                <Pressable onPress={() => router.push('/group/invite')}>
                  <AppText style={styles.link}>Resend invite</AppText>
                </Pressable>
                <Pressable onPress={() => router.push('/group/invite')}>
                  <AppText style={styles.linkQuiet}>Invite someone else</AppText>
                </Pressable>
              </View>
            ) : null}

            {partnered && partnerWhy ? (
              <View style={styles.why}>
                <AppText style={styles.whyText}>
                  {firstName(partnerStatus?.name)}:{' '}
                  <AppText style={styles.whyQuote}>{partnerWhy}</AppText>
                </AppText>
              </View>
            ) : null}

            {partnered ? (
              <AppText style={styles.stakes}>Miss a day and you both start over.</AppText>
            ) : null}
          </>
        )}

        {/* Persistent on every state. */}
        <View style={styles.past}>
          <Pressable style={styles.pastHead} onPress={() => setPastOpen((v) => !v)}>
            <Ionicons name={pastOpen ? 'chevron-down' : 'chevron-forward'} size={14} color={ORANGE} />
            <AppText style={styles.pastTitle}>Past challenges</AppText>
          </Pressable>
          {pastOpen ? (
            (historyQ.data ?? []).length === 0 ? (
              <AppText style={styles.pastEmpty}>Nothing finished yet.</AppText>
            ) : (
              (historyQ.data ?? []).map((h: any) => (
                <View key={h.id} style={styles.pastRow}>
                  <AppText style={styles.pastHabit}>
                    {challengeHabitTitle(h) ?? h.challenge_templates?.title}
                  </AppText>
                  <AppText style={styles.pastMeta}>
                    {h.status === 'completed' ? 'Completed' : 'Ended early'}
                    {h.completed_at ? ` · ${new Date(h.completed_at).toLocaleDateString()}` : ''}
                  </AppText>
                </View>
              ))
            )
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: 22, paddingBottom: theme.spacing(5) },
  pageHead: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: theme.spacing(2)
  },
  pageTitle: { fontFamily: theme.fonts.body, fontSize: 24, color: theme.colors.text },
  pageMeta: { fontSize: 11, color: theme.colors.muted },
  status: {
    textAlign: 'center',
    fontSize: 12,
    color: theme.colors.muted,
    marginBottom: 20,
    lineHeight: 18
  },
  statusStrong: { color: ORANGE, fontFamily: theme.fonts.bodyBold },
  statusWarm: { color: ORANGE_SOFT },
  card: {
    backgroundColor: '#04202f',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    borderRadius: 18,
    padding: 18
  },
  cardDim: { opacity: 0.5 },
  cardLabel: { fontSize: 9.5, letterSpacing: 1.6, color: theme.colors.muted, marginBottom: 8 },
  cardHabit: { fontSize: 18, color: theme.colors.text, marginBottom: 5 },
  cardSub: { fontSize: 11.5, color: theme.colors.muted, marginBottom: 16 },
  done: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 13,
    paddingVertical: 14,
    backgroundColor: 'rgba(79,201,138,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(79,201,138,0.25)'
  },
  doneText: { color: GREEN, fontSize: 14 },
  nudge: { marginTop: 14, alignItems: 'center', gap: 8 },
  nudgeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(254,140,0,0.35)',
    backgroundColor: 'rgba(254,140,0,0.08)'
  },
  nudgeBtnText: { color: ORANGE, fontSize: 12.5 },
  nudgeDone: { color: theme.colors.muted, fontSize: 11.5 },
  nudgeNote: { color: theme.colors.muted, fontSize: 11, textAlign: 'center' },
  soloPanel: {
    marginTop: 14,
    padding: 16,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: BORDER,
    borderRadius: 16,
    alignItems: 'center'
  },
  soloText: { color: theme.colors.muted, fontSize: 11.5, marginBottom: 12 },
  soloOpts: { flexDirection: 'row', gap: 10, alignSelf: 'stretch' },
  opt: {
    // No `flex: 0` here — RN maps it to flex-basis:0% on web and collapses the
    // element to zero height.
    flexGrow: 1,
    flexBasis: 0,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: BORDER,
    backgroundColor: '#04202f',
    alignItems: 'center'
  },
  optText: { color: theme.colors.text, fontSize: 11.5 },
  escape: { alignItems: 'center', marginTop: 20 },
  inviteLinks: { flexDirection: 'row', gap: 20, justifyContent: 'center', marginTop: 20 },
  link: { color: ORANGE, fontSize: 12 },
  linkQuiet: { color: theme.colors.muted, fontSize: 12 },
  why: {
    marginTop: 12,
    paddingVertical: 13,
    paddingHorizontal: 15,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.025)',
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(254,140,0,0.4)'
  },
  whyText: { color: '#b9cddb', fontSize: 11.5, lineHeight: 18 },
  whyQuote: { color: theme.colors.text, fontStyle: 'italic' },
  stakes: { textAlign: 'center', color: DIM, fontSize: 10, marginTop: 14 },
  empty: { alignItems: 'center', paddingVertical: 48, gap: theme.spacing(1.5) },
  emptyTitle: { fontSize: 18, color: theme.colors.text, textAlign: 'center' },
  emptyBody: {
    fontSize: 12,
    color: theme.colors.muted,
    textAlign: 'center',
    marginBottom: theme.spacing(1)
  },
  past: {
    marginTop: 26,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
    paddingTop: 16
  },
  pastHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  pastTitle: { color: theme.colors.muted, fontSize: 11.5 },
  pastEmpty: { color: DIM, fontSize: 11, marginTop: 12 },
  pastRow: { marginTop: 14 },
  pastHabit: { color: '#c3d5e0', fontSize: 11.5 },
  pastMeta: { color: DIM, fontSize: 10, marginTop: 2 }
});
