import {
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
  it('maps every goal to its recommended template slug', () => {
    expect(goalToTemplateSlug('move_more')).toBe('onboarding-run-1-mile');
    expect(goalToTemplateSlug('sleep_better')).toBe('onboarding-winddown-walk');
    expect(goalToTemplateSlug('reduce_stress')).toBe('onboarding-deep-breathing');
    expect(goalToTemplateSlug('improve_energy')).toBe('onboarding-morning-water');
  });

  it('falls back to the walking template when the goal was skipped', () => {
    expect(goalToTemplateSlug(null)).toBe(DEFAULT_TEMPLATE_SLUG);
  });
});

describe('challengeOptionSlugs', () => {
  it('offers the curated list for each goal', () => {
    expect(challengeOptionSlugs('move_more')).toHaveLength(4);
    expect(challengeOptionSlugs('sleep_better')).toEqual([
      'onboarding-winddown-walk',
      'onboarding-stretch-before-bed'
    ]);
  });

  it('always contains its own recommendation, so the badge never orphans', () => {
    for (const g of GOALS) {
      expect(challengeOptionSlugs(g.value)).toContain(goalToTemplateSlug(g.value));
    }
    expect(challengeOptionSlugs(null)).toContain(goalToTemplateSlug(null));
  });

  it('shows the whole deduped set when the goal was skipped', () => {
    const all = challengeOptionSlugs(null);
    expect(all[0]).toBe(DEFAULT_TEMPLATE_SLUG);
    expect(new Set(all).size).toBe(all.length);
    expect(all).toContain('onboarding-journaling');
  });

  it('never offers a habit the spec retired', () => {
    for (const goal of [null, ...GOALS.map((g) => g.value)]) {
      expect(challengeOptionSlugs(goal)).not.toContain('onboarding-no-screens');
    }
  });
});

describe('suggestedHabitTitle', () => {
  it('returns the recommended habit copy per goal, defaulting to walking', () => {
    expect(suggestedHabitTitle('sleep_better')).toBe('10-min wind-down walk');
    expect(suggestedHabitTitle(null)).toBe('Walk for 10 minutes every day');
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
