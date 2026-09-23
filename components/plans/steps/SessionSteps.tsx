import { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/Chip';
import { Input } from '@/components/ui/input';
import { captureProofPhoto } from '@/features/challenges/capture';
import { useCompleteTask, useMyChallenge } from '@/features/challenges/hooks';
import { COPY, RECOVERY_REASONS, lines } from '@/features/plans/copy';
import { formatDayTime } from '@/features/plans/format';
import {
  useAcceptReschedule,
  useFinishSession,
  useIssueSessionQr,
  useProposeReschedule,
  useRelayResponse,
  useSendEncouragement,
  useSetArrival,
  useSetSessionCheckin,
  useVerifySessionQr
} from '@/features/plans/hooks';
import { at, nextDays, TIME_SLOTS } from '@/features/plans/negotiation';
import type { PairPlan } from '@/features/plans/types';
import { RELAY_ACTIONS } from '@/lib/notifications';
import { notify } from '@/lib/alert';
import { useSession } from '@/providers/session-provider';
import { theme } from '@/constants/theme';

async function guard(fn: () => Promise<any>, refusal?: (reason: string) => string | null) {
  try {
    const res = await fn();
    if (res && res.ok === false) {
      const msg = refusal?.(res.reason);
      if (msg !== null) notify('Could not do that', msg ?? 'Please try again.');
    }
    return res;
  } catch (error: any) {
    notify('Could not do that', error.message);
  }
}

function ItsOn({ plan }: { plan: PairPlan }) {
  if (!plan.starts_at) return null;
  const w = formatDayTime(plan.starts_at);
  return <AppText muted style={styles.itsOn}>{lines.itsOn(w.day, w.time)}</AppText>;
}

// ============================================================
// 6A — Day of
// ============================================================
// "I'm on my way" → "I'm here", per person. QR never opens on one tap: only
// once BOTH are here does the screen move on (planStep → 'qr').
export function DayOfStep({ plan }: { plan: PairPlan }) {
  const arrive = useSetArrival();
  const relay = useRelayResponse();
  const them = plan.them.first_name;
  const meHere = Boolean(plan.me.here_at);
  const meOnWay = Boolean(plan.me.on_my_way_at);
  const themHere = Boolean(plan.them.here_at);
  const cantToday = Boolean(plan.me.cant_make_it_at || plan.them.cant_make_it_at);

  if (cantToday) return <ReschedulePanel plan={plan} />;

  let status: string | null = null;
  if (meHere && !themHere) status = lines.hereWaiting(them);
  else if (themHere && !meOnWay) status = lines.alreadyHereWaiting(them);
  else if (themHere && meOnWay) status = lines.alreadyHere(them);

  return (
    <View style={styles.wrap}>
      <ItsOn plan={plan} />
      <AppText variant="title">{[plan.place_name, plan.place_text].filter(Boolean).join(' — ')}</AppText>
      {status ? <AppText style={styles.status}>{status}</AppText> : null}

      {/* The partner already arrived: the three relay answers, in the app too
          (the push carries them as buttons; this covers everyone else). */}
      {themHere && !meHere ? (
        <View style={styles.options}>
          {(Object.keys(RELAY_ACTIONS) as (keyof typeof RELAY_ACTIONS)[]).map((k) => (
            <Button
              key={k}
              label={RELAY_ACTIONS[k]}
              variant={k === 'here_too' ? 'primary' : 'ghost'}
              onPress={() => guard(() => relay.mutateAsync({ planId: plan.id, choice: k }))}
            />
          ))}
        </View>
      ) : !meHere ? (
        <View style={styles.options}>
          {!meOnWay ? (
            <Button
              label={COPY.onMyWay}
              variant="ghost"
              onPress={() => guard(() => arrive.mutateAsync({ planId: plan.id, state: 'on_my_way' }))}
            />
          ) : null}
          <Button
            label={COPY.imHere}
            loading={arrive.isPending}
            onPress={() => guard(() => arrive.mutateAsync({ planId: plan.id, state: 'here' }))}
          />
        </View>
      ) : null}
    </View>
  );
}

// ============================================================
// 6A — QR verification
// ============================================================
// Both are here. The temporary chat opens (P8) and QR verification is its own
// explicit button. One shows a short-lived code, the other scans it with the
// live camera — no gallery. The scan IS the check-in.
export function QrStep({ plan, chat }: { plan: PairPlan; chat?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.wrap}>
      <AppText style={styles.status}>{lines.chatOpen(plan.them.first_name)}</AppText>
      {chat}
      <Button label={COPY.openQr} onPress={() => setOpen(true)} />
      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <QrVerify plan={plan} onClose={() => setOpen(false)} />
      </Modal>
    </View>
  );
}

