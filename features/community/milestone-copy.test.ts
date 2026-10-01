import { milestoneLine } from './milestone-copy';

const base = { habit_title: null, streak_days: null };

describe('milestoneLine', () => {
  it('counts a streak in sessions, never days', () => {
    expect(milestoneLine({ ...base, kind: 'streak', streak_days: 12 })).toBe('kept a 12 session streak');
    expect(milestoneLine({ ...base, kind: 'streak' })).toBe('kept their streak going');
    expect(milestoneLine({ ...base, kind: 'streak', streak_days: 7 })).not.toMatch(/day/);
  });

  it('names the activity when there is one', () => {
    expect(milestoneLine({ ...base, kind: 'complete', habit_title: 'Running' })).toBe('finished “Running”');
    expect(milestoneLine({ ...base, kind: 'matched' })).toBe('found a partner for something new');
    expect(milestoneLine({ ...base, kind: 'session_together', habit_title: 'run' })).toBe(
      'just finished their run together'
    );
    expect(milestoneLine({ ...base, kind: 'session_together' })).toBe('just finished their session together');
  });
});
