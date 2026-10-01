import {
  ACTIVITY_SLUGS,
  DEFAULT_TEMPLATE_SLUG,
  challengeOptionSlugs,
  energyToFirstWeek,
  firstNameFrom,
  goalLabel,
  goalToTemplateSlug,
  personalitySummary,
  suggestedHabitTitle,
  toneLabel
} from './mappings';
import { ENERGY_LEVELS, GOALS, STRUGGLES, TONES } from './constants';

describe('goalToTemplateSlug', () => {
  it('maps every goal to its recommended activity', () => {
    expect(goalToTemplateSlug('move_more')).toBe('activity-running');
    expect(goalToTemplateSlug('sleep_better')).toBe('activity-walking');
    expect(goalToTemplateSlug('reduce_stress')).toBe('activity-yoga');
    expect(goalToTemplateSlug('improve_energy')).toBe('activity-workouts');
  });

  it('falls back to walking when the goal was skipped', () => {
    expect(goalToTemplateSlug(null)).toBe(DEFAULT_TEMPLATE_SLUG);
  });
});

describe('challengeOptionSlugs', () => {
  it('always offers exactly the six activities, whatever the goal', () => {
    for (const goal of [null, ...GOALS.map((g) => g.value)]) {
      const slugs = challengeOptionSlugs(goal);
      expect(slugs).toHaveLength(6);
      expect([...slugs].sort()).toEqual([...ACTIVITY_SLUGS].sort());
    }
  });

  it('leads with the goal\'s own activities, in their order', () => {
    expect(challengeOptionSlugs('move_more').slice(0, 4)).toEqual([
      'activity-running',
      'activity-jogging',
      'activity-cycling',
      'activity-walking'
    ]);
    expect(challengeOptionSlugs('improve_energy').slice(0, 2)).toEqual([
      'activity-workouts',
      'activity-running'
    ]);
  });

  it('puts its own recommendation first, so the badge never orphans', () => {
    for (const g of GOALS) {
      expect(challengeOptionSlugs(g.value)[0]).toBe(goalToTemplateSlug(g.value));
    }
    expect(challengeOptionSlugs(null)[0]).toBe(DEFAULT_TEMPLATE_SLUG);
  });

  it('never offers one of the retired habits', () => {
    for (const goal of [null, ...GOALS.map((g) => g.value)]) {
      for (const slug of challengeOptionSlugs(goal)) expect(slug).toMatch(/^activity-/);
    }
  });
});

describe('suggestedHabitTitle', () => {
  it('names the recommended activity, defaulting to walking', () => {
    expect(suggestedHabitTitle('move_more')).toBe('Running');
    expect(suggestedHabitTitle('improve_energy')).toBe('Workouts');
    expect(suggestedHabitTitle(null)).toBe('Walking');
  });
});

describe('energyToFirstWeek', () => {
  it('has copy for every energy level', () => {
    for (const level of ENERGY_LEVELS) {
      expect(energyToFirstWeek(level.value)).toBeTruthy();
    }
    expect(energyToFirstWeek('low')).toMatch(/gentle/i);
    expect(energyToFirstWeek('high')).toMatch(/strong/i);
  });
});

describe('personalitySummary', () => {
  it('returns a tone fallback for every struggle x tone combination', () => {
    for (const struggle of STRUGGLES) {
      for (const tone of TONES) {
        expect(personalitySummary(struggle.value, tone.value)).toBeTruthy();
      }
    }
  });

  it('works when the struggle was skipped', () => {
    expect(personalitySummary(null, 'team')).toMatch(/show up for others/i);
  });
});

describe('label lookups', () => {
  it('resolves known stored values to display labels', () => {
    expect(goalLabel('move_more')).toBe('Move more');
    expect(toneLabel('momentum')).toBe('Momentum-driven');
  });

  it('falls back to the raw string for legacy values', () => {
    expect(toneLabel('solo')).toBe('solo');
    expect(goalLabel('Move more')).toBe('Move more');
  });

  it('returns null for missing values', () => {
    expect(goalLabel(null)).toBeNull();
    expect(toneLabel(undefined)).toBeNull();
  });

  it('covers every option in the constants', () => {
    for (const g of GOALS) expect(goalLabel(g.value)).toBe(g.label);
    for (const t of TONES) expect(toneLabel(t.value)).toBe(t.label);
  });
});

describe('firstNameFrom', () => {
  it('takes the first whitespace-separated token', () => {
    expect(firstNameFrom('Gayan Sandamal')).toBe('Gayan');
    expect(firstNameFrom('  Amara   de Silva ')).toBe('Amara');
  });

  it('handles single names, empty strings, and null', () => {
    expect(firstNameFrom('Cher')).toBe('Cher');
    expect(firstNameFrom('')).toBeNull();
    expect(firstNameFrom('   ')).toBeNull();
    expect(firstNameFrom(null)).toBeNull();
    expect(firstNameFrom(undefined)).toBeNull();
  });
});