function QrVerify({ plan, onClose }: { plan: PairPlan; onClose: () => void }) {
  const issue = useIssueSessionQr();
  const verify = useVerifySessionQr();
  const [mode, setMode] = useState<'show' | 'scan'>('show');
  const [payload, setPayload] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  const showCode = async () => {
    setMode('show');
    const res: any = await guard(() => issue.mutateAsync(plan.id), (r) =>
      r === 'not_both_here' ? 'You both need to be here first.' : undefined as any
    );
    if (res?.ok) setPayload(res.payload);
  };

  const onScan = async (data: string) => {
    if (scanned) return;
    setScanned(true);
    const res: any = await guard(() => verify.mutateAsync(data), (r) =>
      r === 'expired'
        ? 'That code has expired. Ask for a fresh one.'
        : r === 'own_code'
        ? 'Scan your partner’s code, not your own.'
        : r === 'not_a_choner_code'
        ? 'That isn’t a Choner code.'
        : undefined as any
    );
    if (res?.ok) onClose();
    else setTimeout(() => setScanned(false), 1500);
  };

  return (
    <View style={styles.modal}>
      <View style={styles.options}>
        <Chip label="Show my code" active={mode === 'show'} onPress={showCode} />
        <Chip label={`Scan ${plan.them.first_name}'s code`} active={mode === 'scan'} onPress={() => setMode('scan')} />
      </View>

      {mode === 'show' ? (
        payload ? (
          <View style={styles.qr}>
            <QRCode value={payload} size={220} />
            <AppText muted>Valid for 2 minutes.</AppText>
          </View>
        ) : (
          <Button label="Show my code" loading={issue.isPending} onPress={showCode} />
        )
      ) : !permission?.granted ? (
        <Button label="Allow camera" onPress={() => requestPermission()} />
      ) : (
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => onScan(data)}
        />
      )}
      <Button label="Close" variant="ghost" onPress={onClose} />
    </View>
  );
}

// Finish — one tap, a timestamp, nothing else (§3.12).
export function FinishStep({ plan }: { plan: PairPlan }) {
  const finish = useFinishSession();
  return (
    <View style={styles.wrap}>
      <AppText variant="title">{lines.together(plan.distance ?? 'Your run')}</AppText>
      <Button
        label={COPY.finishRun}
        loading={finish.isPending}
        onPress={() => guard(() => finish.mutateAsync(plan.id))}
      />
    </View>
  );
}

// ============================================================
// 6B — check-in
// ============================================================
export function CheckinStep({ plan, challengeId }: { plan: PairPlan; challengeId: string }) {
  const { session } = useSession();
  const userId = session?.user.id;
  const challengeQ = useMyChallenge(userId);
  const completeTask = useCompleteTask();
  const setCheckin = useSetSessionCheckin();
  const [asking, setAsking] = useState<'photo' | 'recovery' | null>(null);
  const distance = plan.distance ?? 'run';

  const reschedule = (plan.open_proposals ?? []).find((p) => p.field === 'reschedule');
  if (reschedule) return <ReschedulePanel plan={plan} />;

  const markDone = async (withPhoto: boolean) => {
    const challenge: any = challengeQ.data;
    const task = challenge?.id === challengeId ? (challenge?.challenge_tasks ?? [])[0] : null;
    let photoBase64: string | undefined;
    if (withPhoto) {
      const shot = await captureProofPhoto();
      if (shot.status === 'cancelled') return;
      if (shot.status === 'captured') photoBase64 = shot.base64;
    }
    try {
      if (task && userId) {
        await completeTask.mutateAsync({ taskId: task.id, userChallengeId: challengeId, userId, photoBase64 });
      }
      await guard(() => setCheckin.mutateAsync({ planId: plan.id, state: 'done' }));
      setAsking(null);
    } catch (error: any) {
      notify('Could not check in', error.message);
    }
  };

  if (asking === 'photo') {
    return (
      <View style={styles.wrap}>
        <AppText>{COPY.momentPrompt}</AppText>
        {/* D7 is open: the handover's line also promises "Saved to your
            profile", which isn't true yet — today's photos are deleted after
            your partner views them. Only the true half is shown. */}
        <AppText muted style={styles.small}>Only visible to your partner, once.</AppText>
        <Button label="Take a photo" loading={completeTask.isPending} onPress={() => markDone(true)} />
        <Button label="Skip" variant="ghost" onPress={() => markDone(false)} />
      </View>
    );
  }

  if (asking === 'recovery') return <RecoveryPanel plan={plan} onBack={() => setAsking(null)} />;

  return (
    <View style={styles.wrap}>
      <ItsOn plan={plan} />
      {/* Partner visibility, not verification: their check-in is the nudge. */}
      {plan.them.checkin === 'done' ? (
        <AppText style={styles.status}>{lines.partnerDone(plan.them.first_name, distance)}</AppText>
      ) : null}
      {plan.me.checkin === 'later' ? (
        <Button label={COPY.iveCompletedIt} onPress={() => setAsking('photo')} />
      ) : (
        <View style={styles.options}>
          <Button label={COPY.checkinDone} onPress={() => setAsking('photo')} />
          <Button
            label={COPY.checkinLater}
            variant="ghost"
            onPress={() => guard(() => setCheckin.mutateAsync({ planId: plan.id, state: 'later' }))}
          />
          <Button label={COPY.checkinCant} variant="ghost" onPress={() => setAsking('recovery')} />
        </View>
      )}
    </View>
  );
}

