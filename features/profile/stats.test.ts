import { profileStats } from './stats';

describe('profileStats', () => {
  it('counts sessions and challenges, never days', () => {
    const stats = profileStats({
      streak: { done: 3, target: 12 },
      partnerName: 'Gayan',
      sessionsTogether: 7,
      finished: 2
    });
    expect(stats).toEqual([
      { value: '3 of 12', label: 'your streak' },
      { value: '7', label: 'with Gayan' },
      { value: '2', label: 'challenges finished' }
    ]);
    for (const s of stats) {
      expect(s.label).not.toMatch(/day|log|fire/i);
    }
  });

  it('shows what is done before a streak length is picked', () => {
    expect(profileStats({ streak: { done: 1, target: null }, partnerName: null, sessionsTogether: 0, finished: 1 })).toEqual([
      { value: '1', label: 'session done' },
      { value: '0', label: 'with a partner' },
      { value: '1', label: 'challenge finished' }
    ]);
  });

  it('is all zeros with nothing yet, not blanks and not invented numbers', () => {
    expect(profileStats({ streak: null, partnerName: null, sessionsTogether: null, finished: null }).map((s) => s.value)).toEqual([
      '0',
      '0',
      '0'
    ]);
  });

  it('does not credit sessions to a partner who is no longer there', () => {
    expect(profileStats({ streak: null, partnerName: null, sessionsTogether: 9, finished: 0 })[1]).toEqual({
      value: '0',
      label: 'with a partner'
    });
  });
});
