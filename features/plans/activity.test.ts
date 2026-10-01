import { activityNoun, amountLabel, amountOptions, howMuchHeading, measuredInMinutes, planCopy } from './activity';
import { COPY, DISTANCES } from './copy';

const SIX = ['running', 'jogging', 'walking', 'cycling', 'yoga', 'home_workouts'];

describe('the plan flow speaks the activity', () => {
  it('keeps the handover wording for running, word for word', () => {
    const c = planCopy('running');
    expect(c.gateButton).toBe(COPY.gateButton);
    expect(c.stepsInSub).toBe(COPY.stepsInSub);
    expect(c.modeHeading).toBe(COPY.modeHeading);
    expect(c.modeTogether).toBe(COPY.modeTogether);
    expect(c.modeTogetherSub).toBe(COPY.modeTogetherSub);
    expect(c.modeSeparate).toBe(COPY.modeSeparate);
    expect(howMuchHeading('running')).toBe(COPY.howFar);
  });

  it('never says "run" to someone doing something else', () => {
    for (const activity of SIX.filter((a) => a !== 'running')) {
      const c = planCopy(activity);
      const all = [
        c.gateButton, c.stepsInSub, c.modeHeading, c.modeTogether, c.modeTogetherSub,
        c.modeSeparate, c.modeSeparateSub, c.firstTitle, c.yourCard, c.theirCard('Gayan'),
        howMuchHeading(activity)
      ].join(' | ');
      expect(all).not.toMatch(/\brun\b/i);
    }
  });

  it('has words for all six, and a neutral fallback for anything else', () => {
    for (const activity of SIX) expect(activityNoun(activity)).not.toBe('session');
    expect(activityNoun('badminton')).toBe('session');
    expect(activityNoun(null)).toBe('session');
    expect(planCopy(undefined).gateButton).toBe('Plan your first session');
  });
});

describe('how much is asked in the activity\'s own unit', () => {
  it('offers distances for the four and minutes for yoga and workouts', () => {
    for (const a of ['running', 'jogging', 'walking', 'cycling']) {
      expect(amountOptions(a)).toBe(DISTANCES);
      expect(measuredInMinutes(a)).toBe(false);
      expect(amountLabel(a)).toBe('Distance');
    }
    for (const a of ['yoga', 'home_workouts']) {
      expect(amountOptions(a).every((o) => o === 'Not sure yet' || /min/.test(o))).toBe(true);
      expect(amountLabel(a)).toBe('Time');
      expect(howMuchHeading(a)).toMatch(/^How long/);
    }
  });

  it('always lets someone say they are not sure yet', () => {
    for (const a of SIX) expect(amountOptions(a)).toContain('Not sure yet');
  });
});
