import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/ui/AppText';
import { PressableScale } from '@/components/ui/PressableScale';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/StateViews';
import { Heart } from '@/components/challenges/Heart';
import { PairRow } from '@/components/challenges/PairRow';
import { LogTaskItem } from '@/components/home/LogTaskItem';
import { PartnerProof } from '@/components/home/PartnerProof';
import { LateNote } from '@/components/home/LateNote';
import { useCompleteTask, useUndoTaskCheckin } from '@/features/challenges/hooks';
import { captureProofPhoto, resolveProofType } from '@/features/challenges/capture';
import { useSession } from '@/providers/session-provider';
import { partnerStateOf } from '@/features/challenges/api';
import type { PartnerStatus } from '@/features/community/api';
import type { ProofType } from '@/types/database';
import { theme } from '@/constants/theme';

function firstName(name?: string | null) {
  return (name ?? 'Your partner').trim().split(/\s+/)[0] || 'Your partner';
}

type ChallengeTask = {
  id: string;
  title: string;
  due_window: string | null;
  task_type: string;
  proof_type?: ProofType | null;
  task_checkins?: Array<{ id: string; completed_at: string | null; photo_path?: string | null }>;
};

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function sortedTasks(challenge: any): ChallengeTask[] {
  const list = (challenge?.challenge_tasks ?? []) as ChallengeTask[];
  return [...list].sort((a, b) => (a.title ?? '').localeCompare(b.title ?? ''));
}

interface Props {
  challenge: any;
  streak: number;
  userName?: string | null;
  // Only meaningful for the partner card — the invite still awaiting a partner.
  waitingPartnerEmail?: string;
  // Only meaningful for the partner card once paired — the partner's identity
  // and whether they've logged today.
  partnerStatus?: PartnerStatus;
}

