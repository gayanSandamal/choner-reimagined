import {
  DEFAULT_TEMPLATE_SLUG,
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
  it('maps every goal to its seeded template slug', () => {
    expect(goalToTemplateSlug('move_more')).toBe('onboarding-walk-10min');
    expect(goalToTemplateSlug('sleep_better')).toBe('onboarding-no-screens');
    expect(goalToTemplateSlug('reduce_stress')).toBe('onboarding-deep-breathing');
    expect(goalToTemplateSlug('improve_energy')).toBe('onboarding-morning-water');
  });

  it('falls back to the walking template when the goal was skipped', () => {
    expect(goalToTemplateSlug(null)).toBe(DEFAULT_TEMPLATE_SLUG);
  });
});

describe('suggestedHabitTitle', () => {
  it('returns the spec habit copy per goal, defaulting to walking', () => {
    expect(suggestedHabitTitle('sleep_better')).toBe('No screens 30 minutes before bed');
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
