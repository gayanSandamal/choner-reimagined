import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/Chip';
import { PairAvatars } from '@/components/plans/PairAvatars';
import { useStreak } from '@/features/challenges/hooks';
import { COPY, REACTIONS, lines } from '@/features/plans/copy';
import { useRecordSessionShare, useTogglePlanReaction } from '@/features/plans/hooks';
import type { PairPlan } from '@/features/plans/types';
import { notify } from '@/lib/alert';
import { useSession } from '@/providers/session-provider';
import { theme } from '@/constants/theme';

function doneAt(m: { finished_at: string | null; checkin_at: string | null; checkin: string | null }) {
  const at = m.finished_at ?? (m.checkin === 'done' ? m.checkin_at : null);
  return at ? new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : null;
}

// §3.17 State A (you're in, partner not yet) and §3.18 State B (both).
export function CompletionStep({ plan, me }: { plan: PairPlan; me: { name: string; avatarUrl: string | null } }) {
  const { session } = useSession();
  const streak = useStreak(session?.user.id).data ?? 0;
  const react = useTogglePlanReaction();
  const share = useRecordSessionShare();
  const both = plan.status === 'completed';
  const distance = plan.distance ?? '';
  const them = plan.them.first_name;

  const pair = (
    <PairAvatars
      me={me}
      them={{ name: them, avatarUrl: plan.them.avatar_url }}
      dimThem={!both}
      themLabel={both ? them : COPY.waiting}
    />
  );

  if (!both) {
    // No reactions here: reacting to your own check-in doesn't apply.
    return (
      <View style={styles.wrap}>
        <AppText variant="title">{COPY.youShowedUp}</AppText>
        {distance ? <AppText muted>{distance}</AppText> : null}
        {pair}
        <AppText muted style={styles.center}>{streak} day streak</AppText>
        <AppText muted style={styles.center}>{lines.waitingFor(them)}</AppText>
      </View>
    );
  }

  const run = async (fn: () => Promise<any>) => {
    try {
      await fn();
    } catch (error: any) {
      notify('Could not do that', error.message);
    }
  };
  const mine = new Set((plan.reactions ?? []).filter((r) => r.mine).map((r) => r.reaction));
  const theirs = (plan.reactions ?? []).filter((r) => !r.mine).map((r) => r.reaction);

  return (
    <View style={styles.wrap}>
      <AppText variant="title">{COPY.bothShowedUp}</AppText>
      {pair}
      <AppText muted style={styles.center}>{streak} day streak</AppText>

      {/* Both runs, from whoever is looking — never one hardcoded name. */}
      <View style={styles.cards}>
        <RunCard title="Your run" distance={distance} at={doneAt(plan.me)} />
        <RunCard title={`${them}'s run`} distance={distance} at={doneAt(plan.them)} />
      </View>

      <View style={styles.chips}>
        {REACTIONS.map((r) => (
          <Chip
            key={r}
            label={r}
            active={mine.has(r)}
            onPress={() => run(() => react.mutateAsync({ planId: plan.id, reaction: r }))}
          />
        ))}
      </View>
      {theirs.length ? <AppText muted>{them}: {theirs.join(' · ')}</AppText> : null}

      {/* Every session together, not just streaks. "Not now" is recorded so
          this session isn't asked about again; a post needs both yeses. */}
      {plan.my_share == null ? (
        <View style={styles.share}>
          <Button label={COPY.shareToInspire} onPress={() => run(() => share.mutateAsync({ planId: plan.id, shared: true }))} />
          <Button label={COPY.notNow} variant="ghost" onPress={() => run(() => share.mutateAsync({ planId: plan.id, shared: false }))} />
        </View>
      ) : plan.my_share ? (
        <AppText muted style={styles.center}>Shared once {them} says yes too.</AppText>
      ) : null}
    </View>
  );
}

function RunCard({ title, distance, at }: { title: string; distance: string; at: string | null }) {
  return (
    <View style={styles.card}>
      <AppText muted style={styles.cardTitle}>{title}</AppText>
      <AppText style={styles.cardValue}>{distance || 'Done'}</AppText>
      {at ? <AppText muted style={styles.cardTitle}>{at}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing(1.5) },
  center: { textAlign: 'center' },
  cards: { flexDirection: 'row', gap: theme.spacing(1.5) },
  card: { flex: 1, backgroundColor: theme.colors.surface3, borderRadius: theme.radius.md, padding: theme.spacing(1.5), gap: 2 },
  cardTitle: { fontSize: 11.5 },
  cardValue: { fontSize: 16, color: theme.colors.text, fontFamily: theme.fonts.bodyMedium },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  share: { gap: theme.spacing(1) }
});
