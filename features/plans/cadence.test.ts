import { cadenceLabel, streakEstimate } from './cadence';
import { planStep } from './steps';
import type { PairPlan, PlanMember } from './types';

describe('cadenceLabel', () => {
  it('says Daily for 7, never 7x', () => {
    expect(cadenceLabel(7)).toBe('Daily');
    expect(cadenceLabel(1)).toBe('1x a week');
    expect(cadenceLabel(6)).toBe('6x a week');
  });

  it('is null for anything that is not a cadence', () => {
    expect(cadenceLabel(null)).toBeNull();
    expect(cadenceLabel(undefined)).toBeNull();
    expect(cadenceLabel(0)).toBeNull();
    expect(cadenceLabel(8)).toBeNull();
    expect(cadenceLabel(2.5)).toBeNull();
  });
});

describe('streakEstimate', () => {
  it('is target divided by cadence, rounded up, in weeks', () => {
    expect(streakEstimate(20, 4)).toBe('About 5 weeks at 4x a week');
    expect(streakEstimate(10, 3)).toBe('About 4 weeks at 3x a week');
    expect(streakEstimate(30, 7)).toBe('About 5 weeks doing it daily');
    expect(streakEstimate(1, 2)).toBe('About 1 week at 2x a week');
  });

  it('has nothing to say before a cadence is agreed', () => {
    expect(streakEstimate(20, null)).toBeNull();
  });
});

describe('how often is a step of the first plan', () => {
  const member = (o: Partial<PlanMember> = {}): PlanMember => ({
    distance_answer: null, mode_answer: null, confirmed_at: null, on_my_way_at: null,
    here_at: null, finished_at: null, checkin: null, checkin_at: null, miss_reason: null, ...o
  });
  const plan = (o: Partial<PairPlan> = {}): PairPlan => ({
    id: 'p', kind: 'meetup', status: 'planning', activity_key: 'running', mode: null,
    distance: '5 km', place_name: null, place_text: null, meeting_location_status: 'not_set',
    founder_help_required: false, starts_at: null, i_open: true, me: member(),
    them: { ...member(), first_name: 'Gayan', avatar_url: null }, messages: [], ...o
  });

  it('comes after how much, when the pair has none agreed', () => {
    expect(planStep(plan({ cadence: null }))).toBe('how_often');
  });

  it('is skipped once the pair has one, on this plan or an earlier one', () => {
    expect(planStep(plan({ cadence: 3 }))).toBe('mode');
  });

  it('is skipped against a server that does not send the field at all', () => {
    // An older database has no cadence key. Absent is not "still to agree".
    expect(planStep(plan())).toBe('mode');
  });
});
