// The claim the Find tab makes about our own track record.
//
// This is a FACTUAL claim about real people, shown to strangers as the reason
// to trust a stranger-pairing. It is hardcoded rather than computed because
// "stuck with it for 8+ weeks" is something we know from talking to those
// pairs, not something the database can currently prove.
//
// That makes it the one string in the app that can quietly become a lie.
// Whoever adds pair number ten owns updating it — and if the ratio ever stops
// being every pair, the copy has to change too, not just the number.
//
// Last confirmed accurate: 2026-08-18 (Dinesh).
export const MATCHING_PROOF = {
  ratio: '9/9',
  lead: 'Every pair we’ve matched',
  tail: 'stuck with it for 8+ weeks — nothing but text messages.'
} as const;
