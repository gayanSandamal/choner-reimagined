import { circleDay, circleLabel, streakLine, streakScore } from './streak';

describe('streakScore', () => {
  it('counts filled circles against the target', () => {
    expect(streakScore({ done: 7, target: 12 })).toBe('7 of 12');
    expect(streakScore({ done: 11, target: 12 })).toBe('11 of 12');
  });

  it('has no score before a target is picked', () => {
    expect(streakScore({ done: 3, target: null })).toBeNull();
  });
});

describe('circles', () => {
  it('labels a session with its own day', () => {
    expect(circleDay({ state: 'done', at: '2026-10-05T10:00:00Z', plan_id: 'p' }, 'en-GB')).toBe('Mon');
    expect(circleDay({ state: 'ahead' })).toBeNull();
    expect(circleDay({ state: 'planned', at: null, plan_id: 'p' })).toBeNull();
  });

  it('describes each state for a screen reader', () => {
    expect(circleLabel({ state: 'done', at: null, plan_id: 'p' }, 0)).toBe('Session 1, done');
    expect(circleLabel({ state: 'done', at: null, plan_id: 'p', repaired: true }, 1)).toBe('Session 2, made up');
    expect(circleLabel({ state: 'missed', at: null, plan_id: 'p', repairable: true }, 2)).toBe(
      'Session 3, missed, can still be made up'
    );
    expect(circleLabel({ state: 'missed', at: null, plan_id: 'p', repairable: false }, 3)).toBe('Session 4, missed');
    expect(circleLabel({ state: 'planned', at: null, plan_id: 'p' }, 4)).toBe('Session 5, planned');
    expect(circleLabel({ state: 'ahead' }, 5)).toBe('Session 6, not planned yet');
  });
});

describe('streakLine', () => {
  it('counts sessions, never days', () => {
    expect(streakLine({ done: 3, target: 12 })).toBe('3 of 12 in your streak');
    expect(streakLine({ done: 1, target: null })).toBe('1 session done');
    expect(streakLine({ done: 4, target: null })).toBe('4 sessions done');
    expect(streakLine({ done: 3, target: 12 })).not.toMatch(/day/);
  });

  it('says nothing rather than print a zero', () => {
    expect(streakLine(null)).toBeNull();
    expect(streakLine(undefined)).toBeNull();
    expect(streakLine({ done: 0, target: null })).toBeNull();
  });
});
