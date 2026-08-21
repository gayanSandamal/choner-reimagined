// Partner matching, v1 — rule-based, no ML.
//
// Adapted from Dinesh Doluweera's v1 spike (Aug 2026) onto the shapes this
// app actually stores: the "Why" reflection rows, the onboarding tone, and
// IANA time zones. Every rule here is one we decided deliberately and can
// explain to a user; ML comes later, once we have outcome data on which
// pairings actually worked.
//
// The core finding from the first 9 concierge pairs: a pairing worked when
// ONE person was clearly more committed and pulled the other along. Two
// low-commitment people together is the failure case. So this scores for
// *productive asymmetry*, not similarity.
//
// Hard rules filter (must-haves). Soft rules score (nice-to-haves).
//
// Nothing here auto-matches. Pairing is still concierge-run (the pool is
// readable only server-side), and this module exists to rank the options and
// explain each score to whoever makes the call.

import type { ToneValue } from '@/features/onboarding/constants';
// Explicit .ts extension, and a relative path in reflections.ts rather than the
// @/ alias, so this module resolves under Deno as well as Metro. The
// partner-match edge function imports it directly -- running the same tested
// scoring server-side rather than a second copy of it in SQL, which is the one
// thing PARTNER_MATCHING.md warns against.
import { REFLECTION_QUESTIONS, ReflectionAnswer, isAnswered } from './reflections.ts';

// The four onboarding tones, used here as accountability styles.
export type AccountabilityStyle = ToneValue;

export interface Candidate {
  userId: string;
  // partner_match_requests.challenge_template_id — both must be doing the
  // same habit.
  challengeTemplateId: string;
  // user_challenges.custom_habit_title is set. Custom habits can't be
  // matched: nobody else picked "30 sit-ups".
  isCustomHabit: boolean;
  // challenge_templates.duration_days
  durationDays: number;
  style: AccountabilityStyle;
  // challenge_reflections rows for this user's challenge.
  reflections: ReflectionAnswer[];
  // IANA zone, e.g. 'Asia/Colombo'. Null when we never captured one.
  timezone: string | null;
  city?: string | null;
  // partner_match_requests.created_at as epoch ms — used for fairness.
  joinedPoolAt: number;
  // People they've already been paired with where it didn't work out.
  previouslyUnmatchedWith?: string[];
}

export interface MatchScore {
  a: string;
  b: string;
  score: number; // 0–100
  // Both commitment signals, kept on the result so a made match can be
  // logged with the inputs that produced it — that log is the training set
  // for anything smarter later.
  aSignal: number;
  bSignal: number;
  reasons: string[]; // human-readable, for the concierge review
  blocked?: string; // set if a hard rule rejected the pair
}

// ---------------------------------------------------------------------------
// Tunable weights — keep all magic numbers in one place
// ---------------------------------------------------------------------------

export const WEIGHTS = {
  commitmentAsymmetry: 35, // the big one — our core hypothesis
  bothLowCommitment: -40, // penalty: the known failure case
  styleCompatibility: 20,
  timezoneProximity: 25,
  sameCity: 10,
  waitingFairness: 10 // don't leave people in the pool forever
};

/** Max timezone gap we'll tolerate before scoring drops to zero (in minutes). */
export const MAX_TZ_GAP_MINUTES = 5 * 60;

/** After this long in the pool, a user starts getting a fairness boost. */
export const FAIRNESS_THRESHOLD_MS = 48 * 60 * 60 * 1000;

/** Below this, a pairing isn't made at all — see matchPool(). */
export const DEFAULT_MIN_SCORE = 45;

// ---------------------------------------------------------------------------
// Time zones
//
// Profiles store an IANA zone, not an offset, because the missed-day sweep
// needs the zone's rules. Matching only cares whether two people's days
// overlap, so we resolve the zone to an offset at a given instant — which
// also means a DST change is reflected the moment it happens.
// ---------------------------------------------------------------------------

// Building an Intl.DateTimeFormat is by far the most expensive thing in this
// module, and scoring a pool calls this twice per pair -- a 500-person pool
// meant a quarter of a million constructions, which is what put the edge
// function over its CPU limit. A zone's offset is fixed for a given instant, so
// one computation per (zone, instant) is all that is ever needed; matchPool
// passes a single `now` through a whole run, making this a handful of entries.
const offsetCache = new Map<string, number | null>();

