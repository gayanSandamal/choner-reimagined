import { useState } from 'react';
import { useSession } from '@/providers/session-provider';
import {
  useMyChallenge,
  useStartingPointStatus,
  useSetStartingPoint
} from '@/features/challenges/hooks';
import { challengeHabitTitle } from '@/features/challenges/api';
import { StartingPointOverlay } from '@/components/challenges/StartingPointOverlay';

// Same shape as MissReasonGate: server state decides whether to ask, and a
// local `handled` flag hides it for the rest of the session so a stale refetch
// can't flash it back before the invalidation lands.
//
// Unlike the miss-reason prompt this one re-surfaces once per DAY rather than
// once ever — dismissing is "remind me tomorrow", not "never ask again".
export function StartingPointGate() {
  const { session } = useSession();
  const userId = session?.user.id;
  const challengeQ = useMyChallenge(userId);
  const challengeId = challengeQ.data?.id as string | undefined;
  const statusQ = useStartingPointStatus(challengeId);
  const setStartingPoint = useSetStartingPoint();
  const [handled, setHandled] = useState(false);

  if (!challengeId || !statusQ.data?.needs_prompt || handled) return null;

  return (
    <StartingPointOverlay
      status={statusQ.data}
      habitTitle={challengeHabitTitle(challengeQ.data)}
      busy={setStartingPoint.isPending}
      onSubmit={(answer) => {
        setStartingPoint.mutate({
          userChallengeId: challengeId,
          capability: answer.capability ?? null,
          beginnerStart: answer.beginnerStart ?? null,
          commitment: answer.commitment
        });
        setHandled(true);
      }}
      onDismiss={() => {
        // All-null is the dismiss: it only stamps today's date server-side so
        // the prompt returns tomorrow rather than later today.
        setStartingPoint.mutate({ userChallengeId: challengeId });
        setHandled(true);
      }}
    />
  );
}
