import type { Streak } from '@/features/plans/types';

// The three numbers on Profile. All three are counted in SESSIONS and
// CHALLENGES, never days, and all three are real: with nothing to count the
// tile shows a zero, never an invented figure.
export type ProfileStat = { value: string; label: string };

export function profileStats(input: {
  // The current challenge's streak, or nothing with no challenge.
  streak: Pick<Streak, 'done' | 'target'> | null | undefined;
  // From the partnership, which outlives a challenge.
  partnerName: string | null | undefined;
  sessionsTogether: number | null | undefined;
  // Challenges that have ended, however they ended.
  finished: number | null | undefined;
}): [ProfileStat, ProfileStat, ProfileStat] {
  const done = input.streak?.done ?? 0;
  const target = input.streak?.target ?? null;
  const together = input.partnerName ? input.sessionsTogether ?? 0 : 0;
  const finished = input.finished ?? 0;

  return [
    target
      ? { value: `${done} of ${target}`, label: 'your streak' }
      : { value: `${done}`, label: done === 1 ? 'session done' : 'sessions done' },
    {
      value: `${together}`,
      label: input.partnerName ? `with ${input.partnerName}` : 'with a partner'
    },
    { value: `${finished}`, label: finished === 1 ? 'challenge finished' : 'challenges finished' }
  ];
}
