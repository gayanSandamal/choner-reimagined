import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { PressableScale } from '@/components/ui/PressableScale';
import { useConfirmMatch, useDeclineMatch, useMyMatch } from '@/features/challenges/hooks';
import { theme } from '@/constants/theme';

const ORANGE = '#FE8C00';
const ORANGE_SOFT = '#ffb355';
const DIM = '#2c4759';

// "We found your partner", as a banner rather than a takeover.
//
// A match can land while someone is mid-challenge on their own, and replacing
// the whole screen at that moment is jarring — the gentler read is an arrival
// above what they were already doing. Dismissing only hides it for this
// session; the match is still waiting on them next time.
export function MatchBanner() {
  const matchQ = useMyMatch();
  const confirm = useConfirmMatch();
  const decline = useDeclineMatch();
  const [dismissed, setDismissed] = useState(false);

  const match = matchQ.data;
  if (!match?.matched || dismissed) return null;

  // Already said yes: hold the frame quietly rather than asking twice.
  if (match.i_confirmed) {
    return (
      <Animated.View entering={FadeInDown.duration(320)} exiting={FadeOut} style={styles.waiting}>
        <AppText variant="caption" style={styles.waitingText}>
          You're in — waiting for {match.partner_first_name} to confirm.
        </AppText>
      </Animated.View>
    );
  }

  const onConfirm = async () => {
    try {
      const result = await confirm.mutateAsync(match.match_id);
      if (!result.both) {
        Alert.alert(
          "You're in",
          `We'll start the moment ${match.partner_first_name} confirms too.`
        );
      }
    } catch (error: any) {
      Alert.alert('Could not confirm', error.message);
    }
  };

  const onDecline = async () => {
    // Declining sends BOTH people back to the pool, so it is worth a beat of
    // friction rather than a single stray tap.
    Alert.alert('Keep looking?', `We'll find someone else for you both.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Keep looking',
        style: 'destructive',
        onPress: async () => {
          try {
            await decline.mutateAsync(match.match_id);
          } catch (error: any) {
            Alert.alert('Could not do that', error.message);
          }
        }
      }
    ]);
  };

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
          <PressableScale onPress={() => setDismissed(true)} hitSlop={10} haptic="selection">
            <AppText style={styles.dismiss}>Later</AppText>
          </PressableScale>
        </View>

        <AppText style={styles.heading}>We found your partner</AppText>
        <AppText style={styles.name}>{match.partner_first_name}</AppText>
        <AppText style={styles.meta}>
          {match.habit} · {match.duration_days}-day challenge
        </AppText>
        {/* One curated line, written when the pairing was made. Not their raw
            answers — these two are strangers until both say yes. */}
        {match.blurb ? <AppText style={styles.quote}>"{match.blurb}"</AppText> : null}

        <Button label="Let's do this" loading={confirm.isPending} onPress={onConfirm} />
        <PressableScale onPress={onDecline} haptic="selection">
          <AppText style={styles.declineText}>Not quite right — keep looking</AppText>
        </PressableScale>
      </LinearGradient>
      <AppText style={styles.note}>You both confirm before Day 1 begins.</AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
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
  tagText: {
    fontSize: 9,
    letterSpacing: 2,
    color: ORANGE,
    fontFamily: theme.fonts.bodyBold
  },
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
