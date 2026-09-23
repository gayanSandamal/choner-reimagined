import { directoryLine } from './format';

describe('directoryLine', () => {
  it('matches the handover examples exactly', () => {
    expect(directoryLine({ activity: 'Running', commitment_value: 5, unit: 'km', days_per_week: 7 })).toBe(
      'Running · 5 km, daily'
    );
    expect(directoryLine({ activity: 'Yoga', commitment_value: null, unit: null, days_per_week: 7 })).toBe(
      'Yoga · daily'
    );
    expect(directoryLine({ activity: 'Gym', commitment_value: null, unit: null, days_per_week: 4 })).toBe(
      'Gym · 4x a week'
    );
  });

  it('never prints an empty detail', () => {
    expect(directoryLine({ activity: 'Walking', commitment_value: null, unit: null, days_per_week: null })).toBe(
      'Walking'
    );
  });
});
