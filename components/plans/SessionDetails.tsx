import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/Chip';
import { PressableScale } from '@/components/ui/PressableScale';
import { ReschedulePanel } from '@/components/plans/steps/SessionSteps';
import { activityNoun } from '@/features/plans/activity';
import { amountLine } from '@/features/plans/amounts';
import { ACTIVITY_LABEL } from '@/features/plans/copy';
import {
  useAnswerCancel,
  useNudgeSession,
  useProposeCancel,
  useSetRunningLate,
  useWithdrawPlanProposal
} from '@/features/plans/hooks';
import {
  LATE_OPTIONS,
  canNudge,
  canRunLate,
  cancelRequest,
  cancelWarning,
  isSessionToday,
  memberStatus,
  moveRequest,
  myTime,
  sessionRefusal
} from '@/features/plans/session';
import type { PairPlan } from '@/features/plans/types';
import { confirmAction, notify } from '@/lib/alert';
import { theme } from '@/constants/theme';

function whenParts(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return {
    day: d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }),
    time: d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  };
}

// One planned session: day, time, place, mode, and where each of you is.
//
// The only details screen. What is deliberately NOT here: your partner's why
// (the why is private), and anything that ends the match (that is Find's).
//
// Move and Cancel both need the other person to agree. Cancel warns first.
// Nudge and "Running late?" exist on the day and on no other day.
export function SessionDetails({
  plan,
  challengeId,
  me,
  now = new Date()
}: {
  plan: PairPlan;
  challengeId: string;
  me: { name: string; avatarUrl: string | null };
  now?: Date;
}) {
  const setLate = useSetRunningLate();
  const nudge = useNudgeSession();
  const proposeCancel = useProposeCancel();
  const answerCancel = useAnswerCancel();
  const withdraw = useWithdrawPlanProposal();
  const [askingLate, setAskingLate] = useState(false);
  const [moving, setMoving] = useState(false);

  const them = plan.them.first_name;
  const noun = activityNoun(plan.activity_key);
  const activity = ACTIVITY_LABEL[plan.activity_key ?? ''] ?? 'Your session';
  const when = whenParts(myTime(plan));
  const today = isSessionToday(plan, now);
  const together = plan.mode === 'together';
  const place = [plan.place_name, plan.place_text].filter(Boolean).join(', ');
  const amounts = amountLine(plan);
  const cancel = cancelRequest(plan, now);
  const move = moveRequest(plan);
  // A different time each, in separate mode.
  const theirWhen =
    !together && plan.them.planned_at && plan.them.planned_at !== plan.me.planned_at
      ? whenParts(plan.them.planned_at)
      : null;

  const run = async (fn: () => Promise<unknown>, title = 'Could not do that') => {
    try {
      const res: any = await fn();
      if (res && res.ok === false) {
        notify(title, sessionRefusal(res.reason, them));
        return null;
      }
      return res;
    } catch (error: any) {
      notify(title, error.message);
      return null;
    }
  };

  const onNudge = async () => {
    const res = await run(() => nudge.mutateAsync(plan.id), 'Could not nudge');
    if (res) notify('Nudged', `${them} will see it.`);
  };

  const onLate = async (minutes: number) => {
    const res = await run(() => setLate.mutateAsync({ planId: plan.id, minutes }));
    if (res) setAskingLate(false);
  };

  const onCancel = async () => {
    const ok = await confirmAction({
      ...cancelWarning(plan),
      confirmLabel: `Ask ${them} to cancel`,
      cancelLabel: 'Keep it on',
      destructive: true
    });
    if (!ok) return;
    await run(() => proposeCancel.mutateAsync(plan.id));
  };

  const onAgreeCancel = async () => {
    if (!cancel) return;
    const ok = await confirmAction({
      title: `Cancel this ${noun}?`,
      message: "This can't be undone. Cancelling does not touch either streak.",
      confirmLabel: 'Agree to cancel',
      cancelLabel: 'Not yet',
      destructive: true
    });
    if (!ok) return;
    const res = await run(() => answerCancel.mutateAsync({ proposalId: cancel.id, agree: true }));
    if (res) router.back();
  };

  return (
    <View style={styles.wrap}>
      <AppText style={styles.eyebrow}>{activity.toUpperCase()}</AppText>
      <AppText variant="title">{when ? when.day : `Your ${noun}`}</AppText>
      {when ? <AppText style={styles.time}>{when.time}</AppText> : null}

      <View style={styles.card}>
        <Row label="How" value={together ? 'Together, in person' : 'Separately, together'} />
        {together && place ? <Row label="Where" value={place} /> : null}
        {theirWhen ? <Row label={`${them}'s time`} value={theirWhen.time} /> : null}
        {amounts ? <Row label="How much" value={amounts} /> : null}
        {plan.is_repair ? <Row label="Counts as" value="A make-up session" last /> : null}
      </View>

      {/* Both statuses, side by side. Never a blaming line: only what each
          person has said themselves. */}
      <View style={styles.card}>
        <Person name="You" avatarUrl={me.avatarUrl} avatarName={me.name} status={memberStatus(plan.me, plan.mode, 'me')} />
        <Person
          name={them}
          avatarUrl={plan.them.avatar_url}
          avatarName={them}
          status={memberStatus(plan.them, plan.mode, 'them')}
          last
        />
      </View>

      {/* A cancel request, from either side. It is the next thing to answer,
          so it sits above everything that can be done to the session. */}
      {cancel ? (
        <View style={[styles.card, styles.notice]}>
          {cancel.mine ? (
            <>
              <AppText style={styles.noticeTitle}>You asked to cancel.</AppText>
              <AppText style={styles.noticeBody}>
                Waiting for {them}. If they don't answer by the end of today, the plan stands.
              </AppText>
              <Button
                label="Take that back"
                variant="ghost"
                loading={withdraw.isPending}
                onPress={() => run(() => withdraw.mutateAsync(cancel.id))}
              />
            </>
          ) : (
            <>
              <AppText style={styles.noticeTitle}>{them} asked to cancel this {noun}.</AppText>
              <AppText style={styles.noticeBody}>It stays on unless you agree by the end of today.</AppText>
              <Button
                label="Keep it on"
                loading={answerCancel.isPending}
                onPress={() => run(() => answerCancel.mutateAsync({ proposalId: cancel.id, agree: false }))}
              />
              <Button label="Agree to cancel" variant="ghost" onPress={onAgreeCancel} />
            </>
          )}
        </View>
      ) : null}

      {/* A move in progress, or one being composed. Same panel as the day-of
          flow, so there is one way to pick a new time. */}
      {move || moving ? (
        <View style={styles.card}>
          <ReschedulePanel plan={plan} />
          {moving && !move ? <Button label="Leave it where it is" variant="ghost" onPress={() => setMoving(false)} /> : null}
        </View>
      ) : null}

      {today ? (
        <Button
          label={`Open today's ${noun}`}
          onPress={() => router.push({ pathname: '/plan/[challengeId]', params: { challengeId } })}
        />
      ) : null}

      {/* The day of, and only the day of. */}
      {canNudge(plan, now) ? (
        <Button label={`Nudge ${them}`} variant="outline" loading={nudge.isPending} onPress={onNudge} />
      ) : null}
      {canRunLate(plan, now) ? (
        askingLate ? (
          <View style={styles.card}>
            <AppText style={styles.noticeTitle}>How late?</AppText>
            <View style={styles.chips}>
              {LATE_OPTIONS.map((m) => (
                <Chip key={m} label={`${m} min`} active={plan.me.late_minutes === m} onPress={() => onLate(m)} />
              ))}
            </View>
            <AppText style={styles.noticeBody}>{them} is told straight away.</AppText>
          </View>
        ) : (
          <Button label="Running late?" variant="ghost" onPress={() => setAskingLate(true)} />
        )
      ) : null}

      {/* Both need the other person to agree, and both are neutral to the
          streak. Hidden while one of them is already being answered. */}
      {!cancel && !move && !moving ? (
        <View style={styles.pairRow}>
          <Button label={`Move this ${noun}`} variant="ghost" style={styles.half} onPress={() => setMoving(true)} />
          <Button
            label={`Cancel this ${noun}`}
            variant="ghost"
            style={styles.half}
            loading={proposeCancel.isPending}
            onPress={onCancel}
          />
        </View>
      ) : null}

      {/* Meetups only: a report is about meeting someone in person. Opens the
          same sheet as Find. */}
      {together ? (
        <PressableScale
          haptic="selection"
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Report a problem"
          onPress={() =>
            router.push({ pathname: '/modals/report', params: { mode: 'pair', id: challengeId, name: them } })
          }
        >
          <AppText style={styles.report}>Report a problem</AppText>
        </PressableScale>
      ) : null}
    </View>
  );
}

