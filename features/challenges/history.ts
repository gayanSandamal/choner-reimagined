// One finished challenge, as get_challenge_history() returns it.
export type ChallengeHistoryItem = {
  id: string;
  title: string | null;
  status: 'completed' | 'abandoned';
  ended_at: string | null;
  // Sessions both people completed, counting a miss that was made up.
  done: number;
  // The streak the person picked. Null for a challenge that ended before one
  // was picked, which is every challenge from the daily model.
  target: number | null;
};

// "Ended · 7 of 12 · September 2026". The score is what the streak ended ON,
// so it is shown for a challenge that was ended early as well as one that ran
// its course. With no target there was no streak, and no score is invented.
export function historyLine(item: Pick<ChallengeHistoryItem, 'done' | 'target' | 'ended_at'>, locale?: string): string {
  const parts = ['Ended'];
  if (item.target) parts.push(`${item.done} of ${item.target}`);
  if (item.ended_at) {
    const d = new Date(item.ended_at);
    if (!Number.isNaN(d.getTime())) {
      parts.push(d.toLocaleDateString(locale, { month: 'long', year: 'numeric' }));
    }
  }
  return parts.join(' · ');
}

// What the partner row of the commitment card says and offers, by state.
// Every state that is not "partnered" hands off to Find with a standard
// button whose label says what you will see there, never "Go to Find".
export type PartnerRow =
  | { kind: 'partnered'; line: string }
  | { kind: 'handoff'; line: string | null; button: string };

export function partnerRow(state: string, partnerFirstName: string | null | undefined): PartnerRow {
  switch (state) {
    case 'partnered':
      return { kind: 'partnered', line: `You + ${partnerFirstName || 'your partner'}` };
    case 'finding':
      return { kind: 'handoff', line: 'Partner: searching...', button: 'See your search' };
    case 'invited':
      return { kind: 'handoff', line: 'Partner: invited...', button: 'See your invite' };
    case 'matched':
      return { kind: 'handoff', line: 'A match is waiting...', button: 'See your match' };
    default:
      // No "Partner: not found yet" row. The button already says it.
      return { kind: 'handoff', line: null, button: 'Find a match' };
  }
}