export function offsetMinutesFor(
  timezone: string | null | undefined,
  at: number = Date.now()
): number | null {
  if (!timezone) return null;

  const key = `${timezone}@${at}`;
  const cached = offsetCache.get(key);
  if (cached !== undefined) return cached;

  const value = computeOffsetMinutes(timezone, at);

  // Bounded so a long-lived process cannot grow this without limit. The cache
  // is a within-run optimisation, not a durable store, so dropping it wholesale
  // is fine.
  if (offsetCache.size > 500) offsetCache.clear();
  offsetCache.set(key, value);
  return value;
}

function computeOffsetMinutes(timezone: string, at: number): number | null {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).formatToParts(new Date(at));

    const read = (type: Intl.DateTimeFormatPartTypes) =>
      Number(parts.find((p) => p.type === type)?.value);

    const y = read('year');
    const mo = read('month');
    const d = read('day');
    const h = read('hour');
    const mi = read('minute');
    const s = read('second');
    if ([y, mo, d, h, mi, s].some((n) => Number.isNaN(n))) return null;

    // What the wall clock in that zone reads, expressed as if it were UTC,
    // minus the actual instant, is the offset.
    const asIfUtc = Date.UTC(y, mo - 1, d, h % 24, mi, s);
    return Math.round((asIfUtc - new Date(at).setMilliseconds(0)) / 60000);
  } catch {
    // Unknown zone, or an engine without full time zone data. Treated as
    // "we don't know" everywhere below, never as UTC.
    return null;
  }
}

/** Minutes between two candidates' clocks, or null if either zone is unknown. */
function timezoneGap(a: Candidate, b: Candidate, now: number): number | null {
  const aOffset = offsetMinutesFor(a.timezone, now);
  const bOffset = offsetMinutesFor(b.timezone, now);
  if (aOffset === null || bOffset === null) return null;
  return Math.abs(aOffset - bOffset);
}

// ---------------------------------------------------------------------------
// Commitment signal
// ---------------------------------------------------------------------------

const QUESTION_COUNT = REFLECTION_QUESTIONS.length;

/**
 * Infers how committed someone is from their Why reflection.
 *
 * We are NOT asking them to rate themselves — self-ratings are unreliable and
 * gameable. Instead we read effort: did they write their own words, how much
 * did they say, and did they answer at all.
 *
 * Note on the length signal: only the user's own text counts. A tapped chip
 * carries canned copy of our choosing, so measuring its length would score
 * our writing, not their effort.
 *
 * Returns 0–100.
 */
export function commitmentSignal(reflections: ReflectionAnswer[]): number {
  const answers = REFLECTION_QUESTIONS.map((q) =>
    reflections.find((r) => r.question_key === q.key)
  ).filter((a): a is ReflectionAnswer => isAnswered(a));

  const ownWords = answers
    .map((a) => a.custom_text?.trim() ?? '')
    .filter((text) => text.length > 0);

  // 1. Did they bother to write their own words? (0–40)
  const customScore = (ownWords.length / QUESTION_COUNT) * 40;

  // 2. How much did they actually say? (0–35)
  const totalLength = ownWords.join(' ').length;
  const lengthScore = Math.min(totalLength / 200, 1) * 35;

  // 3. Did they answer everything at all? (0–25)
  const completenessScore = (answers.length / QUESTION_COUNT) * 25;

  return Math.round(customScore + lengthScore + completenessScore);
}

// ---------------------------------------------------------------------------
// Hard rules — these reject a pairing outright
// ---------------------------------------------------------------------------

function hardBlock(a: Candidate, b: Candidate, now: number): string | null {
  if (a.userId === b.userId) return 'same user';

  // Both must be doing the same habit. This is the whole mechanic — a shared
  // streak only means something if the commitment is identical.
  if (a.challengeTemplateId !== b.challengeTemplateId) return 'different habit';

  if (a.isCustomHabit || b.isCustomHabit) return 'custom habit';

  if (a.durationDays !== b.durationDays) return 'different duration';

  // Don't re-pair people who already didn't work out.
  if (a.previouslyUnmatchedWith?.includes(b.userId)) return 'previously unmatched';
  if (b.previouslyUnmatchedWith?.includes(a.userId)) return 'previously unmatched';

  // Timezone gap too wide — daily check-ins stop overlapping meaningfully.
  // An unknown zone doesn't block: it costs the pair the proximity points
  // instead, which is the honest way to say "we can't tell".
  const gap = timezoneGap(a, b, now);
  if (gap !== null && gap > MAX_TZ_GAP_MINUTES) return 'timezone gap too wide';

  return null;
}

