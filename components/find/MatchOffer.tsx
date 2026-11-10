import { ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/button';
import { MatchReportLink } from '@/components/safety/MatchReportLink';
import type { MyMatch } from '@/features/challenges/api';
import { raiseDeclineNotice } from '@/features/challenges/decline-notice';
import {
  useConfirmMatch,
  useDeclineMatch,
  useFindAnotherMatch,
  useLeaveMatchPool
} from '@/features/challenges/hooks';
import {
  MATCH_EXPIRED_BODY,
  MATCH_EXPIRED_TITLE,
  matchClock,
  offerState
} from '@/features/challenges/match-clock';
import { useNow } from '@/lib/use-now';
import { confirmAction, notify } from '@/lib/alert';
import { theme } from '@/constants/theme';

type Offer = Extract<MyMatch, { matched: true }>;

// The match, before it is a partnership. Three states on one screen, because
// one person can answer before the other:
//
//   offered        their photo, why you matched, Let's do this / Not quite right
//   you accepted   waiting on them. You can still back out
//   expired        nobody finished answering in 24 hours; both back in the pool
//
// One clock for both people, started when the match was created.
//
// This is the whole of the Match found screen (app/find/match.tsx, #192): what
// scrolls, and the answers pinned under it. It used to be a card inside the
// Find tab, which left no way out of it except answering.
export function MatchOffer({
  match,
  challengeId,
  onRefresh,
  now: nowProp,
  topInset = 0
}: {
  match: Offer;
  challengeId: string | null;
  onRefresh: () => void;
  // Fixed time for previews and tests; the live screen ticks.
  now?: Date;
  // Room for the floating top bar the screen draws over this.
  topInset?: number;
}) {
  const ticking = useNow();
  const now = nowProp ?? ticking;
  const confirm = useConfirmMatch();
  const decline = useDeclineMatch();
  const findAnother = useFindAnotherMatch();
  const leavePool = useLeaveMatchPool();

  const name = match.partner_first_name;
  const clock = matchClock(match.expires_at, now);
  const state = offerState(match, now);
  const busy = confirm.isPending || decline.isPending || findAnother.isPending || leavePool.isPending;

  const onAccept = async () => {
    try {
      await confirm.mutateAsync(match.match_id);
    } catch (error: any) {
      notify('Could not accept', error.message);
    }
  };

  // "Not quite right". For whoever asked for this pairing it looks again
  // straight away and spends one of the day's searches; for the person who was
  // asked it is a plain decline and costs nothing.
  const onNotRight = async () => {
    if (match.i_requested) {
      const left = match.searches_left ?? 0;
      if (left <= 0) {
        notify(
          "That's today's searches",
          `You get ${match.daily_limit ?? 3} a day. You can look again tomorrow, or start with ${name}.`
        );
        return;
      }
      const sure = await confirmAction({
        title: 'Look for someone else?',
        message: `${name} goes back in the search. You have ${left} search${left === 1 ? '' : 'es'} left today.`,
        confirmLabel: 'Find someone else',
        cancelLabel: 'Not yet',
        destructive: true
      });
      if (!sure) return;
      try {
        const res = await findAnother.mutateAsync(match.match_id);
        if (res.ok) raiseDeclineNotice();
        else if (res.reason === 'daily_limit') {
          notify("That's today's searches", `You get ${res.daily_limit ?? 3} a day.`);
        }
      } catch (error: any) {
        notify('Could not do that', error.message);
      }
      return;
    }
    const sure = await confirmAction({
      title: `Not pair with ${name}?`,
      message: "They'll go back in the search, and so will you.",
      confirmLabel: 'Not quite right',
      cancelLabel: 'Not yet',
      destructive: true
    });
    if (!sure) return;
    try {
      await decline.mutateAsync(match.match_id);
      raiseDeclineNotice();
    } catch (error: any) {
      notify('Could not do that', error.message);
    }
  };

  // Backing out after accepting: this pairing ends, the search carries on.
  const onBackOut = async () => {
    const ok = await confirmAction({
      title: 'Back out of this match?',
      message: "You'll go back to looking, and so will they. This pairing won't be suggested again.",
      confirmLabel: 'Back out',
      cancelLabel: 'Keep waiting',
      destructive: true
    });
    if (!ok) return;
    try {
      await decline.mutateAsync(match.match_id);
      raiseDeclineNotice();
    } catch (error: any) {
      notify('Could not do that', error.message);
    }
  };

  // Out of the search altogether. Declining first so the other person is
  // released rather than left waiting on a match that can never complete.
  const onStopLooking = async () => {
    if (!challengeId) return;
    const ok = await confirmAction({
      title: 'Stop searching?',
      message: 'You can start looking again whenever you want.',
      confirmLabel: 'Stop searching',
      cancelLabel: 'Keep waiting',
      destructive: true
    });
    if (!ok) return;
    try {
      await decline.mutateAsync(match.match_id);
      await leavePool.mutateAsync(challengeId);
    } catch (error: any) {
      notify('Could not stop', error.message);
    }
  };

  if (state === 'expired') {
    return (
      <View style={[styles.root, { paddingTop: topInset }]}>
        <Animated.View entering={FadeInDown.duration(360)} style={styles.body}>
          <View style={styles.icon}>
            <Ionicons name="time-outline" size={24} color={theme.colors.muted} />
          </View>
          <AppText style={styles.title}>{MATCH_EXPIRED_TITLE}</AppText>
          <AppText style={styles.copy}>{MATCH_EXPIRED_BODY}</AppText>
        </Animated.View>
        <View style={styles.footer}>
          <Button label="See your search" onPress={onRefresh} />
        </View>
      </View>
    );
  }

  const clockRow =
    clock.state === 'running' ? (
      <View style={styles.clock} accessibilityLabel={`${clock.label} to answer`}>
        <Ionicons name="time-outline" size={14} color={theme.colors.primary2} />
        <AppText style={styles.clockText}>{clock.label}</AppText>
        <AppText style={styles.clockNote}>The same clock for you both</AppText>
      </View>
    ) : null;

  if (state === 'you_accepted') {
    return (
      <View style={styles.root}>
        <ScrollView
          contentContainerStyle={[styles.body, { paddingTop: topInset + 12 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* The wrapper isolates the ring's own alignSelf so it centres. */}
          <View>
            <Avatar uri={match.partner_avatar_url} name={name} size={104} ring />
          </View>
          <AppText style={styles.title}>
            You're <AppText style={styles.titleEm}>in.</AppText>
          </AppText>
          <AppText style={styles.copy}>
            Waiting for {name} to accept. Saying hi unlocks once you have both accepted.
          </AppText>
          {clockRow}
          <MatchReportLink matchId={match.match_id} partnerFirstName={name} />
        </ScrollView>
        <View style={styles.footer}>
          <Button label="Back out" variant="ghost" disabled={busy} onPress={onBackOut} />
          <Button label="Stop searching" variant="ghost" disabled={busy} onPress={onStopLooking} />
        </View>
      </View>
    );
  }

  // Why you matched. Only what is true of both and safe to show a stranger:
  // the activity, and the one line written when the pairing was made.
  const reasons = [match.habit ? `You are both doing ${match.habit}` : null, match.blurb].filter(Boolean) as string[];

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[styles.body, { paddingTop: topInset + 12 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={styles.stack}>
          <View>
            <Avatar uri={match.partner_avatar_url} name={name} size={104} ring />
          </View>
          {/* Two sides of the same pairing, two different questions. One tapped
              Find and is seeing the answer; the other was waiting and is being
              asked to take somebody on. */}
          <AppText style={styles.title}>
            {match.i_requested ? 'You found ' : `${name} wants `}
            <AppText style={styles.titleEm}>{match.i_requested ? 'a Match.' : 'to pair up.'}</AppText>
          </AppText>
          <AppText style={styles.name}>{name}</AppText>

          {reasons.length ? (
            <View style={styles.reasons}>
              <AppText style={styles.reasonsTitle}>WHY YOU MATCHED</AppText>
              {reasons.map((r) => (
                <View key={r} style={styles.reason}>
                  <View style={styles.tick}>
                    <Ionicons name="checkmark" size={13} color={theme.colors.success} />
                  </View>
                  <AppText style={styles.reasonText}>{r}</AppText>
                </View>
              ))}
            </View>
          ) : null}

          {clockRow}
          <AppText style={styles.note}>
            {match.they_confirmed ? `${name} has already accepted.` : 'You both accept before anything starts.'}
          </AppText>
          <MatchReportLink matchId={match.match_id} partnerFirstName={name} />
        </Animated.View>
      </ScrollView>

      <View style={styles.footer}>
        <Button label="Let's do this" loading={confirm.isPending} disabled={busy} onPress={onAccept} />
        <Button label="Not quite right" variant="ghost" disabled={busy} onPress={onNotRight} />
        {match.i_requested ? (
          <AppText style={styles.note}>
            {match.searches_left} of {match.daily_limit} searches left today
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { alignItems: 'center', gap: 10, paddingHorizontal: 22, paddingBottom: 20 },
  stack: { alignSelf: 'stretch', alignItems: 'center', gap: 10 },
  // The answers stay put while the reasons scroll.
  footer: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 12, gap: 6 },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface3
  },
  title: { fontSize: 26, lineHeight: 32, color: theme.colors.text, textAlign: 'center', marginTop: 8 },
  titleEm: { fontSize: 26, lineHeight: 32, color: theme.colors.primary2, fontFamily: theme.fonts.bodyBold },
  copy: { fontSize: 13, lineHeight: 20, color: theme.colors.muted, textAlign: 'center', maxWidth: 280 },
  name: { fontSize: 15, color: theme.colors.muted, fontFamily: theme.fonts.bodyMedium },
  reasons: {
    alignSelf: 'stretch',
    gap: 10,
    marginTop: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 16
  },
  reasonsTitle: { fontSize: 10, letterSpacing: 1.2, color: theme.colors.muted },
  reason: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  tick: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(46,158,107,0.14)'
  },
  reasonText: { flexShrink: 1, fontSize: 14, lineHeight: 21, color: theme.colors.text },
  clock: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 8
  },
  clockText: { fontSize: 13, color: theme.colors.primary2, fontFamily: theme.fonts.bodyMedium },
  clockNote: { fontSize: 11.5, color: theme.colors.muted },
  note: { textAlign: 'center', color: theme.colors.muted, fontSize: 11 }
});
