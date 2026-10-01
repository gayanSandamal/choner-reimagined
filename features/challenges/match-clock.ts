// The 24 hour clock on a match offer.
//
// One clock, started when the match was created, and both people read the
// same instant (partner_matches.expires_at), so the two screens can never show
// different numbers. This only turns that instant into words.

export type MatchClock =
  // No deadline to show: an older server, or a value that will not parse.
  | { state: 'none' }
  | { state: 'running'; label: string; msLeft: number }
  // Past the deadline. The sweep runs every 15 minutes, so the offer can still
  // be on screen for a while after it has run out; it must stop being offered.
  | { state: 'expired' };

export function matchClock(expiresAt: string | null | undefined, now: Date = new Date()): MatchClock {
  if (!expiresAt) return { state: 'none' };
  const end = new Date(expiresAt).getTime();
  if (Number.isNaN(end)) return { state: 'none' };
  const msLeft = end - now.getTime();
  if (msLeft <= 0) return { state: 'expired' };

  const totalMinutes = Math.floor(msLeft / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  let label: string;
  if (totalMinutes < 1) label = 'Less than a minute left';
  else if (hours < 1) label = `${minutes}m left`;
  else label = minutes ? `${hours}h ${minutes}m left` : `${hours}h left`;
  return { state: 'running', label, msLeft };
}

// What the offer screen is showing. Three real states, because one person can
// answer before the other.
export type OfferState = 'offered' | 'you_accepted' | 'expired';

export function offerState(
  match: { i_confirmed: boolean; expires_at?: string | null },
  now: Date = new Date()
): OfferState {
  if (matchClock(match.expires_at, now).state === 'expired') return 'expired';
  return match.i_confirmed ? 'you_accepted' : 'offered';
}

// The line under the clock. Never blames: an expired match is nobody's fault,
// and the other person is told the same thing.
export const MATCH_EXPIRED_TITLE = 'This match ran out of time.';
export const MATCH_EXPIRED_BODY = "It was open for 24 hours. You're both back in the search, and nothing else has changed.";
