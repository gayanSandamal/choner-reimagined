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

export type Mode = 'together' | 'separate';
export type AgeBand = '18-24' | '25-34' | '35-44' | '45-54' | '55+';
export type Gender = 'male' | 'female' | 'prefer_not_to_say';
export type ExperienceLevel = 'new' | 'some' | 'experienced';
export type Pace = 'slow' | 'moderate' | 'fast';
export type SkillLevel = 'beginner' | 'casual' | 'intermediate' | 'advanced';

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

  // ---- v2 ----
  // Which of the 6 activities. Null for a habit with no activity (Journaling,
  // No caffeine) — those are solo-only and never reach the pool.
  activityKey?: string | null;
  mode?: Mode;
  daysPerWeek?: number;
  // Null capability = beginner. Deliberately never guessed: see
  // Choner_Activity_Input_Fields_Spec_Final.md §4.
  capabilityValue?: number | null;
  commitmentValue?: number | null;
  ageBand?: AgeBand | null;
  gender?: Gender | null;
  // "Same gender only" is an absolute filter, never traded off against a
  // strong score elsewhere.
  sameGenderOnly?: boolean;
  isMinor?: boolean;
  experience?: ExperienceLevel | null;
  // Corridor tags for preferred_location, from location_tags.
  locationTags?: string[];
  timeOfDay?: string | null;
  specificDays?: string[];
  pace?: Pace | null;
  skillLevel?: SkillLevel | null;
  // Access gates. Blocking is asymmetric for court/session: one person having
  // access is enough, because they can bring the other.
  gymAccess?: string | null;
  bikeAccess?: string | null;
  courtAccess?: string | null;
  sameGym?: boolean | null;
  specificExercise?: string | null;
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
  // The habit both requests are for. A user can wait on several challenges at
  // once, so the user id alone doesn't say WHICH request this pair belongs to.
  challengeTemplateId: string;
}

// ---------------------------------------------------------------------------
// Tunable weights — keep all magic numbers in one place
// ---------------------------------------------------------------------------

// v2 weights (Choner_Matching_Algorithm_v2_Scoring.md §5). These are NOT a
// fixed-100 budget any more: only the rules that apply to a given pairing
// count toward max_possible, so a `separate` home-workout match and a
// `together` running match produce comparable scores despite having different
// rules available.
export const WEIGHTS = {
  commitmentAsymmetry: 30,
  stretchRatio: 20,
  // Attendance doesn't scale the way reps do, so the ratio means less for
  // meet-in-person activities.
  stretchRatioTogether: 8,
  styleCompatibility: 15,
  ageProximity: 12,
  experienceLevel: 10,
  locationProximity: 25,
  timeOfDay: 15,
  specificDays: 10,
  paceMatch: 15,
  skillLevel: 20,
  bothLowCommitment: -40, // penalty: the known failure case
  waitingFairness: 10 // don't leave people in the pool forever
};

/** Max timezone gap we'll tolerate before scoring drops to zero (in minutes). */
export const MAX_TZ_GAP_MINUTES = 5 * 60;

/** After this long in the pool, a user starts getting a fairness boost. */
export const FAIRNESS_THRESHOLD_MS = 48 * 60 * 60 * 1000;

/**
 * Below this, a pairing isn't made at all — see matchPool().
 *
 * Raised from v1's 45: v2 has far more hard filters, so pairs that reach
 * scoring are already better qualified and the bar should rise with them.
 * Still a product decision, not a measurement — no match beats a bad match,
 * because a failed first pairing loses the user and an honest short wait
 * doesn't.
 */
