import type { PairPlan } from './types';

// Where a pair is in the session flow, computed from the plan alone so every
// screen agrees. Order follows the handover: Say Hi → how much → mode → (6A)
// where → when → confirm → day of → QR → finish, or (6B) day & time →
// confirm → check-in; then completion.
export type PlanStep =
  | 'say_hi'
  | 'how_much'
  | 'mode'
  | 'where'
  | 'when'
  | 'day_time'
  | 'confirm'
  | 'day_of'
  | 'qr'
  | 'finish'
  | 'checkin'
  | 'completion'
  | 'ended';

export function planStep(p: PairPlan): PlanStep {
  if (p.status === 'ended' || p.status === 'cancelled') return 'ended';
  if (p.status === 'completed') return 'completion';

  // Say Hi only opens a first run; a later meetup goes straight to planning.
  if (p.kind === 'first_run') {
    const opener = p.messages.some((m) => m.key === 'opener');
    const reply = p.messages.some((m) => m.key !== 'opener');
    if (!opener || !reply) return 'say_hi';
  }

  if (!p.distance) return 'how_much';
  if (!p.mode) return 'mode';

  if (p.mode === 'together') {
    if (p.meeting_location_status !== 'agreed' && p.meeting_location_status !== 'founder_assisted') {
      return 'where';
    }
    if (!p.starts_at) return 'when';
    if (p.status === 'planning') return 'confirm';
    if (p.status === 'confirmed') {
      // QR verification never opens on one "I'm here" — only when BOTH are.
      return p.me.here_at && p.them.here_at ? 'qr' : 'day_of';
    }
    // verified: the scan was the check-in; one tap to finish.
    return p.me.finished_at ? 'completion' : 'finish';
  }

  // Run separately, together (6B).
  if (!p.starts_at) return 'day_time';
  if (p.status === 'planning') return 'confirm';
  return p.me.checkin === 'done' ? 'completion' : 'checkin';
}

// "Waiting on the other person" for the current step — the per-user half of
// every two-sided screen, answered from whoever is looking.
export function waitingOnThem(p: PairPlan, step: PlanStep): boolean {
  switch (step) {
    case 'say_hi':
      return p.i_open
        ? p.messages.some((m) => m.mine && m.key === 'opener')
        : !p.messages.some((m) => m.key === 'opener');
    case 'how_much':
      return Boolean(p.me.distance_answer) && !p.them.distance_answer;
    case 'confirm':
      return Boolean(p.me.confirmed_at) && !p.them.confirmed_at;
    case 'day_of':
      return Boolean(p.me.here_at) && !p.them.here_at;
    default:
      return false;
  }
}
