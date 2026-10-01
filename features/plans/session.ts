import { activityNoun } from './activity';
import type { PairPlan, PlanMember, Proposal } from './types';

// The session details screen (app/challenge/[id].tsx): what is true about one
// planned session, worked out from the plan alone so the screen and its tests
// cannot disagree.

// Minutes offered under "Running late?". The server accepts 5 to 60.
export const LATE_OPTIONS = [5, 10, 15, 20, 30] as const;

// Same calendar day on the device. Nudge and "Running late?" exist on the day
// and on no other day; the server checks it again in the person's timezone.
export function isSameLocalDay(iso: string | null | undefined, now: Date = new Date()): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

// When this person's session is. In separate mode each can have their own time.
export function myTime(plan: Pick<PairPlan, 'starts_at' | 'me'>): string | null {
  return plan.me?.planned_at ?? plan.starts_at ?? null;
}

export function isSessionToday(plan: Pick<PairPlan, 'starts_at' | 'me'>, now: Date = new Date()): boolean {
  return isSameLocalDay(myTime(plan), now);
}

// A planned session: agreed by both and not finished. Details, move and
// cancel only make sense here; before it there is a plan being made.
export function isPlanned(plan: Pick<PairPlan, 'status'> | null | undefined): boolean {
  return plan?.status === 'confirmed';
}

// The live cancel request, if any. A request lapses at the end of the asker's
// day; the row stays open on the server, so a lapsed one is filtered here.
export function cancelRequest(
  plan: Pick<PairPlan, 'open_proposals'> | null | undefined,
  now: Date = new Date()
): (Proposal & { expiresAt: Date }) | null {
  for (const p of plan?.open_proposals ?? []) {
    if (p.field !== 'cancel') continue;
    const expiresAt = new Date(p.value?.expires_at);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() <= now.getTime()) continue;
    return { ...p, expiresAt };
  }
  return null;
}

export function moveRequest(plan: Pick<PairPlan, 'open_proposals'> | null | undefined): Proposal | null {
  return (plan?.open_proposals ?? []).find((p) => p.field === 'reschedule') ?? null;
}

// One line per person. Order matters: the latest thing they did wins.
export function memberStatus(
  m: PlanMember | null | undefined,
  mode: PairPlan['mode'],
  who: 'me' | 'them'
): string {
  const you = who === 'me';
  if (!m) return you ? "You're in" : 'In';
  if (m.finished_at || m.checkin === 'done') return 'Done';
  if (m.cant_make_it_at || m.checkin === 'cant') return you ? "You can't make it today" : "Can't make it today";
  if (mode === 'together') {
    if (m.here_at) return you ? "You're here" : 'Already here';
    if (m.late_minutes) return `Running about ${m.late_minutes} minutes late`;
    if (m.on_my_way_at) return 'On the way';
  }
  if (m.checkin === 'later') return 'Doing it later today';
  return you ? "You're in" : 'In';
}

// Nudge: on the day, once, and only while there is something left to nudge
// about.
export function canNudge(plan: PairPlan, now: Date = new Date()): boolean {
  if (!isPlanned(plan) || !isSessionToday(plan, now)) return false;
  if (plan.me.nudged_at) return false;
  return !plan.them.here_at && plan.them.checkin !== 'done';
}

// "Running late?": a meetup, on the day, until you have arrived.
export function canRunLate(plan: PairPlan, now: Date = new Date()): boolean {
  return isPlanned(plan) && plan.mode === 'together' && isSessionToday(plan, now) && !plan.me.here_at;
}

export function cancelWarning(plan: Pick<PairPlan, 'activity_key' | 'them'>) {
  const noun = activityNoun(plan.activity_key);
  return {
    title: `Cancel this ${noun}?`,
    message:
      `This can't be undone. ${plan.them.first_name} has to agree, and if they don't answer by the end of today the plan stands. ` +
      'Cancelling does not touch your streak.'
  };
}

// Server refusals, in words. Unknown reasons fall back to a plain retry line.
export function sessionRefusal(reason: string, partner: string): string {
  switch (reason) {
    case 'not_today':
      return 'That is only for the day itself.';
    case 'already_nudged':
      return `You've already nudged ${partner} about this one.`;
    case 'already_done':
      return `${partner} is already there.`;
    case 'already_here':
      return "You're already here.";
    case 'not_meetup':
      return 'That is only for sessions you do together.';
    case 'they_asked':
      return `${partner} has already asked to cancel. You can answer that instead.`;
    case 'expired':
      return 'That request ran out at the end of the day. The plan stands.';
    case 'no_plan':
    case 'not_open':
      return 'This session has changed. Pull down to refresh.';
    default:
      return 'Please try again.';
  }
}
