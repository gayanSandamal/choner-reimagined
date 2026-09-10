import { useState } from 'react';
import { useSession } from '@/providers/session-provider';
import { useMyChallenge, useYesterdayStatus, useSetMissReason } from '@/features/challenges/hooks';
import { MissReasonOverlay } from '@/components/challenges/MissReasonOverlay';

// Mirrors NotificationGate: only mounts the query/overlay once there is a
// signed-in user with a challenge to ask about. `handled` hides the prompt
// for the rest of the session the moment it's answered or dismissed, so a
// stale query result can't flash it back up before the invalidation lands.
export function MissReasonGate() {
  const { session } = useSession();
  const userId = session?.user.id;
  const challengeQ = useMyChallenge(userId);
  const challengeId = challengeQ.data?.id as string | undefined;
  const yesterdayQ = useYesterdayStatus(challengeId);
  const setReason = useSetMissReason();
  const [handled, setHandled] = useState(false);

  if (!challengeId || !yesterdayQ.data?.needs_prompt || handled) return null;

  const localDate = yesterdayQ.data.local_date;

  return (
    <MissReasonOverlay
      onSelect={(reason) => {
        setReason.mutate({ userChallengeId: challengeId, localDate, reason });
        setHandled(true);
      }}
      onDismiss={() => {
        setReason.mutate({ userChallengeId: challengeId, localDate, reason: null });
        setHandled(true);
      }}
    />
  );
}
