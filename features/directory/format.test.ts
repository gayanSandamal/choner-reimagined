import { directoryExercises, directoryLine } from './format';

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

describe('directoryExercises', () => {
  it('lists a workout row\'s exercises, at most four', () => {
    expect(directoryExercises({ exercises: ['Squats', 'Push-ups', 'Plank'] })).toBe('Squats, Push-ups, Plank');
    expect(directoryExercises({ exercises: ['a', 'b', 'c', 'd', 'e'] })).toBe('a, b, c, d');
  });

  it('prints nothing when there are none', () => {
    expect(directoryExercises({ exercises: [] })).toBeNull();
    expect(directoryExercises({ exercises: [' ', ''] })).toBeNull();
    // A server that has not run 202610011100 sends no key at all.
    expect(directoryExercises({})).toBeNull();
  });
});
