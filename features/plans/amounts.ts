import type { PairPlan } from './types';

// The amount is per person; the cadence is shared (1 October).
//
// Each person answers "how much" for themselves and keeps their own number:
// pair_plan_members.distance_answer, which arrives here as plan.me and
// plan.them. plan.distance is the SHARED amount and is only set when the two
// answers match. Nothing in the app should read plan.distance on its own any
// more, or a pair on different amounts renders as having none.

export function myAmount(p: PairPlan): string | null {
  return p.me.distance_answer ?? p.distance ?? null;
}

export function theirAmount(p: PairPlan): string | null {
  return p.them.distance_answer ?? p.distance ?? null;
}

// The "how much" step is done once BOTH have answered, whether or not the
// answers match. A plan made before this change has plan.distance and may
// have no answers at all, so that still counts.
export function amountSettled(p: PairPlan): boolean {
  if (p.distance) return true;
  return Boolean(p.me.distance_answer && p.them.distance_answer);
}

// "5 km each time" when they match, "You 5 km · Gayan 3 km" when they don't.
// Null until there is something to say.
export function amountLine(p: PairPlan): string | null {
  const mine = myAmount(p);
  const theirs = theirAmount(p);
  if (!mine && !theirs) return null;
  if (mine && theirs && mine === theirs) return `${mine} each time`;
  return [mine ? `You ${mine}` : null, theirs ? `${p.them.first_name} ${theirs}` : null]
    .filter(Boolean)
    .join(' · ');
}
