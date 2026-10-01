import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { PairAvatars } from '@/components/plans/PairAvatars';
import { activityNoun, planCopy } from '@/features/plans/activity';
import { ACTIVITY_LABEL, COPY, lines } from '@/features/plans/copy';
import type { PairPlan } from '@/features/plans/types';
import { theme } from '@/constants/theme';
import { formatDayTime } from '@/features/plans/format';
import { cancelRequest, isPlanned, isSessionToday } from '@/features/plans/session';

// The session card on Challenges. While the pair is still agreeing a plan it
// is the gate into planning; once agreed it carries the plan, and hands off to
// the details screen (and, on the day itself, straight into the session).
export function PlanGateCard({
  plan,
  userChallengeId,
  myName,
  myAvatarUrl
}: {
  plan: PairPlan;
  userChallengeId: string;
  myName: string;
  myAvatarUrl: string | null;
}) {
  const activity = ACTIVITY_LABEL[plan.activity_key ?? ''] ?? 'Your challenge';
  const open = () =>
    router.push({ pathname: '/plan/[challengeId]', params: { challengeId: userChallengeId } });

  // Once agreed, the card carries the plan instead of the gate.
  if (plan.status !== 'planning') {
    const when = plan.starts_at ? formatDayTime(plan.starts_at) : null;
    const noun = activityNoun(plan.activity_key);
    const cancel = cancelRequest(plan);
    // Details are about a session that is still ahead. Once both have scanned
    // in it is under way, and the session itself is the only place to be.
    const planned = isPlanned(plan);
    const today = isSessionToday(plan);
    return (
      <View style={styles.card}>
        <AppText style={styles.eyebrow}>{lines.gateEyebrow(activity)}</AppText>
        {when ? <AppText style={styles.heading}>{lines.itsOn(when.day, when.time)}</AppText> : null}
        {cancel && !cancel.mine ? (
          <AppText style={styles.ask}>{plan.them.first_name} asked to cancel this {noun}.</AppText>
        ) : null}
        {today || !planned ? <Button label={`Open today's ${noun}`} onPress={open} /> : null}
        {planned ? (
          <Button
            label={cancel && !cancel.mine ? 'See the request' : 'Session details'}
            variant="ghost"
            onPress={() =>
              router.push({ pathname: '/challenge/[id]', params: { id: userChallengeId } } as never)
            }
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <AppText style={styles.eyebrow}>{lines.gateEyebrow(activity)}</AppText>
      <AppText style={styles.heading}>
        {COPY.gateHeading} <AppText style={styles.strong}>{COPY.gateHeadingStrong}</AppText>
      </AppText>
      <PairAvatars
        me={{ name: myName, avatarUrl: myAvatarUrl }}
        them={{ name: plan.them.first_name, avatarUrl: plan.them.avatar_url }}
      />
      <Button
        label={
          plan.is_repair
            ? 'Plan the make-up session'
            : plan.kind === 'first_run'
            ? planCopy(plan.activity_key).gateButton
            : `Plan your next ${activityNoun(plan.activity_key)}`
        }
        onPress={open}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(253,131,2,0.28)',
    gap: 10
  },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, color: theme.colors.muted },
  heading: { fontSize: 19, color: theme.colors.text },
  ask: { fontSize: 13, color: theme.colors.primary2 },
  strong: { fontFamily: theme.fonts.bodyBold, color: theme.colors.primary }
});
