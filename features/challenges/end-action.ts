import { useEndChallenge } from './hooks';
import { streakScore } from '@/features/plans/streak';
import type { Streak } from '@/features/plans/types';
import { confirmAction, notify } from '@/lib/alert';

// What the confirmation says before a challenge is ended: the score the streak
// ends on, where it goes, and that the partner stays. Pure, so the two places
// that offer "End this challenge" cannot drift apart.
export function endChallengeCopy(streak: Streak | null | undefined, partnerName: string | null | undefined) {
  const score = streak ? streakScore(streak) : null;
  return {
    title: 'End this challenge?',
    message: [
      score ? `Your streak ends here, at ${score}. It'll be saved to your history.` : "It'll be saved to your history.",
      partnerName ? `${partnerName} stays your partner.` : null
    ]
      .filter(Boolean)
      .join(' ')
  };
}

// Ending a challenge is destructive to the STREAK and to nothing else. It
// warns first, and it never ends the match.
export function useEndChallengeAction() {
  const endChallenge = useEndChallenge();

  const end = async (input: {
    challengeId: string | null | undefined;
    streak: Streak | null | undefined;
    partnerName: string | null | undefined;
  }): Promise<boolean> => {
    if (!input.challengeId) return false;
    const ok = await confirmAction({
      ...endChallengeCopy(input.streak, input.partnerName),
      confirmLabel: 'End challenge',
      cancelLabel: 'Keep going',
      destructive: true
    });
    if (!ok) return false;
    try {
      const res = await endChallenge.mutateAsync(input.challengeId);
      if (!res.ok && res.reason !== 'already_ended') {
        notify('Could not end that', 'Please try again.');
        return false;
      }
      return true;
    } catch (error: any) {
      notify('Could not end that', error.message);
      return false;
    }
  };

  return { end, pending: endChallenge.isPending };
}