function Row({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <AppText style={styles.rowLabel}>{label}</AppText>
      <AppText style={styles.rowValue}>{value}</AppText>
    </View>
  );
}

function Person({
  name,
  avatarUrl,
  avatarName,
  status,
  last = false
}: {
  name: string;
  avatarUrl: string | null;
  avatarName: string;
  status: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.person, !last && styles.rowBorder]}>
      <Avatar uri={avatarUrl} name={avatarName} size={36} />
      <View style={styles.personText}>
        <AppText style={styles.personName}>{name}</AppText>
        <AppText style={styles.personStatus}>{status}</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing(1.5) },
  eyebrow: { fontSize: 10, letterSpacing: 1.2, color: theme.colors.muted },
  time: { fontSize: 18, color: theme.colors.primary2, fontFamily: theme.fonts.bodyMedium, marginTop: -6 },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 6
  },
  notice: { borderColor: 'rgba(253,131,2,0.28)', paddingVertical: 16, gap: 8 },
  noticeTitle: { fontSize: 16, color: theme.colors.text, fontFamily: theme.fonts.bodyMedium, paddingTop: 8 },
  noticeBody: { fontSize: 13, lineHeight: 19, color: theme.colors.muted, paddingBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 10 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border },
  rowLabel: { fontSize: 13, color: theme.colors.muted },
  rowValue: { fontSize: 14, color: theme.colors.text, flexShrink: 1, textAlign: 'right' },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  personText: { flexShrink: 1 },
  personName: { fontSize: 14, color: theme.colors.text, fontFamily: theme.fonts.bodyMedium },
  personStatus: { fontSize: 12.5, color: theme.colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pairRow: { flexDirection: 'row', gap: 8 },
  half: { flex: 1 },
  report: { fontSize: 12, color: theme.colors.muted, textAlign: 'center', marginTop: 4, textDecorationLine: 'underline' }
});
