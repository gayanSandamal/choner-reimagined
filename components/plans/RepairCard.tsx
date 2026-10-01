import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { useSetRepairPreference, useStartRepairPlan } from '@/features/plans/hooks';
import { formatDayTime } from '@/features/plans/format';
import type { RepairDebt } from '@/features/plans/types';
import { theme } from '@/constants/theme';
import { notify } from '@/lib/alert';

const REFUSALS: Record<string, string> = {
  already_planning: 'You already have a session being planned. Finish that one first.',
  one_per_week: 'You can make up one session a week. This one can be planned next week.',
  expired: 'The time to make this one up has passed.',
  no_partner: 'You need your partner to make this one up.',
  in_progress: 'This make-up session is already being planned.'
};

// A missed session, and what the pair owes for it.
//
// Nothing resets. A miss costs the circle and leaves BOTH people owing one
// session, because a session needs both of you and so it happened for neither.
// Repair is not a separate mechanic: it is choosing when to plan the make-up,
// after which the ordinary plan flow runs and your partner accepts like any
// other session. Neutral wording throughout: this card never says who missed.
export function RepairCard({
  debt,
  userChallengeId,
  partnerFirstName
}: {
  debt: Extract<RepairDebt, { owed: true }>;
  userChallengeId: string;
  partnerFirstName: string;
}) {
  const setPreference = useSetRepairPreference();
  const start = useStartRepairPlan();
  const openPlan = () =>
    router.push({ pathname: '/plan/[challengeId]', params: { challengeId: userChallengeId } });

  const when = debt.missed_at ? formatDayTime(debt.missed_at).day : null;
  // "This week" is only on offer while the week it was missed in is running.
  const thisWeekOpen = new Date(debt.this_week_ends_at).getTime() > Date.now();
  // repair_by is the instant the following week ENDS (a Monday midnight), so
  // step back a minute to name the last day it can still be done, with its
  // date: it can be up to two weeks away and a bare weekday would be ambiguous.
  const by = new Date(new Date(debt.repair_by).getTime() - 60_000).toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'short'
  });

  const planNow = async () => {
    try {
      const res = await start.mutateAsync(debt.missed_plan_id);
      if (res && res.ok === false) {
        notify('Not yet', REFUSALS[res.reason] ?? 'Please try again.');
        return;
      }
      openPlan();
    } catch (error: any) {
      notify('Could not start that', error.message);
    }
  };

  const choose = async (choice: 'this_week' | 'next_week') => {
    try {
      await setPreference.mutateAsync({ missedPlanId: debt.missed_plan_id, when: choice });
      if (choice === 'this_week') await planNow();
    } catch (error: any) {
      notify('Could not save that', error.message);
    }
  };

  if (debt.state === 'in_progress') {
    return (
      <View style={styles.card}>
        <AppText style={styles.eyebrow}>MAKE-UP SESSION</AppText>
        <AppText style={styles.heading}>You're planning the one you missed.</AppText>
        <Button label="Open the plan" variant="ghost" onPress={openPlan} />
      </View>
    );
  }

  const busy = setPreference.isPending || start.isPending;
  const waitingForNextWeek = thisWeekOpen && debt.when === 'next_week';

  return (
    <View style={styles.card}>
      <AppText style={styles.eyebrow}>ONE SESSION OWED</AppText>
      <AppText style={styles.heading}>
        {when ? `${when}'s session didn't happen.` : "A session didn't happen."}
      </AppText>
      <AppText muted style={styles.body}>
        Your streak is intact. You and {partnerFirstName} each owe one session, and making it up
        fills the circle. You have until {by}.
      </AppText>

      {waitingForNextWeek ? (
        <>
          <AppText muted style={styles.body}>You chose to make it up next week.</AppText>
          <Button label="Plan it now instead" variant="ghost" loading={busy} onPress={() => choose('this_week')} />
        </>
      ) : thisWeekOpen ? (
        <>
          <Button label="Make it up this week" loading={busy} onPress={() => choose('this_week')} />
          <Button label="Next week" variant="ghost" disabled={busy} onPress={() => choose('next_week')} />
        </>
      ) : (
        <Button label="Plan the make-up session" loading={busy} onPress={planNow} />
      )}

      {debt.lost > 0 ? (
        <AppText muted style={styles.note}>
          {debt.lost === 1 ? 'A second miss' : `${debt.lost} more misses`} that week can't be made up.
          One a week.
        </AppText>
      ) : null}
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
    borderColor: theme.colors.border,
    gap: 8
  },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, color: theme.colors.muted },
  heading: { fontSize: 19, color: theme.colors.text },
  body: { fontSize: 13, lineHeight: 19 },
  note: { fontSize: 12 }
});