// ---------------------------------------------------------------------------
// Soft rules — these produce the score
// ---------------------------------------------------------------------------

/**
 * Our core hypothesis, encoded.
 *
 * Best case:  one clearly stronger, one softer → the stronger one pulls.
 * Okay case:  both strong → they'll probably manage anyway.
 * Worst case: both weak → nobody pulls. This is the failure mode.
 */
function scoreCommitment(aSignal: number, bSignal: number, reasons: string[]): number {
  const higher = Math.max(aSignal, bSignal);
  const lower = Math.min(aSignal, bSignal);
  const gap = higher - lower;

  // The failure case, penalised hard.
  if (higher < 40) {
    reasons.push('both low commitment signal — high dropout risk');
    return WEIGHTS.bothLowCommitment;
  }

  // At least one anchor present. Now reward a useful gap. The sweet spot is
  // roughly 15–55 points: enough asymmetry that one person clearly leads, not
  // so extreme that it becomes unpaid coaching.
  //
  // Note: two strong partners score LOWER than a healthy asymmetric pair.
  // That's deliberate. Two highly-committed people will likely succeed with
  // or without us — pairing them wastes two anchors on each other when each
  // could have carried someone who needed it.
  let asymmetryFit: number;
  if (gap >= 15 && gap <= 55) {
    asymmetryFit = 1;
    reasons.push('healthy commitment gap — one partner can anchor the other');
  } else if (gap < 15) {
    asymmetryFit = 0.55;
    reasons.push('similar commitment levels — no clear anchor');
  } else {
    // gap > 55 — real risk the stronger partner ends up doing all the work
    asymmetryFit = 0.4;
    reasons.push('very large commitment gap — watch for one-sided effort');
  }

  return Math.round(WEIGHTS.commitmentAsymmetry * asymmetryFit);
}

/**
 * Accountability style compatibility. Not about being identical — about not
 * clashing. Someone who picked "I need warmth, not pressure" paired with
 * someone who wants rivalry is a bad fit.
 */
const STYLE_FIT: Record<AccountabilityStyle, Record<AccountabilityStyle, number>> = {
  competitive: { competitive: 1.0, momentum: 0.8, encouraging: 0.3, team: 0.6 },
  momentum: { competitive: 0.8, momentum: 1.0, encouraging: 0.7, team: 0.8 },
  encouraging: { competitive: 0.3, momentum: 0.7, encouraging: 1.0, team: 0.9 },
  team: { competitive: 0.6, momentum: 0.8, encouraging: 0.9, team: 1.0 }
};

function scoreStyle(
  a: AccountabilityStyle,
  b: AccountabilityStyle,
  reasons: string[]
): number {
  const fit = STYLE_FIT[a][b];
  if (fit <= 0.3) reasons.push(`style clash (${a} vs ${b})`);
  else if (fit >= 0.9) reasons.push(`styles fit well (${a} / ${b})`);
  return Math.round(WEIGHTS.styleCompatibility * fit);
}

function scoreTimezone(a: Candidate, b: Candidate, now: number, reasons: string[]): number {
  const gap = timezoneGap(a, b, now);
  if (gap === null) {
    reasons.push('timezone unknown — no overlap guarantee');
    return 0;
  }
  if (gap === 0) reasons.push('same timezone');
  else if (gap <= 90) reasons.push('close timezones');

  const closeness = 1 - gap / MAX_TZ_GAP_MINUTES; // 1 = identical, 0 = at the limit
  return Math.round(WEIGHTS.timezoneProximity * Math.max(closeness, 0));
}

function scoreCity(a: Candidate, b: Candidate, reasons: string[]): number {
  if (a.city && b.city && a.city === b.city) {
    reasons.push(`both in ${a.city}`);
    return WEIGHTS.sameCity;
  }
  return 0;
}

/**
 * Fairness: if someone has been sitting in the pool a long time, nudge their
 * matches up so they aren't permanently passed over by "better" pairings.
 */
