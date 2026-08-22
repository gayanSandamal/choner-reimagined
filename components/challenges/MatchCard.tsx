import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { PressableScale } from '@/components/ui/PressableScale';
import {
  useConfirmMatch,
  useDeclineMatch,
  useFindAnotherMatch,
  useMyMatch
} from '@/features/challenges/hooks';
import { useSession } from '@/providers/session-provider';
import { theme } from '@/constants/theme';
import { confirmAction, notify } from '@/lib/alert';

const ORANGE = '#FE8C00';
const ORANGE_SOFT = '#ffb355';
const DIM = '#2c4759';

interface Props {
  // Challenges shows this above whatever state the user was already in, so it
  // offers a "Later". Find makes the match its whole reason for existing, so
  // there is nothing to dismiss it back to.
  onDismiss?: () => void;
  city?: string | null;
  // Poll for a match arriving. Set while the user is in the pool or has one
  // waiting; left off for everyone else so a solo user is not asking a question
  // whose answer cannot change.
  watch?: boolean;
}

// "We found your partner."
//
// Deliberately ONE component shared by Challenges and Find: a match should feel
// identical regardless of which tab surfaced it, so this is never re-skinned
// per tab. Only the dismiss affordance differs.
export function MatchCard({ onDismiss, city, watch = false }: Props) {
  const { session } = useSession();
  const matchQ = useMyMatch(session?.user.id, watch);
  const confirm = useConfirmMatch();
  const decline = useDeclineMatch();
  const findAnother = useFindAnotherMatch();

  const match = matchQ.data;
  if (!match?.matched) return null;

  // Already said yes: hold the frame quietly rather than asking twice.
  if (match.i_confirmed) {
    return (
      <Animated.View entering={FadeInDown.duration(320)} exiting={FadeOut} style={styles.waiting}>
        <AppText variant="caption" style={styles.waitingText}>
          You're in — waiting for {match.partner_first_name} to accept.
        </AppText>
      </Animated.View>
    );
  }

  const onConfirm = async () => {
    try {
      const result = await confirm.mutateAsync(match.match_id);
      if (!result.both) {
        notify("You're in", `We'll start the moment ${match.partner_first_name} confirms too.`);
      }
    } catch (error: any) {
      notify('Could not confirm', error.message);
    }
  };

  // "Find someone else" — only offered to whoever asked for this pairing, and
  // it costs one of their three daily searches. Worth a beat of friction: it
  // also puts the other person back in the pool, and they did nothing wrong.
  const onFindAnother = async () => {
    const left = match.searches_left ?? 0;
    if (left <= 0) {
      notify(
        "That's today's searches",
        `You get ${match.daily_limit ?? 3} a day. You can look again tomorrow, or start with ${match.partner_first_name}.`
      );
      return;
    }
    const sure = await confirmAction({
      title: 'Look for someone else?',
      message: `${match.partner_first_name} goes back in the pool. You have ${left} search${left === 1 ? '' : 'es'} left today.`,
      confirmLabel: 'Find someone else',
      destructive: true
    });
    if (!sure) return;
    try {
      const res = await findAnother.mutateAsync(match.match_id);
      if (!res.ok && res.reason === 'daily_limit') {
        notify("That's today's searches", `You get ${res.daily_limit ?? 3} a day.`);
      }
    } catch (error: any) {
      notify('Could not do that', error.message);
    }
  };

  // Plain decline, for the person who was asked. No search is spent — they
  // never requested anything, so charging them for saying no would be perverse.
  const onDecline = async () => {
    const sure = await confirmAction({
      title: `Not pair with ${match.partner_first_name}?`,
      message: "They'll go back in the pool, and so will you.",
      confirmLabel: 'No thanks',
      destructive: true
    });
    if (!sure) return;
    try {
      await decline.mutateAsync(match.match_id);
    } catch (error: any) {
      notify('Could not do that', error.message);
    }
  };

  const meta = [match.habit, `${match.duration_days}-day challenge`, city]
    .filter(Boolean)
    .join(' · ');

  return (
    <Animated.View entering={FadeInDown.duration(400)} exiting={FadeOut}>
      <LinearGradient
        colors={['rgba(254,140,0,0.14)', 'rgba(254,140,0,0.02)', 'transparent']}
        style={styles.card}
      >
        <View style={styles.tagRow}>
          <View style={styles.tag}>
            <AppText style={styles.tagText}>NEW MATCH</AppText>
          </View>
          {onDismiss ? (
            <PressableScale onPress={onDismiss} hitSlop={10} haptic="selection">
              <AppText style={styles.dismiss}>Later</AppText>
            </PressableScale>
          ) : null}
        </View>

        {/* Two sides of the same pairing, two different questions. One of them
            tapped Find and is seeing the answer to their own request; the other
            was waiting and is being asked to take somebody on. Telling the
            second "we found your partner" claims they asked for this. */}
        <AppText style={styles.heading}>
          {match.i_requested ? 'We found your partner' : `${match.partner_first_name} wants to pair up`}
        </AppText>
        <AppText style={styles.name}>{match.partner_first_name}</AppText>
        <AppText style={styles.meta}>{meta}</AppText>
        {/* One curated line, written when the pairing was made. Not their raw
            answers — these two are strangers until both say yes. */}
        {match.blurb ? <AppText style={styles.quote}>"{match.blurb}"</AppText> : null}

        <Button
          label={match.i_requested ? "Let's do this" : 'Accept'}
          loading={confirm.isPending}
          onPress={onConfirm}
        />

        {match.i_requested ? (
          <>
            <PressableScale onPress={onFindAnother} haptic="selection">
              <AppText style={styles.declineText}>
                {findAnother.isPending ? 'Looking…' : 'Find someone else'}
              </AppText>
            </PressableScale>
            <AppText style={styles.searchesLeft}>
              {match.searches_left} of {match.daily_limit} searches left today
            </AppText>
          </>
        ) : (
          <PressableScale onPress={onDecline} haptic="selection">
            <AppText style={styles.declineText}>No thanks</AppText>
          </PressableScale>
        )}
      </LinearGradient>
      <AppText style={styles.note}>
        {match.they_confirmed
          ? `${match.partner_first_name} has already said yes.`
          : 'You both accept before Day 1 begins.'}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  searchesLeft: { fontSize: 10.5, color: DIM, marginTop: 2 },
  card: {
    borderRadius: 20,
    padding: 22,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(254,140,0,0.28)'
  },
  tagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginBottom: 10
  },
  tag: {
    borderWidth: 1,
    borderColor: 'rgba(254,140,0,0.35)',
    borderRadius: 100,
    paddingHorizontal: 11,
    paddingVertical: 4
  },
  tagText: { fontSize: 9, letterSpacing: 2, color: ORANGE, fontFamily: theme.fonts.bodyBold },
  dismiss: { fontSize: 11, color: theme.colors.muted },
  heading: { fontSize: 19, color: theme.colors.text, marginBottom: 8 },
  name: { fontSize: 16, color: theme.colors.text, fontFamily: theme.fonts.bodyBold },
  meta: { fontSize: 11.5, color: theme.colors.muted },
  quote: {
    fontSize: 12.5,
    color: ORANGE_SOFT,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16
  },
  declineText: { fontSize: 12, color: theme.colors.muted, marginTop: 12 },
  waiting: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(254,140,0,0.25)',
    backgroundColor: 'rgba(254,140,0,0.06)',
    padding: 14,
    marginBottom: 8
  },
  waitingText: { color: ORANGE_SOFT, textAlign: 'center' },
  note: { textAlign: 'center', color: DIM, fontSize: 10, marginTop: 12, marginBottom: 8 }
});
