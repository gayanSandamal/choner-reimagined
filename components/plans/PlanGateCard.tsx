import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { PairAvatars } from '@/components/plans/PairAvatars';
import { ACTIVITY_LABEL, COPY, lines } from '@/features/plans/copy';
import type { PairPlan } from '@/features/plans/types';
import { theme } from '@/constants/theme';
import { formatDayTime } from '@/features/plans/format';

// C1 — "Plan your first run". Additive (decision D1): it sits ABOVE the TODAY
// card and never replaces it, so the daily loop keeps running while the pair
// plans. No sub-line under the heading: that sentence was removed twice.
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
    return (
      <View style={styles.card}>
        <AppText style={styles.eyebrow}>{lines.gateEyebrow(activity)}</AppText>
        {when ? <AppText style={styles.heading}>{lines.itsOn(when.day, when.time)}</AppText> : null}
        <Button label="Open" variant="ghost" onPress={open} />
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
        label={plan.kind === 'first_run' ? COPY.gateButton : 'Plan your meetup'}
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
    borderColor: 'rgba(253,131,2,0.28)'
  },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, color: theme.colors.muted, marginBottom: 6 },
  heading: { fontSize: 19, color: theme.colors.text },
  strong: { fontFamily: theme.fonts.bodyBold, color: theme.colors.primary }
});
