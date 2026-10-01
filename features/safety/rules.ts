// Report & Block — the rules that have to hold whichever screen they are
// reached from. Kept free of React and Supabase so they can be tested against
// the migration that enforces the same rules server-side.

export type ReportCategory =
  | 'didnt_show_up'
  | 'made_me_uncomfortable'
  | 'inappropriate_behavior'
  | 'safety_concern'
  | 'fake_profile'
  | 'something_else';

// In the order shown. Plain names only: an earlier draft put a one-line
// description under each, and the decision was to keep the list simple. There
// is no warning styling either — at founder-review volume every row gets read
// regardless of which category it is.
export const REPORT_CATEGORIES: ReadonlyArray<{ value: ReportCategory; label: string }> = [
  { value: 'didnt_show_up', label: "Didn't show up" },
  { value: 'made_me_uncomfortable', label: 'Made me uncomfortable' },
  { value: 'inappropriate_behavior', label: 'Inappropriate behavior or messages' },
  { value: 'safety_concern', label: 'Safety concern at a meetup' },
  { value: 'fake_profile', label: 'Fake profile' },
  { value: 'something_else', label: 'Something else' }
];

// Before a pair has met, the other four describe things that cannot be true
// yet — nobody can have failed to show up to a session that hasn't happened —
// and offering them is confusing rather than helpful.
export const PRE_MEETING_CATEGORIES: ReadonlyArray<ReportCategory> = [
  'fake_profile',
  'something_else'
];

export function reportCategoriesFor(met: boolean) {
  return met
    ? REPORT_CATEGORIES
    : REPORT_CATEGORIES.filter((c) => PRE_MEETING_CATEGORIES.includes(c.value));
}

// Who is looking at the ended screen decides the second line. The first line
// is the same for everyone, and nothing shown to the other person may say or
// imply that they were blocked or reported.
export type EndedRole = 'blocker' | 'reporter' | 'ender' | 'other';

export const MATCH_ENDED_TITLE = 'This match has ended.';

export function matchEndedLine(role: EndedRole): string {
  switch (role) {
    case 'blocker':
      return "You won't be matched with this person again. Your challenge continues, and you can look for a new partner anytime.";
    case 'reporter':
      return "Thanks for letting us know. We've ended this match and someone from our team will review it.";
    case 'ender':
      return 'Your challenge and your streak carry on. You can look for a new partner anytime.';
    default:
      return 'Your challenge continues. You can look for a new partner anytime.';
  }
}

export function blockConfirmCopy(partnerFirstName: string) {
  return {
    title: `Block ${partnerFirstName}?`,
    message: `This ends your match right away. ${partnerFirstName} won't be told you blocked them. They'll just see the match has ended.`
  };
}

// The server answers refusals as values, not exceptions. Both "no partner" and
// "match not found" mean the pairing ended before this tap landed — most often
// because the other person ended it first — so they read the same.
export type SafetyRefusal = 'no_partner' | 'match_not_found' | 'category_unavailable' | 'bad_reason';

export function safetyRefusalMessage(reason: SafetyRefusal): string {
  return reason === 'category_unavailable'
    ? "That option isn't available for this match. Pick another."
    : 'This match has already ended.';
}

// Ending a match, the neutral way. Six reasons, and they are NOT report
// categories: a report says what was wrong with a person, this says why a
// pairing did not work. "They stopped replying" here is not "Didn't show up"
// there: going quiet in the app is not a no-show at a physical meetup.
//
// The reason is PRIVATE. The other person is told only that the match ended.
export type EndMatchReason =
  | 'no_time_worked'
  | 'stopped_replying'
  | 'pace_mismatch'
  | 'changing_what_i_do'
  | 'something_felt_off'
  | 'prefer_not_to_say';

export const END_MATCH_REASONS: ReadonlyArray<{ value: EndMatchReason; label: string }> = [
  { value: 'no_time_worked', label: "We couldn't find a time that worked" },
  { value: 'stopped_replying', label: 'They stopped replying' },
  { value: 'pace_mismatch', label: "Our pace or level didn't match" },
  { value: 'changing_what_i_do', label: "I'm changing what I'm doing" },
  // A door, not an outcome. It sits IN the list on purpose: someone scanning
  // for the unsafe option who cannot find it picks "Prefer not to say"
  // instead. It ends the match like any other reason, and only then is the
  // report offered. Refusing it would mean someone who felt unsafe cannot
  // leave until they have filed a report.
  { value: 'something_felt_off', label: 'Something felt off' },
  // Must exist. Forcing a reason out of someone leaving because they felt
  // unsafe is how you stop them leaving.
  { value: 'prefer_not_to_say', label: 'Prefer not to say' }
];

// Only one reason opens the report flow afterwards.
export function offersReportAfter(reason: EndMatchReason): boolean {
  return reason === 'something_felt_off';
}

export function endMatchConfirmCopy(partnerFirstName: string) {
  return {
    title: `End your match with ${partnerFirstName}?`,
    message: `${partnerFirstName} will only be told that the match has ended, not why. Your challenge and your streak carry on.`
  };
}

// "3 weeks", "5 days", "today". How long a pair has been paired, for the
// matched card on Find.
export function pairedFor(sinceIso: string | null | undefined, now: Date = new Date()): string | null {
  if (!sinceIso) return null;
  const since = new Date(sinceIso);
  if (Number.isNaN(since.getTime())) return null;
  const days = Math.max(0, Math.floor((now.getTime() - since.getTime()) / 86_400_000));
  if (days === 0) return 'since today';
  if (days < 14) return `for ${days} ${days === 1 ? 'day' : 'days'}`;
  if (days < 60) return `for ${Math.floor(days / 7)} weeks`;
  return `for ${Math.floor(days / 30)} months`;
}