export const DEFAULT_MIN_SCORE = 50;

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

  // ---- v2 hard filters ----

  // Home workouts: the specific exercise has to match, not just the activity.
  if (a.specificExercise && b.specificExercise && a.specificExercise !== b.specificExercise) {
    return 'different exercise';
  }

  // Doing it together vs separately is structural, not a preference.
  if (a.mode && b.mode && a.mode !== b.mode) return 'different mode';

  if (a.daysPerWeek && b.daysPerWeek && a.daysPerWeek !== b.daysPerWeek) {
    return 'different cadence';
  }

  // Absolute, and never traded off against a strong score elsewhere.
  if (a.sameGenderOnly && a.gender && b.gender && a.gender !== b.gender) {
    return 'gender preference';
  }
  if (b.sameGenderOnly && a.gender && b.gender && a.gender !== b.gender) {
    return 'gender preference';
  }

  // Never pair a minor with an adult. This one is a safety rule, so it is
  // checked on the raw flag rather than inferred from an age band.
  if (Boolean(a.isMinor) !== Boolean(b.isMinor)) return 'minor with adult';

  // Access gates. Gym and bike block on EITHER side having none — you can't
  // lend someone a gym membership. Court blocks only when NEITHER has access,
  // because one person with a court can bring the other.
  if (a.gymAccess === 'not_yet' || b.gymAccess === 'not_yet') return 'no gym access';
  if (a.bikeAccess === 'none_yet' || b.bikeAccess === 'none_yet') return 'no bike access';
  if (
    a.courtAccess === 'need_partner_to_arrange' &&
    b.courtAccess === 'need_partner_to_arrange'
  ) {
    return 'no court access';
  }

  const inPerson = a.mode === 'together' && b.mode === 'together';
  if (inPerson) {
    // Two people meeting at different gyms isn't meeting.
    if (a.sameGym === false || b.sameGym === false) return 'different gyms';

    // No shared corridor tag — the tag-based replacement for the old
    // same-zone/adjacent-zone bands.
    if (locationProximity(a, b) === 0) return 'no shared location corridor';

    // Meeting up means actually being there at the same time.
    if (a.timeOfDay && b.timeOfDay && a.timeOfDay !== b.timeOfDay) return 'different time of day';
    if (dayOverlap(a, b) === 0 && (a.specificDays?.length || b.specificDays?.length)) {
      return 'no overlapping days';
    }
  }

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

// Total by construction: profiles.accountability_mode defaults to 'solo' and
// get_match_pool only guards NULL, so a non-tone value really does reach here.
// Indexing STYLE_FIT['solo'] used to be `undefined`, and STYLE_FIT[a][b] then
// threw a TypeError that aborted the whole matching run for every user.
function styleFit(a: AccountabilityStyle, b: AccountabilityStyle): number {
  return STYLE_FIT[a]?.[b] ?? 0.5;
}

function scoreStyle(
  a: AccountabilityStyle,
  b: AccountabilityStyle,
  reasons: string[]
): number {
  const fit = styleFit(a, b);
  if (fit <= 0.3) reasons.push(`style clash (${a} vs ${b})`);
  else if (fit >= 0.9) reasons.push(`styles fit well (${a} / ${b})`);
  return WEIGHTS.styleCompatibility * fit;
}

// ---- v2 soft rules ----

const AGE_ORDER: AgeBand[] = ['18-24', '25-34', '35-44', '45-54', '55+'];

// Deliberately permissive: a 33- and a 37-year-old land in different bands but
// are a perfectly good pairing, and over-restricting age shrinks an already
// small early pool.
function scoreAge(a: Candidate, b: Candidate, reasons: string[]): number | null {
  if (!a.ageBand || !b.ageBand) return null;
  const distance = Math.abs(AGE_ORDER.indexOf(a.ageBand) - AGE_ORDER.indexOf(b.ageBand));
  const factor = distance === 0 ? 1 : distance === 1 ? 0.75 : distance === 2 ? 0.4 : 0.15;
  if (distance === 0) reasons.push('same age band');
  else if (distance >= 3) reasons.push('very different age bands');
  return WEIGHTS.ageProximity * factor;
}

// stretch_ratio = commitment ÷ capability. Prefers MILD ASYMMETRY over
// similarity, mirroring the commitment rule: two people both at 95% fail on
// the same day, two both at 40% quietly stop together.
function stretchBand(c: Candidate): 'stretching' | 'healthy' | 'coasting' | null {
  if (c.capabilityValue == null || !c.commitmentValue) return null;
  const ratio = c.commitmentValue / c.capabilityValue;
  if (ratio > 0.9) return 'stretching';
  if (ratio >= 0.6) return 'healthy';
  return 'coasting';
}

function scoreStretch(a: Candidate, b: Candidate, inPerson: boolean, reasons: string[]): number | null {
  const weight = inPerson ? WEIGHTS.stretchRatioTogether : WEIGHTS.stretchRatio;
  const aBand = stretchBand(a);
  const bBand = stretchBand(b);

  // A null capability is a beginner, not missing data — never compute a ratio
  // from it.
  if (aBand === null || bBand === null) {
    if (aBand === null && bBand === null) {
      reasons.push('two beginners — higher risk');
      return weight * 0.35;
    }
    reasons.push('beginner paired with someone experienced');
    return weight * 0.7;
  }

  const pair = [aBand, bBand].sort().join('+');
  const table: Record<string, number> = {
    'stretching+stretching': 0.3,
    'coasting+coasting': 0.4,
    'healthy+healthy': 0.8,
    'healthy+stretching': 1.0,
    'coasting+healthy': 0.85,
    'coasting+stretching': 0.55
  };
  const factor = table[pair] ?? 0.5;
  if (factor >= 1) reasons.push('one anchoring, one stretching — ideal');
  else if (factor <= 0.4) reasons.push(`both ${aBand} — risky`);
  return weight * factor;
}