function scoreFairness(a: Candidate, b: Candidate, now: number, reasons: string[]): number {
  const longestWait = longestWaitMs(a, b, now);
  if (longestWait < FAIRNESS_THRESHOLD_MS) return 0;
  const overdueRatio = Math.min(longestWait / (FAIRNESS_THRESHOLD_MS * 3), 1);
  reasons.push('waiting a while — prioritised');
  return Math.round(WEIGHTS.waitingFairness * overdueRatio);
}

function longestWaitMs(a: Candidate, b: Candidate, now: number): number {
  return Math.max(now - a.joinedPoolAt, now - b.joinedPoolAt, 0);
}

// ---------------------------------------------------------------------------
// Scoring a single pair
// ---------------------------------------------------------------------------

export function scorePair(a: Candidate, b: Candidate, now: number = Date.now()): MatchScore {
  const aSignal = commitmentSignal(a.reflections);
  const bSignal = commitmentSignal(b.reflections);

  const blocked = hardBlock(a, b, now);
  if (blocked) {
    return { a: a.userId, b: b.userId, score: 0, aSignal, bSignal, reasons: [], blocked };
  }

  const reasons: string[] = [];
  let score = 0;
  score += scoreCommitment(aSignal, bSignal, reasons);
  score += scoreStyle(a.style, b.style, reasons);
  score += scoreTimezone(a, b, now, reasons);
  score += scoreCity(a, b, reasons);
  score += scoreFairness(a, b, now, reasons);

  // Clamp to 0–100
  score = Math.max(0, Math.min(100, score));

  return { a: a.userId, b: b.userId, score, aSignal, bSignal, reasons };
}

// ---------------------------------------------------------------------------
// Matching the whole pool
// ---------------------------------------------------------------------------

export interface MatchResult {
  pairs: MatchScore[];
  unmatched: string[];
}

/**
 * Greedy matching: score every valid pair, sort by score, take the best
 * available pairs in order.
 *
 * Greedy is not mathematically optimal — a maximum-weight matching algorithm
 * would do slightly better — but it's simple, fast, easy to explain to
 * whoever is reviewing the pairings, and at our pool size the difference is
 * negligible. Worth revisiting if the pool ever gets large.
 *
 * Ties are broken by who has waited longest, then by user id, so the same
 * pool always produces the same pairings no matter what order the rows came
 * back in — two people reviewing the pool should never see different answers.
 *
 * @param minScore Pairings below this are not made at all. Better to keep
 *                 someone waiting than to give them a bad partner — a failed
 *                 first pairing costs more retention than a short wait.
 */
export function matchPool(
  candidates: Candidate[],
  minScore: number = DEFAULT_MIN_SCORE,
  now: number = Date.now()
): MatchResult {
  const byId = new Map(candidates.map((c) => [c.userId, c]));
  const scored: MatchScore[] = [];

  // Bucket by habit before pairing. hardBlock rejects two people on different
  // templates outright, so every cross-template pair is wasted work -- and
  // there are a lot of them: comparing the whole pool is O(n^2), which for 500
  // people across 15 habits is ~122k scorePair calls to keep ~8k of them.
  // Bucketing is the same answer for a fifteenth of the cost.
  const byTemplate = new Map<string, Candidate[]>();
  for (const c of candidates) {
    const group = byTemplate.get(c.challengeTemplateId);
    if (group) group.push(c);
    else byTemplate.set(c.challengeTemplateId, [c]);
  }

  for (const group of byTemplate.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const result = scorePair(group[i], group[j], now);
        if (!result.blocked && result.score >= minScore) scored.push(result);
      }
    }
  }

  const waitOf = (pair: MatchScore) => {
    const a = byId.get(pair.a);
    const b = byId.get(pair.b);
    return a && b ? longestWaitMs(a, b, now) : 0;
  };

  scored.sort(
    (x, y) =>
      y.score - x.score ||
      waitOf(y) - waitOf(x) ||
      x.a.localeCompare(y.a) ||
      x.b.localeCompare(y.b)
  );

  const taken = new Set<string>();
  const pairs: MatchScore[] = [];

  for (const pair of scored) {
    if (taken.has(pair.a) || taken.has(pair.b)) continue;
    pairs.push(pair);
    taken.add(pair.a);
    taken.add(pair.b);
  }

  const unmatched = candidates.map((c) => c.userId).filter((id) => !taken.has(id));

  return { pairs, unmatched };
}