// The user's challenge: the heart, its task-logging, and whatever the partner
// half is currently doing. One card now — the partner lives on this challenge
// rather than in a second one alongside it.
export function ChallengeCard({
  challenge,
  streak,
  userName,
  waitingPartnerEmail,
  partnerStatus
}: Props) {
  const completeTask = useCompleteTask();
  const undoTask = useUndoTaskCheckin();
  const { session } = useSession();
  const userId = session?.user.id;

  // partner_state is the truth about the right half of the heart. It covers
  // the case status alone never could: a challenge sitting 'active' with
  // nobody on the other side, which used to render a two-person heart with an
  // empty seat and no way to invite anyone.
  //
  // partnerStatus is undefined while it loads; only treat someone as unpaired
  // once there's a definitive answer, so a paired user never flashes the
  // invite state on open.
  const partnerState = partnerStateOf(challenge);
  const partnered = partnerState === 'partnered';
  const partnerKnown = partnerStatus !== undefined;
  const needsPartner = !partnered && (partnerState === 'solo' || (partnerKnown && !partnerStatus?.linked));
  const showPartnerStatus = partnered && Boolean(partnerStatus?.linked);
  const mode: 'solo' | 'partner' = partnered ? 'partner' : 'solo';
  const tasks = useMemo(() => sortedTasks(challenge), [challenge]);

  const today = todayString();
  const todaysCheckinFor = (task: ChallengeTask) =>
    (task.task_checkins ?? []).find((c) => (c.completed_at ?? '').slice(0, 10) === today);

  const pendingTasks = tasks.filter((t) => !todaysCheckinFor(t));
  const burnedTasks = tasks.filter((t) => todaysCheckinFor(t));
  const completedToday = burnedTasks.length;

  const onFeedFire = async (task: ChallengeTask) => {
    if (!challenge || !userId) return;
    const proof = resolveProofType(task, challenge);

    let photoBase64: string | undefined;
    if (proof === 'photo') {
      const shot = await captureProofPhoto();
      // Backing out of the camera must not silently log the habit anyway.
      if (shot.status === 'cancelled') return;
      if (shot.status === 'captured') photoBase64 = shot.base64;
      // 'unavailable' (web) falls through to a plain tap so the check-in still
      // works rather than becoming impossible on that platform.
    }

    completeTask.mutate({
      taskId: task.id,
      userChallengeId: challenge.id,
      userId,
      photoBase64
    });
  };

  const onUndo = (task: ChallengeTask) => {
    const checkin = todaysCheckinFor(task);
    if (checkin) undoTask.mutate({ checkinId: checkin.id, photoPath: checkin.photo_path });
  };

  return (
    <View style={styles.card}>
      {/* The heart, not a flame: one symbol across the product, split so the
          left half is you and the right half is your partner. */}
      <Heart
        youCheckedIn={completedToday > 0 && completedToday === tasks.length}
        partnerCheckedIn={Boolean(partnerStatus?.checked_in_today)}
        partnerState={partnerState}
      />

      <PairRow
        youName={userName}
        youCheckedIn={completedToday > 0 && completedToday === tasks.length}
        streak={streak}
        partner={
          partnerState === 'finding'
            ? { kind: 'seeking' }
            : partnered
            ? { kind: 'person', name: partnerStatus?.name, on: Boolean(partnerStatus?.checked_in_today) }
            : { kind: 'open' }
        }
      />

      {showPartnerStatus ? (
        <View style={styles.partnerStatusRow}>
          <Ionicons
            name={partnerStatus?.checked_in_today ? 'checkmark-circle' : 'ellipse-outline'}
            size={16}
            color={partnerStatus?.checked_in_today ? theme.colors.success : theme.colors.muted}
          />
          <AppText
            variant="caption"
            style={{ color: partnerStatus?.checked_in_today ? theme.colors.success : theme.colors.muted }}
          >
            {partnerStatus?.checked_in_today
              ? `${firstName(partnerStatus?.name)} logged today`
              : `${firstName(partnerStatus?.name)} hasn't logged yet today`}
          </AppText>
        </View>
      ) : null}

      {showPartnerStatus ? (
        <PartnerProof
          photos={partnerStatus?.today_photos ?? []}
          partnerName={firstName(partnerStatus?.name)}
        />
      ) : null}

      {/* Only on the partner track, and only while today is still unlogged —
          there is nothing to explain once today is logged. */}
      {/* A late note is a message to a partner — pointless with nobody there. */}
      {partnered && challenge && pendingTasks.length > 0 ? (
        <LateNote userChallengeId={challenge.id} />
      ) : null}

      {needsPartner ? (
        <View style={styles.pendingBlock}>
          <AppText variant="caption" muted style={styles.centerText}>
            {waitingPartnerEmail
              ? `Your challenge starts the moment ${waitingPartnerEmail} joins.`
              : 'Invite someone to do this with — you hold each other to it.'}
          </AppText>
          <Button
            label={waitingPartnerEmail ? 'Invite someone else' : 'Invite a partner'}
            variant={waitingPartnerEmail ? 'ghost' : 'gradient'}
            onPress={() => router.push('/group/invite')}
          />
        </View>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No tasks set up yet"
          body="This challenge has no tasks — try restarting it from the challenge detail screen."
        />
      ) : (
        <>
          <View style={{ gap: theme.spacing(1) }}>
            {pendingTasks.map((task) => (
              <LogTaskItem
                key={task.id}
                title={task.title}
                taskType={task.task_type}
                dueWindow={task.due_window}
                onFeedFire={() => onFeedFire(task)}
              />
            ))}
          </View>

          {burnedTasks.length > 0 ? (
            <View style={styles.burnedRow}>
              {burnedTasks.map((task) => (
                <PressableScale
                  key={task.id}
                  style={styles.burnedChip}
                  onPress={() => onUndo(task)}
                  haptic="selection"
                >
                  <Ionicons name="checkmark" size={12} color={theme.colors.success} />
                  <AppText
                    variant="caption"
                    style={{ color: theme.colors.muted, textDecorationLine: 'line-through' }}
                  >
                    {task.title}
                  </AppText>
                </PressableScale>
              ))}
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: theme.spacing(2),
    gap: theme.spacing(1.5)
  },
  pendingBlock: { gap: theme.spacing(1.5), alignItems: 'stretch' },
  partnerStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.colors.surfaceHighlight,
    borderRadius: theme.radius.pill,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'center'
  },
  centerText: { textAlign: 'center' },
  burnedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  burnedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.chip,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6
  }
});
