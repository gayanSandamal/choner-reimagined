import { historyLine, partnerRow } from './history';

describe('historyLine', () => {
  it('reads "Ended · score · month year"', () => {
    expect(historyLine({ done: 7, target: 12, ended_at: '2026-09-18T10:00:00Z' }, 'en-GB')).toBe(
      'Ended · 7 of 12 · September 2026'
    );
  });

  it('shows 11 of 12 as the real ending it is', () => {
    expect(historyLine({ done: 11, target: 12, ended_at: '2026-10-02T10:00:00Z' }, 'en-GB')).toBe(
      'Ended · 11 of 12 · October 2026'
    );
  });

  it('invents no score for a challenge that never had a streak', () => {
    expect(historyLine({ done: 0, target: null, ended_at: '2026-08-05T10:00:00Z' }, 'en-GB')).toBe(
      'Ended · August 2026'
    );
    expect(historyLine({ done: 0, target: null, ended_at: null })).toBe('Ended');
  });
});

describe('partnerRow', () => {
  it('offers a standard button to Find for every state before a partner', () => {
    expect(partnerRow('solo', null)).toEqual({ kind: 'handoff', line: null, button: 'Find a match' });
    expect(partnerRow('finding', null)).toEqual({ kind: 'handoff', line: 'Partner: searching...', button: 'See your search' });
    expect(partnerRow('invited', null)).toEqual({ kind: 'handoff', line: 'Partner: invited...', button: 'See your invite' });
    expect(partnerRow('matched', null)).toEqual({ kind: 'handoff', line: 'A match is waiting...', button: 'See your match' });
  });

  it('never prints a "not found yet" row', () => {
    for (const state of ['solo', 'finding', 'invited', 'matched']) {
      const row = partnerRow(state, null);
      expect(row.line ?? '').not.toMatch(/not found/i);
    }
  });

  it('names the partner once there is one', () => {
    expect(partnerRow('partnered', 'Gayan')).toEqual({ kind: 'partnered', line: 'You + Gayan' });
    expect(partnerRow('partnered', null)).toEqual({ kind: 'partnered', line: 'You + your partner' });
  });
});
