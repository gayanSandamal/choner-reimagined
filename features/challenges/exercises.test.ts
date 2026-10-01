import { EXERCISES, MAX_EXERCISES, toggleExercise } from './exercises';

describe('toggleExercise', () => {
  it('adds and removes, keeping the order picked', () => {
    let list: string[] = [];
    list = toggleExercise(list, 'Plank');
    list = toggleExercise(list, 'Squats');
    expect(list).toEqual(['Plank', 'Squats']);
    expect(toggleExercise(list, 'Plank')).toEqual(['Squats']);
  });

  it('stops at four', () => {
    const four = EXERCISES.slice(0, MAX_EXERCISES) as unknown as string[];
    expect(toggleExercise(four, EXERCISES[4])).toEqual(four);
    // Removing still works at the cap.
    expect(toggleExercise(four, four[0])).toHaveLength(3);
  });
});
