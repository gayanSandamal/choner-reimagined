import { amountLine, amountSettled, myAmount, theirAmount } from './amounts';
import { planStep } from './steps';
import type { PairPlan, PlanMember } from './types';

const member = (o: Partial<PlanMember> = {}): PlanMember => ({
  distance_answer: null, mode_answer: null, confirmed_at: null, on_my_way_at: null,
  here_at: null, finished_at: null, checkin: null, checkin_at: null, miss_reason: null, ...o
});
const them = (o: Partial<PlanMember> = {}) => ({ ...member(o), first_name: 'Gayan', avatar_url: null });
const hi = [{ mine: true, key: 'opener' as const }, { mine: false, key: 'lets_go' as const }];
const plan = (o: Partial<PairPlan> = {}): PairPlan => ({
  id: 'p', kind: 'first_run', status: 'planning', activity_key: 'running', mode: null,
  distance: null, place_name: null, place_text: null, meeting_location_status: 'not_set',
  founder_help_required: false, starts_at: null, i_open: true, me: member(),
  them: them(), messages: hi, ...o
});

describe('per-person amounts', () => {
  it('collapses to one line when both chose the same', () => {
    const p = plan({ distance: '5 km', me: member({ distance_answer: '5 km' }), them: them({ distance_answer: '5 km' }) });
    expect(amountLine(p)).toBe('5 km each time');
  });

  it('shows both when they differ, and that is not a conflict', () => {
    const p = plan({ me: member({ distance_answer: '5 km' }), them: them({ distance_answer: '3 km' }) });
    expect(amountLine(p)).toBe('You 5 km · Gayan 3 km');
    expect(myAmount(p)).toBe('5 km');
    expect(theirAmount(p)).toBe('3 km');
    expect(amountSettled(p)).toBe(true);
    // The step moves on. It used to stay on how_much and open a negotiation.
    expect(planStep(p)).toBe('mode');
  });

  it('waits on how much until both have answered', () => {
    const p = plan({ me: member({ distance_answer: '5 km' }) });
    expect(amountSettled(p)).toBe(false);
    expect(planStep(p)).toBe('how_much');
    expect(amountLine(p)).toBe('You 5 km');
  });

  it('still reads a plan made before the change, which only has the shared value', () => {
    const p = plan({ distance: '3 km' });
    expect(amountSettled(p)).toBe(true);
    expect(myAmount(p)).toBe('3 km');
    expect(theirAmount(p)).toBe('3 km');
    expect(amountLine(p)).toBe('3 km each time');
  });

  it('says nothing before anyone has answered', () => {
    expect(amountLine(plan())).toBeNull();
  });
});