const EXPERIENCE_ORDER: ExperienceLevel[] = ['new', 'some', 'experienced'];

// One level apart scores HIGHER than identical, for the same reason as the
// commitment rule — a slight gap gives one person something to anchor.
function scoreExperience(a: Candidate, b: Candidate, reasons: string[]): number | null {
  if (!a.experience || !b.experience) return null;
  const distance = Math.abs(
    EXPERIENCE_ORDER.indexOf(a.experience) - EXPERIENCE_ORDER.indexOf(b.experience)
  );
  const factor = distance === 0 ? 0.9 : distance === 1 ? 1.0 : 0.45;
  if (distance === 2) reasons.push('new paired with experienced — intimidation risk');
  return WEIGHTS.experienceLevel * factor;
}

// Shared corridor tags over combined tags — mirrors the SQL
// location_proximity(), so client and server agree on one definition.
function locationProximity(a: Candidate, b: Candidate): number {
  const at = a.locationTags ?? [];
  const bt = b.locationTags ?? [];
  if (!at.length || !bt.length) return 0;
  const shared = at.filter((t) => bt.includes(t)).length;
  const combined = new Set([...at, ...bt]).size;
  return combined === 0 ? 0 : shared / combined;
}

function scoreLocation(a: Candidate, b: Candidate, reasons: string[]): number {
  const proximity = locationProximity(a, b);
  if (proximity >= 1) reasons.push('same area');
  else if (proximity > 0) reasons.push('nearby areas');
  return WEIGHTS.locationProximity * proximity;
}

const SLOT_ORDER = ['early_morning', 'morning', 'afternoon', 'evening', 'night'];

function scoreTimeOfDay(a: Candidate, b: Candidate, inPerson: boolean, reasons: string[]): number | null {
  if (!a.timeOfDay || !b.timeOfDay) return null;
  // Already forced equal by the hard filter when meeting in person.
  if (inPerson) return WEIGHTS.timeOfDay;

  const distance = Math.abs(SLOT_ORDER.indexOf(a.timeOfDay) - SLOT_ORDER.indexOf(b.timeOfDay));
  const factor = distance === 0 ? 1 : distance === 1 ? 0.7 : distance === 2 ? 0.4 : 0.2;
  if (distance === 0) reasons.push('same time of day');
  return WEIGHTS.timeOfDay * factor;
}

function dayOverlap(a: Candidate, b: Candidate): number {
  const ad = a.specificDays ?? [];
  const bd = b.specificDays ?? [];
  return ad.filter((d) => bd.includes(d)).length;
}

function scoreDays(a: Candidate, b: Candidate, inPerson: boolean, reasons: string[]): number | null {
  if (!a.specificDays?.length || !b.specificDays?.length) return null;
  const required = a.daysPerWeek ?? a.specificDays.length ?? 1;
  const raw = Math.min(dayOverlap(a, b) / Math.max(required, 1), 1);
  // Separate-mode partners don't strictly need the same days, so a total
  // mismatch still scores something rather than dragging the pair down.
  const factor = inPerson ? raw : Math.max(raw, 0.3);
  if (raw >= 1) reasons.push('same days');
  return WEIGHTS.specificDays * factor;
}

const PACE_ORDER: Pace[] = ['slow', 'moderate', 'fast'];
const PACE_ACTIVITIES = ['running', 'cycling', 'walking'];

// Mismatched pace is one of the fastest ways to ruin a shared session —
// someone is always either waiting or struggling.
function scorePace(a: Candidate, b: Candidate, inPerson: boolean, reasons: string[]): number | null {
  if (!inPerson || !a.pace || !b.pace) return null;
  if (!PACE_ACTIVITIES.includes(a.activityKey ?? '')) return null;
  const distance = Math.abs(PACE_ORDER.indexOf(a.pace) - PACE_ORDER.indexOf(b.pace));
  const factor = distance === 0 ? 1 : distance === 1 ? 0.45 : 0.1;
  if (distance === 2) reasons.push('pace mismatch — hard to run together');
  return WEIGHTS.paceMatch * factor;
}

const SKILL_ORDER: SkillLevel[] = ['beginner', 'casual', 'intermediate', 'advanced'];

