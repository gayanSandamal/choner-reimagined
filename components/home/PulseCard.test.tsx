import { fireEvent, render, screen } from '@testing-library/react-native';
import { PulseCard } from './PulseCard';
import { ACTIVITY_ICONS } from './activityIcons';
import type { HomePulse } from '@/features/home/hero';

// The Pulse on Home (#207, decided 14 Nov 2026).

const pulse = (over: Partial<HomePulse> = {}): HomePulse => ({
  people: 500,
  by_activity: [
    { activity_key: 'running', title: 'Running', people: 83 },
    { activity_key: 'jogging', title: 'Jogging', people: 84 },
    { activity_key: 'walking', title: 'Walking', people: 84 },
    { activity_key: 'cycling', title: 'Cycling', people: 83 },
    { activity_key: 'yoga', title: 'Yoga', people: 83 },
    { activity_key: 'home_workouts', title: 'Workouts', people: 83 }
  ],
  pairs: 0,
  new_pairs_today: 0,
  sessions_today: 0,
  sessions_planned: 0,
  ...over
});

describe('The Pulse', () => {
  it('is headed "The Pulse"', async () => {
    await render(<PulseCard pulse={pulse()} onOpenDirectory={jest.fn()} />);
    expect(screen.getByText('The Pulse')).toBeTruthy();
    expect(screen.queryByText('Choner Pulse')).toBeNull();
  });

  it('puts the number and the sentence on separate lines, so "now" cannot fall below', async () => {
    // The bug: the number and the sentence were one piece of text, so the
    // sentence's last word wrapped onto a line as tall as the number.
    await render(<PulseCard pulse={pulse()} onOpenDirectory={jest.fn()} />);
    expect(screen.getByText('500')).toBeTruthy();
    expect(screen.getByText('people are on Choner right now')).toBeTruthy();
  });

  it('says "person is" for one', async () => {
    await render(
      <PulseCard
        pulse={pulse({ people: 1, by_activity: [{ activity_key: 'yoga', title: 'Yoga', people: 1 }] })}
        onOpenDirectory={jest.fn()}
      />
    );
    expect(screen.getByText('person is on Choner right now')).toBeTruthy();
  });

  it('shows a tile per activity with people, and opens the directory from one', async () => {
    const open = jest.fn();
    await render(<PulseCard pulse={pulse()} onOpenDirectory={open} />);
    for (const t of ['Running', 'Jogging', 'Walking', 'Cycling', 'Yoga', 'Workouts']) {
      expect(screen.getByText(t)).toBeTruthy();
    }
    await fireEvent.press(screen.getByLabelText('Yoga, 83 people. See who is on the move.'));
    expect(open).toHaveBeenCalled();
  });

  it('is not drawn with nobody on it', async () => {
    await render(<PulseCard pulse={pulse({ people: 0 })} onOpenDirectory={jest.fn()} />);
    expect(screen.queryByText('The Pulse')).toBeNull();
  });
});

describe('activity icons', () => {
  it('gives every activity its own icon (Running and Jogging used to share one)', () => {
    const icons = Object.values(ACTIVITY_ICONS);
    expect(new Set(icons).size).toBe(icons.length);
    expect(ACTIVITY_ICONS.yoga).toBe('yoga');
  });
});
