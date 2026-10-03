import { heartCopy, heartStage, homeHero, pulseChips, pulseHeadline, pulseMomentItems, pulseMoments } from './hero';
import type { PairPlan, PlanMember } from '@/features/plans/types';

const member = (o: Partial<PlanMember> = {}): PlanMember => ({
  distance_answer: null, mode_answer: null, confirmed_at: null, on_my_way_at: null,
  here_at: null, finished_at: null, checkin: null, checkin_at: null, miss_reason: null, ...o
});
const plan = (o: Partial<PairPlan> = {}): PairPlan => ({
  id: 'p', kind: 'meetup', status: 'planning', activity_key: 'running', mode: null,
  distance: null, place_name: null, place_text: null, meeting_location_status: 'not_set',
  founder_help_required: false, starts_at: null, i_open: true, me: member(),
  them: { ...member(), first_name: 'Gayan', avatar_url: null }, messages: [], ...o
});
const base = {
  activity: 'Running', activityKey: 'running', partnerState: 'solo', partnerName: null as string | null,
  plan: null as PairPlan | null, agreedBefore: false, repairOwed: false
};

describe('homeHero: one state, one next action', () => {
  it('with nothing picked, only changes tab to Challenges', () => {
    const h = homeHero({ ...base, activity: null, activityKey: null });
    expect(h.title).toBe('Start something together');
    expect(h.action).toEqual({ label: "Let's do this", to: 'challenges' });
  });

  it('with no challenge but a kept partner, still names the partner', () => {
    const h = homeHero({ ...base, activity: null, activityKey: null, partnerName: 'Gayan' });
    expect(h.line).toBe('Pick what you and Gayan will do next.');
    expect(h.action?.to).toBe('challenges');
  });

  it('hands every partner path to Find, with a button that says what you get', () => {
    expect(homeHero(base).action).toEqual({ label: 'Find a partner', to: 'find' });
    expect(homeHero({ ...base, partnerState: 'invited' }).action).toEqual({ label: 'See your invite', to: 'find' });
    expect(homeHero({ ...base, partnerState: 'matched' }).action).toEqual({ label: 'See your match', to: 'find' });
    expect(homeHero({ ...base, partnerState: 'matched' }).eyebrow).toBe('A match is waiting');
  });

  it('shows no button at all while searching, just the Searching row', () => {
    const h = homeHero({ ...base, partnerState: 'finding' });
    expect(h.action).toBeNull();
    expect(h.searching).toBe(true);
  });

  it('never says "Go to" anything', () => {
    const states = [
      homeHero({ ...base, activity: null, activityKey: null }),
      homeHero(base),
      homeHero({ ...base, partnerState: 'invited' }),
      homeHero({ ...base, partnerState: 'matched' }),
      homeHero({ ...base, partnerName: 'Gayan' }),
      homeHero({ ...base, partnerName: 'Gayan', repairOwed: true })
    ];
    for (const s of states) expect(s.action?.label ?? '').not.toMatch(/^go to/i);
  });

  it('does not say "commitment" before a plan has been agreed', () => {
    const before = [
      homeHero({ ...base, activity: null, activityKey: null }),
      homeHero(base),
      homeHero({ ...base, partnerState: 'finding' }),
      homeHero({ ...base, partnerState: 'matched' }),
      homeHero({ ...base, partnerName: 'Gayan' }),
      homeHero({ ...base, partnerName: 'Gayan', plan: plan() })
    ];
    for (const s of before) {
      expect(`${s.eyebrow ?? ''} ${s.title} ${s.line ?? ''}`).not.toMatch(/commitment/i);
    }
    expect(homeHero({ ...base, partnerName: 'Gayan', agreedBefore: true }).eyebrow).toBe('Your commitment');
  });

  it('offers the first plan to a new pair, in the activity\'s own words', () => {
    const run = homeHero({ ...base, partnerName: 'Gayan' });
    expect(run.eyebrow).toBe('You found your match');
    expect(run.action).toEqual({ label: 'Plan your first run', to: 'start_session' });
    const yoga = homeHero({ ...base, activity: 'Yoga', activityKey: 'yoga', partnerName: 'Gayan' });
    expect(yoga.action?.label).toBe('Plan your first yoga session');
    // A plan already open is continued, not started again.
    expect(homeHero({ ...base, partnerName: 'Gayan', plan: plan() }).action?.to).toBe('plan');
  });

  it('shows the agreed session and opens it', () => {
    const h = homeHero({
      ...base, partnerName: 'Gayan', agreedBefore: true, locale: 'en-GB',
      plan: plan({ status: 'confirmed', starts_at: '2026-10-05T01:30:00Z', mode: 'together', place_name: 'Viharamahadevi Park' })
    });
    expect(h.eyebrow).toBe('Your next commitment');
    expect(h.line).toBe('Viharamahadevi Park · with Gayan');
    expect(h.action).toEqual({ label: 'View session', to: 'plan' });
  });

  it('plans the next one straight after both showed up', () => {
    const h = homeHero({ ...base, partnerName: 'Gayan', agreedBefore: true, plan: plan({ status: 'completed' }) });
    expect(h.action).toEqual({ label: 'Plan your next run', to: 'start_session' });
  });

  it('puts a session owed ahead of everything else, and hands it to Challenges', () => {
    const h = homeHero({ ...base, partnerName: 'Gayan', agreedBefore: true, repairOwed: true, plan: plan({ status: 'confirmed', starts_at: '2026-10-05T01:30:00Z' }) });
    expect(h.eyebrow).toBe('One session owed');
    expect(h.line).toMatch(/Nothing resets/);
    expect(h.action).toEqual({ label: 'Make it up', to: 'challenges' });
  });
});

