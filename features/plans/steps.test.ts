import { planStep, waitingOnThem } from './steps';
import type { PairPlan, PlanMember } from './types';

const member = (o: Partial<PlanMember> = {}): PlanMember => ({
  distance_answer: null, mode_answer: null, confirmed_at: null, on_my_way_at: null,
  here_at: null, finished_at: null, checkin: null, checkin_at: null, miss_reason: null, ...o
});
const T = '2026-09-23T10:00:00Z';
const plan = (o: Partial<PairPlan> = {}): PairPlan => ({
  id: 'p', kind: 'first_run', status: 'planning', activity_key: 'running', mode: null,
  distance: null, place_name: null, place_text: null, meeting_location_status: 'not_set',
  founder_help_required: false, starts_at: null, i_open: true, me: member(),
  them: { ...member(), first_name: 'Dinesh', avatar_url: null }, messages: [], ...o
});
const hi = [{ mine: true, key: 'opener' as const }, { mine: false, key: 'lets_go' as const }];

describe('planStep', () => {
  it('walks Run together from Say Hi to completion', () => {
    expect(planStep(plan())).toBe('say_hi');
    expect(planStep(plan({ messages: hi }))).toBe('how_much');
    expect(planStep(plan({ messages: hi, distance: '5 km' }))).toBe('mode');
    const t = { messages: hi, distance: '5 km', mode: 'together' as const };
    expect(planStep(plan(t))).toBe('where');
    expect(planStep(plan({ ...t, meeting_location_status: 'agreed' }))).toBe('when');
    const a = { ...t, meeting_location_status: 'agreed' as const, starts_at: T };
    expect(planStep(plan(a))).toBe('confirm');
    expect(planStep(plan({ ...a, status: 'confirmed' }))).toBe('day_of');
    expect(planStep(plan({ ...a, status: 'confirmed', me: member({ here_at: T }) }))).toBe('day_of');
    expect(
      planStep(plan({ ...a, status: 'confirmed', me: member({ here_at: T }), them: { ...member({ here_at: T }), first_name: 'D', avatar_url: null } }))
    ).toBe('qr');
    expect(planStep(plan({ ...a, status: 'verified' }))).toBe('finish');
    expect(planStep(plan({ ...a, status: 'verified', me: member({ finished_at: T }) }))).toBe('completion');
  });

  it('walks Run separately, together through check-in', () => {
    const s = { messages: hi, distance: '5 km', mode: 'separate' as const };
    expect(planStep(plan(s))).toBe('day_time');
    expect(planStep(plan({ ...s, starts_at: T }))).toBe('confirm');
    expect(planStep(plan({ ...s, starts_at: T, status: 'confirmed' }))).toBe('checkin');
    expect(planStep(plan({ ...s, starts_at: T, status: 'confirmed', me: member({ checkin: 'done' }) }))).toBe('completion');
  });

  it('skips Say Hi for a later meetup, and stops on a block', () => {
    expect(planStep(plan({ kind: 'meetup' }))).toBe('how_much');
    expect(planStep(plan({ status: 'ended', messages: hi }))).toBe('ended');
  });
});

describe('waitingOnThem is computed from the viewer', () => {
  it('mirrors for the two people on the same plan', () => {
    const mine = plan({ me: member({ distance_answer: '5 km' }) });
    const theirs = plan({ i_open: false, them: { ...member({ distance_answer: '5 km' }), first_name: 'G', avatar_url: null } });
    expect(waitingOnThem(mine, 'how_much')).toBe(true);
    expect(waitingOnThem(theirs, 'how_much')).toBe(false);
  });
});
