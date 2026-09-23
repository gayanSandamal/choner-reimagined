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
export type EndedRole = 'blocker' | 'reporter' | 'other';

export const MATCH_ENDED_TITLE = 'This match has ended.';

export function matchEndedLine(role: EndedRole): string {
  switch (role) {
    case 'blocker':
      return "You won't be matched with this person again. Your challenge continues, and you can look for a new partner anytime.";
    case 'reporter':
      return "Thanks for letting us know. We've ended this match and someone from our team will review it.";
    default:
      return 'Your challenge continues. You can look for a new partner anytime.';
  }
}

export function blockConfirmCopy(partnerFirstName: string) {
  return {
    title: `Block ${partnerFirstName}?`,
    message: `This ends your match right away. ${partnerFirstName} won't be told you blocked them — they'll just see the match has ended.`
  };
}

// The server answers refusals as values, not exceptions. Both "no partner" and
// "match not found" mean the pairing ended before this tap landed — most often
// because the other person ended it first — so they read the same.
export type SafetyRefusal = 'no_partner' | 'match_not_found' | 'category_unavailable';

export function safetyRefusalMessage(reason: SafetyRefusal): string {
  return reason === 'category_unavailable'
    ? "That option isn't available for this match. Pick another."
    : 'This match has already ended.';
}