// Can't today → recovery: what happened, then try again.
function RecoveryPanel({ plan, onBack }: { plan: PairPlan; onBack: () => void }) {
  const setCheckin = useSetSessionCheckin();
  const [reason, setReason] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [picking, setPicking] = useState(false);

  if (picking) return <RescheduleComposer plan={plan} onDone={onBack} />;

  const answer = async () => {
    if (!reason) return;
    const res: any = await guard(() => setCheckin.mutateAsync({ planId: plan.id, state: 'cant', reason }));
    if (res?.ok) setPicking(true);
  };

  return (
    <View style={styles.wrap}>
      <AppText variant="title">{COPY.whatHappened}</AppText>
      <AppText muted>{COPY.motivational}</AppText>
      <View style={styles.chips}>
        {RECOVERY_REASONS.map((r) => (
          <Chip key={r} label={r} active={reason === r} onPress={() => setReason(r)} />
        ))}
      </View>
      <Input label="Anything to add? (optional)" value={caption} onChangeText={setCaption} maxLength={120} />
      <AppText>{COPY.tryTomorrow}</AppText>
      {/* Either answer opens the day + time picker (§3.16). */}
      <Button label={COPY.moveActivity} disabled={!reason} onPress={answer} />
      <Button label={COPY.catchUp} variant="ghost" disabled={!reason} onPress={answer} />
      <Button label="Back" variant="ghost" onPress={onBack} />
    </View>
  );
}

function RescheduleComposer({ plan, onDone }: { plan: PairPlan; onDone: () => void }) {
  const propose = useProposeReschedule();
  const days = nextDays(new Date(Date.now() + 24 * 3600e3), 6);
  const [day, setDay] = useState<Date | null>(null);
  const [slot, setSlot] = useState<(typeof TIME_SLOTS)[number] | null>(null);
  return (
    <View style={styles.wrap}>
      <AppText>{COPY.countingOnYou}</AppText>
      <View style={styles.chips}>
        {days.map((d) => (
          <Chip
            key={d.toISOString()}
            label={d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' })}
            active={day?.getTime() === d.getTime()}
            onPress={() => setDay(d)}
          />
        ))}
      </View>
      <View style={styles.chips}>
        {TIME_SLOTS.map((s) => {
          const label = new Date(2000, 0, 1, s.h, s.m).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
          return <Chip key={label} size="sm" label={label} active={slot === s} onPress={() => setSlot(s)} />;
        })}
      </View>
      <Button
        label="Suggest this time"
        disabled={!day || !slot}
        loading={propose.isPending}
        onPress={async () => {
          if (!day || !slot) return;
          const res: any = await guard(() => propose.mutateAsync({ planId: plan.id, startsAt: at(day, slot) }));
          if (res?.ok) onDone();
        }}
      />
    </View>
  );
}

// The partner's side of a reschedule: accept it, or send encouragement.
// The proposer waits. Also used for 6A "Won't be able to make it today".
export function ReschedulePanel({ plan }: { plan: PairPlan }) {
  const accept = useAcceptReschedule();
  const encourage = useSendEncouragement();
  const [composing, setComposing] = useState(false);
  const proposal = (plan.open_proposals ?? []).find((p) => p.field === 'reschedule');

  if (!proposal || composing) {
    return (
      <View style={styles.wrap}>
        <AppText variant="title">Pick a new time</AppText>
        <RescheduleComposer plan={plan} onDone={() => setComposing(false)} />
      </View>
    );
  }
  const w = formatDayTime(proposal.value.starts_at);
  if (proposal.mine) {
    return (
      <View style={styles.wrap}>
        <AppText>You suggested {w.day}, {w.time}.</AppText>
        <AppText muted>{lines.waitingFor(plan.them.first_name)}</AppText>
      </View>
    );
  }
  return (
    <View style={styles.wrap}>
      <AppText>
        {plan.them.first_name} suggested {w.day}, {w.time}.
      </AppText>
      <Button
        label={COPY.acceptChange}
        loading={accept.isPending}
        onPress={() => guard(() => accept.mutateAsync(proposal.id))}
      />
      <Button
        label={COPY.sendEncouragement}
        variant="ghost"
        onPress={() =>
          guard(() => encourage.mutateAsync(plan.id), (r) => (r === 'already_sent' ? 'You just sent one.' : (undefined as any)))
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing(1.5) },
  options: { gap: theme.spacing(1) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  itsOn: { fontSize: 12.5 },
  status: { fontSize: 15, color: theme.colors.text },
  small: { fontSize: 11.5 },
  modal: { flex: 1, padding: theme.spacing(3), paddingTop: theme.spacing(8), gap: theme.spacing(2), backgroundColor: theme.colors.bg },
  qr: { alignItems: 'center', gap: theme.spacing(1.5), paddingVertical: theme.spacing(2) },
  camera: { width: '100%', aspectRatio: 1, borderRadius: 16, overflow: 'hidden' }
});