describe('the heart', () => {
  it('grows at 1, 5, 10, 25 and 50 sessions together', () => {
    expect([0, 1, 4, 5, 9, 10, 24, 25, 49, 50, 200].map(heartStage)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });

  it('is "You + ?" until there is a partner', () => {
    expect(heartCopy({ partnerName: null, partnerState: 'solo', sessionsTogether: 0 })).toEqual({ title: 'You + ?', count: null, line: null });
    expect(heartCopy({ partnerName: null, partnerState: 'finding', sessionsTogether: 0 }).line).toBe('Searching for your partner.');
  });

  it('counts sessions with this partner, never days', () => {
    expect(heartCopy({ partnerName: 'Gayan', partnerState: 'partnered', sessionsTogether: 0 }).line).toBe('Your first one together is next.');
    const c = heartCopy({ partnerName: 'Gayan', partnerState: 'partnered', sessionsTogether: 7 });
    expect(c.count).toBe('7 sessions together');
    expect(`${c.count} ${c.line}`).not.toMatch(/day|in a row/i);
  });
});

describe('Choner Pulse says only what is true', () => {
  const zero = { people: 0, by_activity: [], pairs: 0, new_pairs_today: 0, sessions_today: 0, sessions_planned: 0 };

  it('says nothing when nothing has happened', () => {
    expect(pulseMoments(zero)).toEqual([]);
    expect(pulseMoments(null)).toEqual([]);
    expect(pulseHeadline(zero)).toBeNull();
  });

  it('turns real counts into lines, singular and plural', () => {
    expect(pulseMoments({ ...zero, sessions_today: 1, new_pairs_today: 2, pairs: 1, sessions_planned: 3 })).toEqual([
      '1 session was completed today.',
      '2 new pairs today.',
      '1 pair is showing up together.',
      '3 sessions are planned.'
    ]);
    expect(pulseHeadline({ ...zero, people: 879 })).toBe('879 people are on Choner right now');
  });
});

describe('pulse chips and moment kinds', () => {
  const zero = { people: 0, by_activity: [], pairs: 0, new_pairs_today: 0, sessions_today: 0, sessions_planned: 0 };

  it('shows only the counts above zero', () => {
    expect(pulseChips(zero)).toEqual([]);
    expect(pulseChips(null)).toEqual([]);
    expect(pulseChips({ ...zero, new_pairs_today: 1, sessions_planned: 4 })).toEqual(['+1 new pair', '4 planned']);
    expect(pulseChips({ ...zero, new_pairs_today: 2, sessions_today: 5 })).toEqual(['+2 new pairs', '+5 completed']);
  });

  it('gives each moment the picture it draws, and the same text as pulseMoments', () => {
    const p = { ...zero, sessions_today: 1, new_pairs_today: 2, pairs: 1, sessions_planned: 3 };
    expect(pulseMomentItems(p).map((m) => m.kind)).toEqual(['done', 'pair', 'pairs', 'count']);
    expect(pulseMomentItems(p).map((m) => m.text)).toEqual(pulseMoments(p));
  });
});

describe('Just Happened always has the busiest activity', () => {
  const zero = { people: 0, by_activity: [], pairs: 0, new_pairs_today: 0, sessions_today: 0, sessions_planned: 0 };

  it('adds the top activity as the last moment', () => {
    const p = {
      ...zero,
      people: 300,
      by_activity: [
        { activity_key: 'running', title: 'Running', people: 123 },
        { activity_key: 'walking', title: 'Walking', people: 175 }
      ]
    };
    expect(pulseMoments(p)).toEqual(['175 people chose Walking.']);
    expect(pulseMomentItems(p)[0]).toMatchObject({ kind: 'count', n: 175 });
  });

  it('skips activities with nobody on them', () => {
    expect(pulseMoments({ ...zero, by_activity: [{ activity_key: 'yoga', title: 'Yoga', people: 0 }] })).toEqual([]);
  });
});

