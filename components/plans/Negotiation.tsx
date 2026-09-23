import { useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { PressableScale } from '@/components/ui/PressableScale';
import { COPY, lines } from '@/features/plans/copy';
import {
  useAcceptPlanProposal,
  useRequestPlanHelp,
  useWithdrawPlanProposal
} from '@/features/plans/hooks';
import { HELP_AFTER_ROUNDS, proposalLabel } from '@/features/plans/negotiation';
import type { PairPlan } from '@/features/plans/types';
import { notify } from '@/lib/alert';
import { theme } from '@/constants/theme';

// The shared negotiation component (handover §3.5): one person suggests, the
// other says "Sounds good" or suggests another, and after two rounds with no
// agreement "Need help choosing?" hands it to founders. Identical for
// distance, mode, place, time and day/time — only the suggest UI differs.
//
// Back steps out of a suggestion in progress FIRST (withdrawing yours, or
// closing the composer) before it ever leaves the screen.
export function Negotiation({
  plan,
  field,
  renderSuggest,
  helpLabel = COPY.needHelp,
  suggestAnotherLabel = 'Suggest another'
}: {
  plan: PairPlan;
  field: 'distance' | 'mode' | 'place' | 'time' | 'day_time';
  renderSuggest: (done: () => void) => ReactNode;
  helpLabel?: string;
  suggestAnotherLabel?: string;
}) {
  const open = (plan.open_proposals ?? []).find((p) => p.field === field) ?? null;
  const rounds = (plan as any).rounds?.[field] ?? 0;
  const [composing, setComposing] = useState(false);
  const accept = useAcceptPlanProposal();
  const withdraw = useWithdrawPlanProposal();
  const help = useRequestPlanHelp();

  const run = async (fn: () => Promise<any>) => {
    try {
      const res = await fn();
      if (res && res.ok === false && res.reason !== 'not_open') notify('Could not do that', 'Please try again.');
    } catch (error: any) {
      notify('Could not do that', error.message);
    }
  };

  const helpLink =
    rounds >= HELP_AFTER_ROUNDS && !plan.founder_help_required ? (
      <PressableScale onPress={() => run(() => help.mutateAsync({ planId: plan.id, field }))} haptic="selection">
        <AppText style={styles.link}>{helpLabel}</AppText>
      </PressableScale>
    ) : plan.founder_help_required ? (
      <AppText muted style={styles.note}>
        We'll help you choose — someone from the team will be in touch.
      </AppText>
    ) : null;

  if (composing || !open) {
    return (
      <View style={styles.wrap}>
        {renderSuggest(() => setComposing(false))}
        {composing ? (
          <Button label="Back" variant="ghost" onPress={() => setComposing(false)} />
        ) : null}
        {helpLink}
      </View>
    );
  }

  if (open.mine) {
    return (
      <View style={styles.wrap}>
        <View style={styles.card}>
          <AppText muted style={styles.label}>You suggested</AppText>
          <AppText style={styles.value}>{proposalLabel(field, open.value)}</AppText>
        </View>
        <AppText muted>{lines.waitingFor(plan.them.first_name)}</AppText>
        <Button
          label="Back"
          variant="ghost"
          loading={withdraw.isPending}
          onPress={() => run(() => withdraw.mutateAsync(open.id))}
        />
        {helpLink}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <View style={styles.chip}>
          <AppText style={styles.chipText}>{COPY.needYourAnswer}</AppText>
        </View>
        <AppText muted style={styles.label}>{plan.them.first_name} suggested</AppText>
        <AppText style={styles.value}>{proposalLabel(field, open.value)}</AppText>
      </View>
      <Button
        label={COPY.soundsGood}
        loading={accept.isPending}
        onPress={() => run(() => accept.mutateAsync(open.id))}
      />
      <Button label={suggestAnotherLabel} variant="ghost" onPress={() => setComposing(true)} />
      {helpLink}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing(1.25) },
  card: {
    backgroundColor: theme.colors.surface3,
    borderRadius: theme.radius.md,
    padding: theme.spacing(1.75),
    gap: 4
  },
  chip: {
    alignSelf: 'flex-start',
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: 'rgba(253,131,2,0.12)',
    marginBottom: 4
  },
  chipText: { fontSize: 11, color: theme.colors.primary2 },
  label: { fontSize: 11.5 },
  value: { fontSize: 16, color: theme.colors.text, fontFamily: theme.fonts.bodyMedium },
  link: { color: theme.colors.primary2, fontSize: 13, textAlign: 'center', marginTop: 6 },
  note: { fontSize: 12, textAlign: 'center' }
});
