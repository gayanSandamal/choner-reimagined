import { MATCH_EXPIRED_BODY, MATCH_EXPIRED_TITLE, matchClock, offerState } from './match-clock';

const NOW = new Date('2026-10-04T10:00:00Z');
const inMs = (ms: number) => new Date(NOW.getTime() + ms).toISOString();
const H = 3600_000;
const M = 60_000;

describe('matchClock', () => {
  it('counts down from the one shared deadline', () => {
    expect(matchClock(inMs(24 * H), NOW)).toMatchObject({ state: 'running', label: '24h left' });
    expect(matchClock(inMs(23 * H + 12 * M + 30_000), NOW)).toMatchObject({ label: '23h 12m left' });
    expect(matchClock(inMs(45 * M), NOW)).toMatchObject({ label: '45m left' });
    expect(matchClock(inMs(20_000), NOW)).toMatchObject({ label: 'Less than a minute left' });
  });

  it('is the same for both people: it depends on the deadline and nothing else', () => {
    const deadline = inMs(5 * H);
    expect(matchClock(deadline, NOW)).toEqual(matchClock(deadline, NOW));
  });

  it('runs out', () => {
    expect(matchClock(inMs(0), NOW)).toEqual({ state: 'expired' });
    expect(matchClock(inMs(-M), NOW)).toEqual({ state: 'expired' });
  });

  it('shows no clock rather than a wrong one', () => {
    expect(matchClock(undefined, NOW)).toEqual({ state: 'none' });
    expect(matchClock(null, NOW)).toEqual({ state: 'none' });
    expect(matchClock('soon', NOW)).toEqual({ state: 'none' });
  });
});

describe('offerState', () => {
  it('has three states, because one person can answer first', () => {
    expect(offerState({ i_confirmed: false, expires_at: inMs(H) }, NOW)).toBe('offered');
    expect(offerState({ i_confirmed: true, expires_at: inMs(H) }, NOW)).toBe('you_accepted');
    expect(offerState({ i_confirmed: true, expires_at: inMs(-1) }, NOW)).toBe('expired');
    expect(offerState({ i_confirmed: false, expires_at: inMs(-1) }, NOW)).toBe('expired');
  });

  it('treats a missing deadline as no clock, not as expired', () => {
    expect(offerState({ i_confirmed: false }, NOW)).toBe('offered');
  });
});

describe('expired copy', () => {
  it('blames nobody and has no long dashes', () => {
    for (const line of [MATCH_EXPIRED_TITLE, MATCH_EXPIRED_BODY]) {
      expect(line).not.toMatch(/[—–]/);
      expect(line.toLowerCase()).not.toMatch(/didn't answer|ignored|your fault/);
    }
  });
});