// Badminton only, and weighted high: it's 1v1, so a large skill gap makes the
// game unenjoyable for both people.
function scoreSkill(a: Candidate, b: Candidate, reasons: string[]): number | null {
  if (a.activityKey !== 'badminton' || !a.skillLevel || !b.skillLevel) return null;
  const distance = Math.abs(
    SKILL_ORDER.indexOf(a.skillLevel) - SKILL_ORDER.indexOf(b.skillLevel)
  );
  const factor = distance === 0 ? 1 : distance === 1 ? 0.55 : distance === 2 ? 0.15 : 0;
  if (distance >= 2) reasons.push('large skill gap');
  return WEIGHTS.skillLevel * factor;
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
    return {
      a: a.userId,
      b: b.userId,
      challengeTemplateId: a.challengeTemplateId,
      score: 0,
      aSignal,
      bSignal,
      reasons: [],
      blocked
    };
  }

  const reasons: string[] = [];
  const inPerson = a.mode === 'together' && b.mode === 'together';

  let raw = 0;
  let maxPossible = 0;

  // Only rules that actually APPLY to this pairing count toward max_possible.
  // That's the whole point of v2's normalization: a `separate` home-workout
  // match has no location or pace rule, and under v1's fixed-100 budget it
  // could never score as well as a `together` running match even when it was
  // the better pairing.
  const apply = (points: number | null, weight: number) => {
    if (points === null) return;
    raw += points;
    maxPossible += weight;
  };

  // Commitment asymmetry is special: the "both low" case is a PENALTY applied
  // to raw before normalization, not a zero-scoring rule.
  const commitment = scoreCommitment(aSignal, bSignal, reasons);
  raw += commitment;
  maxPossible += WEIGHTS.commitmentAsymmetry;

  apply(scoreStyle(a.style, b.style, reasons), WEIGHTS.styleCompatibility);
  apply(scoreAge(a, b, reasons), WEIGHTS.ageProximity);
  apply(
    scoreStretch(a, b, inPerson, reasons),
    inPerson ? WEIGHTS.stretchRatioTogether : WEIGHTS.stretchRatio
  );
  apply(scoreExperience(a, b, reasons), WEIGHTS.experienceLevel);
  // Location genuinely doesn't matter when each does their own session, so it
  // is excluded from max_possible entirely rather than scoring zero.
  if (inPerson) apply(scoreLocation(a, b, reasons), WEIGHTS.locationProximity);
  apply(scoreTimeOfDay(a, b, inPerson, reasons), WEIGHTS.timeOfDay);
  apply(scoreDays(a, b, inPerson, reasons), WEIGHTS.specificDays);
  apply(scorePace(a, b, inPerson, reasons), WEIGHTS.paceMatch);
  apply(scoreSkill(a, b, reasons), WEIGHTS.skillLevel);

  const normalized = maxPossible > 0 ? (raw / maxPossible) * 100 : 0;

  // Fairness is added AFTER normalization, so it can push a borderline pair
  // over the threshold rather than being diluted by it.
  const fairness = scoreFairness(a, b, now, reasons);

  const score = Math.max(0, Math.min(100, Math.round(normalized + fairness)));

  return {
    a: a.userId,
    b: b.userId,
    challengeTemplateId: a.challengeTemplateId,
    score,
    aSignal,
    bSignal,
    reasons
  };
}

// ---------------------------------------------------------------------------
// Matching the whole pool
// ---------------------------------------------------------------------------

export function requestKey(userId: string, challengeTemplateId: string): string {
  return `${userId}|${challengeTemplateId}`;
}

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
  // Keyed by user AND habit: someone waiting on two challenges is two
  // requests, and keying by user alone silently dropped one of them.
  const byKey = new Map(candidates.map((c) => [requestKey(c.userId, c.challengeTemplateId), c]));
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
    const a = byKey.get(requestKey(pair.a, pair.challengeTemplateId));
    const b = byKey.get(requestKey(pair.b, pair.challengeTemplateId));
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

  // One partner per REQUEST, not per person: pairing someone for running must
  // not stop their separate gym request being paired in the same run.
  for (const pair of scored) {
    const ka = requestKey(pair.a, pair.challengeTemplateId);
    const kb = requestKey(pair.b, pair.challengeTemplateId);
    if (taken.has(ka) || taken.has(kb)) continue;
    pairs.push(pair);
    taken.add(ka);
    taken.add(kb);
  }

  const unmatched = [
    ...new Set(
      candidates
        .filter((c) => !taken.has(requestKey(c.userId, c.challengeTemplateId)))
        .map((c) => c.userId)
    )
  ];

  return { pairs, unmatched };
}
